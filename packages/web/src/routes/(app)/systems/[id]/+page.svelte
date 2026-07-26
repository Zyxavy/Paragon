<script lang="ts">
    import { saveAsTemplate } from '$lib/api/templates';
    import { addToast } from '$lib/stores/toast.svelte';
    import Modal from '$lib/components/Modal.svelte';

    let { data } = $props();
    let system = $derived(data.system);

    let showTemplateModal = $state(false);
    let templateName = $state('');

    async function handleSaveAsTemplate() {
        await saveAsTemplate(system.id, templateName.trim() || undefined);
        addToast('success', 'Template saved');
        showTemplateModal = false;
        templateName = '';
    }
</script>

<div class="flex flex-col gap-4 max-w-2xl">
    {#if system.purpose}
        <div>
            <h3 class="font-body text-sm font-medium text-on-surface-muted">Purpose</h3>
            <p class="font-body text-on-surface">{system.purpose}</p>
        </div>
    {/if}
    {#if system.philosophy}
        <div>
            <h3 class="font-body text-sm font-medium text-on-surface-muted">Philosophy</h3>
            <p class="font-body text-on-surface">{system.philosophy}</p>
        </div>
    {/if}
    {#if system.protocol}
        <div>
            <h3 class="font-body text-sm font-medium text-on-surface-muted">Protocol</h3>
            <p class="font-body text-on-surface">{system.protocol}</p>
        </div>
    {/if}
    {#if system.floor_action}
        <div>
            <h3 class="font-body text-sm font-medium text-on-surface-muted">Floor Action</h3>
            <p class="font-body text-on-surface">{system.floor_action}</p>
        </div>
    {/if}
    {#if system.trigger}
        <div>
            <h3 class="font-body text-sm font-medium text-on-surface-muted">Trigger</h3>
            <p class="font-body text-on-surface">{system.trigger}</p>
        </div>
    {/if}
    {#if system.barrier_list.length > 0}
        <div>
            <h3 class="font-body text-sm font-medium text-on-surface-muted">Barriers</h3>
            <div class="flex flex-wrap gap-2 mt-1">
                {#each system.barrier_list as barrier}
                    <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-body text-primary">{barrier}</span>
                {/each}
            </div>
        </div>
    {/if}
    {#if system.environment_cue}
        <div>
            <h3 class="font-body text-sm font-medium text-on-surface-muted">Environment Cue</h3>
            <p class="font-body text-on-surface">{system.environment_cue}</p>
        </div>
    {/if}
    <div class="mt-4 pt-4 border-t border-border text-xs font-body text-on-surface-muted">
        Status: {system.status} &middot; Created {new Date(system.created_at).toLocaleDateString()}
    </div>
</div>

<div class="mt-6 pt-4 border-t border-border flex flex-wrap gap-2">
    <button type="button" onclick={() => { templateName = system.name; showTemplateModal = true; }}
            class="rounded-2xl bg-surface-container-lowest shadow-ambient-sm px-4 py-2 text-sm font-body
                   text-on-surface transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer">
        Save as Template
    </button>
</div>

<Modal open={showTemplateModal} title="Save as Template" onclose={() => showTemplateModal = false}>
    <p class="text-sm text-on-surface-muted font-body mb-3">Name for this template:</p>
    <input type="text" bind:value={templateName}
           class="w-full rounded-md border-border bg-surface text-on-surface px-3 py-2 text-sm font-body
                  focus:outline-none focus:ring-2 focus:ring-primary mb-4" />
    <div class="flex justify-end gap-2">
        <button type="button" onclick={() => showTemplateModal = false}
                class="rounded-2xl px-4 py-2 text-sm font-body text-on-surface-muted hover:text-on-surface cursor-pointer">Cancel</button>
        <button type="button" onclick={handleSaveAsTemplate}
                class="rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2 text-sm font-body font-semibold cursor-pointer">Save</button>
    </div>
</Modal>