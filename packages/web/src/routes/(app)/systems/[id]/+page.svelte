<script lang="ts">
    import { saveAsTemplate } from '$lib/api/templates';
    import { exportSystem } from '$lib/api/export';
    import { addToast } from '$lib/stores/toast.svelte';
    import Modal from '$lib/components/Modal.svelte';

    let { data } = $props();
    let system = $derived(data.system);

    let showTemplateModal = $state(false);
    let templateName = $state('');
    let exporting = $state(false);

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
    <h2 class="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-5">Blueprint</h2>
    <dl class="flex flex-col gap-5">
      {#each fields as field}
        <div>
          <dt class="font-body text-xs font-medium text-muted-foreground mb-1">{field.label}</dt>
          <dd class="font-body text-sm text-on-surface leading-relaxed">{field.value}</dd>
        </div>
      {/each}
    </dl>
  </section>

  {#if system.barrier_list.length > 0}
    <section class="bg-surface-container-low rounded-xl p-6">
      <h2 class="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Known Barriers</h2>
      <div class="flex flex-wrap gap-2">
        {#each system.barrier_list as barrier}
          <span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-body font-medium text-primary">{barrier}</span>
        {/each}
      </div>
    </section>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm">
      <h3 class="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</h3>
      <p class="font-body text-sm text-on-surface capitalize">{system.status}</p>
    </div>
    <div class="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm">
      <h3 class="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Created</h3>
      <p class="font-body text-sm text-on-surface">{new Date(system.created_at).toLocaleDateString()}</p>
    </div>
  </div>

  <div class="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
    <div>
      <h3 class="font-body text-sm font-semibold text-on-surface">Save as template</h3>
      <p class="font-body text-xs text-muted-foreground mt-0.5">Reuse this system's structure for a new one</p>
    </div>
    <button onclick={() => { templateName = system.name; showTemplateModal = true; }}
            class="rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary
                   px-5 py-2.5 text-sm font-body font-semibold
                   transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                   cursor-pointer">
      Save
    </button>
  </div>

  <div class="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
    <div>
      <h3 class="font-body text-sm font-semibold text-on-surface">Export system</h3>
      <p class="font-body text-xs text-muted-foreground mt-0.5">Download this system's data as a JSON file</p>
    </div>
    <button onclick={handleExport} disabled={exporting}
            class="rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary
                   px-5 py-2.5 text-sm font-body font-semibold
                   transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
      {exporting ? 'Exporting...' : 'Export'}
    </button>
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
                class="rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary
                       px-4 py-2 text-sm font-body font-semibold cursor-pointer">Save</button>
    </div>
</Modal>
