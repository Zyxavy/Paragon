<script lang="ts">
    import { goto } from '$app/navigation';
    import { saveAsTemplate } from '$lib/api/templates';
    import { exportSystem } from '$lib/api/export';
    import { pauseSystem, unarchiveSystem, deleteSystem } from '$lib/api/systems';
    import { clearCache } from '$lib/api/cache';
    import { addToast } from '$lib/stores/toast.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import MarkdownText from '$lib/components/MarkdownText.svelte';
    import ScheduleBlock from '$lib/components/ScheduleBlock.svelte';
    import { visualAidSrc } from '$lib/api/visual-aid';

    let { data } = $props();
    // Shallow copy so reassignment of data.system by the layout doesn't alias
    // the local copy, while local mutations (pause/resume) keep working.
    let system = $state({ ...data.system });

    // Re-sync from the server snapshot only when it is actually newer than the
    // local copy, so in-page edits are never clobbered by a stale layout reload.
    $effect(() => {
        if (data.system && data.system.updated_at > system.updated_at) {
            system = data.system;
        }
    });

    let showTemplateModal = $state(false);
    let templateName = $state('');
    let exporting = $state(false);

    let showDeleteModal = $state(false);
    let deleteConfirmName = $state('');
    let pausing = $state(false);
    let deleting = $state(false);

    async function handleSaveAsTemplate() {
        await saveAsTemplate(system.id, templateName.trim() || undefined);
        addToast('success', 'Template saved');
        showTemplateModal = false;
        templateName = '';
    }

    function sanitizeFilename(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'system';
    }

    async function handleExport() {
        exporting = true;
        try {
            const data = await exportSystem(system.id);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sanitizeFilename(system.name)}-export.json`;
            a.click();
            URL.revokeObjectURL(url);
            addToast('success', 'System exported');
        } catch {
            addToast('error', 'Export failed');
        } finally {
            exporting = false;
        }
    }

    async function handlePause() {
        if (pausing) return;
        pausing = true;
        try {
            const updated = await pauseSystem(system.id);
            system = updated;
            clearCache();
            addToast('success', 'System paused');
        } catch {
            addToast('error', 'Failed to pause system');
        } finally {
            pausing = false;
        }
    }

    async function handleUnarchive() {
        if (pausing) return;
        pausing = true;
        try {
            const updated = await unarchiveSystem(system.id);
            system = updated;
            clearCache();
            addToast('success', 'System resumed');
        } catch {
            addToast('error', 'Failed to resume system');
        } finally {
            pausing = false;
        }
    }

    async function handleDelete() {
        if (deleteConfirmName.trim() !== system.name) return;
        if (deleting) return;
        deleting = true;
        try {
            await deleteSystem(system.id);
            clearCache();
            addToast('success', 'System deleted');
            goto('/systems');
        } catch {
            addToast('error', 'Failed to delete system');
            showDeleteModal = false;
            deleteConfirmName = '';
        } finally {
            deleting = false;
        }
    }

    const fields = $derived([
        { label: 'Purpose', value: system.purpose },
        { label: 'Philosophy', value: system.philosophy },
        { label: 'Protocol', value: system.protocol },
        { label: 'Floor Action', value: system.floor_action },
        { label: 'Trigger', value: system.trigger },
        { label: 'Environment Cue', value: system.environment_cue },
    ].filter(f => f.value));
</script>

<div class="flex flex-col gap-6">
  <section class="bg-surface-container-low rounded-xl p-6">
    <h2 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-5">Blueprint</h2>
    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
      {#each fields as field}
        <div>
          <dt class="font-body text-xs font-medium text-on-container/70 mb-1">{field.label}</dt>
          <dd class="font-body text-sm text-on-container leading-relaxed">
            <MarkdownText content={field.value} />
          </dd>
        </div>
      {/each}
    </dl>
  </section>

  {#if system.success_metric}
    <section class="bg-primary/10 rounded-xl p-5">
      <h2 class="font-body text-xs font-semibold text-primary uppercase tracking-wide mb-2">Success Metric</h2>
      <p class="font-body text-sm text-on-surface font-medium">{system.success_metric}</p>
    </section>
  {/if}

  {#if system.reference_table}
    <section class="bg-surface-container-low rounded-xl p-6">
      <h2 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-4">Reference</h2>
      <MarkdownText content={system.reference_table} />
    </section>
  {/if}

  {#if system.visual_aid}
    <section class="bg-surface-container-low rounded-xl p-6">
      <h2 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-4">Visual Aid</h2>
      <img src={visualAidSrc(system.id, system.visual_aid)} crossorigin="use-credentials" alt="Visual aid"
           class="max-h-96 w-auto rounded-xl object-contain" />
    </section>
  {/if}

  {#if system.barrier_list.length > 0}
    <section class="bg-surface-container-low rounded-xl p-6">
      <h2 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-4">Known Barriers</h2>
      <div class="flex flex-wrap gap-2">
        {#each system.barrier_list as barrier}
          <span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-body font-medium text-primary">{barrier}</span>
        {/each}
      </div>
    </section>
  {/if}

  <section class="bg-surface-container-low rounded-xl p-6">
    <h2 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-4">Schedule</h2>
    {#key system.id}
      <ScheduleBlock systemId={system.id} />
    {/key}
  </section>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm">
      <h3 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-2">Status</h3>
      <p class="font-body text-sm text-on-container capitalize">{system.status}</p>
    </div>
    <div class="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm">
      <h3 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-2">Created</h3>
      <p class="font-body text-sm text-on-container">{new Date(system.created_at).toLocaleDateString()}</p>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div class="bg-surface-container-low rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 class="font-body text-sm font-semibold text-on-container">System actions</h3>
      <p class="font-body text-xs text-on-container/70 mt-0.5">
        {system.status === 'active' ? 'Pause to temporarily hide from dashboard' :
         system.status === 'paused' ? 'Paused, not currently active' :
         'Archived'}
      </p>
    </div>
    <div class="flex items-center gap-2">
      {#if system.status === 'active'}
        <button onclick={handlePause} disabled={pausing}
                class="rounded-2xl bg-secondary/10 text-on-surface px-4 py-2 text-sm font-body font-medium
                       transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          {pausing ? 'Pausing...' : 'Pause'}
        </button>
        <button onclick={() => { showDeleteModal = true; deleteConfirmName = ''; }}
                class="rounded-2xl bg-destructive/10 text-destructive px-4 py-2 text-sm font-body font-medium
                       transition-all duration-200 hover:bg-destructive/20 cursor-pointer">
          Delete
        </button>
      {:else}
        <button onclick={handleUnarchive} disabled={pausing}
                class="rounded-xl bg-primary text-on-primary
                       px-5 py-2.5 text-sm font-body font-semibold
                       transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          {pausing ? 'Resuming...' : (system.status === 'paused' ? 'Resume' : 'Unarchive')}
        </button>
        {#if system.status === 'paused'}
          <button onclick={() => { showDeleteModal = true; deleteConfirmName = ''; }}
                  class="rounded-2xl bg-destructive/10 text-destructive px-4 py-2 text-sm font-body font-medium
                         transition-all duration-200 hover:bg-destructive/20 cursor-pointer">
            Delete
          </button>
        {/if}
      {/if}
    </div>
  </div>

  <div class="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
    <div>
      <h3 class="font-body text-sm font-semibold text-on-container">Save as template</h3>
      <p class="font-body text-xs text-on-container/70 mt-0.5">Reuse this system's structure for a new one</p>
    </div>
    <button onclick={() => { templateName = system.name; showTemplateModal = true; }}
            class="rounded-2xl bg-primary text-on-primary
                   px-5 py-2.5 text-sm font-body font-semibold
                   transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                   cursor-pointer">
      Save
    </button>
  </div>

  <div class="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
    <div>
      <h3 class="font-body text-sm font-semibold text-on-container">Export system</h3>
      <p class="font-body text-xs text-on-container/70 mt-0.5">Download this system's data as a JSON file</p>
    </div>
    <button onclick={handleExport} disabled={exporting}
            class="rounded-2xl bg-primary text-on-primary
                   px-5 py-2.5 text-sm font-body font-semibold
                   transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
      {exporting ? 'Exporting...' : 'Export'}
    </button>
  </div>
  </div>
</div>

<Modal open={showTemplateModal} title="Save as Template" onclose={() => showTemplateModal = false}>
    <p class="font-body text-sm text-muted-foreground mb-4">Name for this template:</p>
    <input type="text" bind:value={templateName}
           class="w-full rounded-md border-border bg-surface text-on-surface px-3 py-2 text-sm font-body
                  focus:outline-none focus:ring-2 focus:ring-primary mb-4 placeholder:text-muted-foreground" />
    <div class="flex justify-end gap-2">
        <button onclick={() => showTemplateModal = false}
                class="rounded-xl border border-border text-on-surface px-4 py-2 text-sm font-body font-medium
                       transition-colors duration-150 hover:bg-surface/50 cursor-pointer">Cancel</button>
        <button onclick={handleSaveAsTemplate}
                class="rounded-2xl bg-primary text-on-primary
                       px-4 py-2 text-sm font-body font-semibold cursor-pointer">Save</button>
    </div>
</Modal>

<Modal open={showDeleteModal} title={`Delete ${system.name}?`} onclose={() => { showDeleteModal = false; deleteConfirmName = ''; }}>
    <p class="font-body text-sm text-muted-foreground mb-4">
        This action is permanent. All instances, reviews, schedules, workspace data, and attachments will be permanently deleted.
    </p>
    <p class="font-body text-sm font-medium text-on-surface mb-2">Type the system name to confirm:</p>
    <input type="text" bind:value={deleteConfirmName}
           class="w-full rounded-md border-border bg-surface text-on-surface px-3 py-2 text-sm font-body
                  focus:outline-none focus:ring-2 focus:ring-primary mb-4 placeholder:text-muted-foreground"
           placeholder={system.name} />
    <div class="flex justify-end gap-2">
        <button onclick={() => { showDeleteModal = false; deleteConfirmName = ''; }}
                class="rounded-xl border border-border text-on-surface px-4 py-2 text-sm font-body font-medium
                       transition-colors duration-150 hover:bg-surface/50 cursor-pointer">Cancel</button>
        <button onclick={handleDelete} disabled={deleteConfirmName.trim() !== system.name || deleting}
                class="rounded-2xl px-4 py-2 text-sm font-body font-semibold cursor-pointer
                       disabled:opacity-50 disabled:cursor-not-allowed
                       {deleteConfirmName.trim() === system.name ? 'bg-destructive text-white hover:bg-destructive/90' : 'bg-destructive/10 text-destructive'}">
            {deleting ? 'Deleting...' : 'Delete permanently'}
        </button>
    </div>
</Modal>
