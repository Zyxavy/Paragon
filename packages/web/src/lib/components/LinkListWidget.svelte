<script lang="ts">
    import { Plus, Trash2 } from '@lucide/svelte';
    import { putLinkList, getLinkList } from '$lib/api/link-list';
    import type { Widget } from '$lib/api/workspaces';
    import { AUTOSAVE_DEBOUNCE_MS } from '$lib/components/system-form.config';
    import AttachmentUpload from './AttachmentUpload.svelte';

    let { widget, workspaceId }: { widget: Widget; workspaceId: string | null } = $props();

    const widgetId = (() => widget.id)();

    type LinkRow = { id: number; label: string; url: string };
    let links = $state<LinkRow[]>([]);
    let loaded = $state(false);
    let saving = $state(false);
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    let nextRowId = 0;
    let fetchSeq = 0;

    $effect(() => {
        if (workspaceId) loadLinks();
    });

    $effect(() => {
        return () => {
            if (saveTimeout) clearTimeout(saveTimeout);
        };
    });

    async function loadLinks() {
        const seq = ++fetchSeq;
        try {
            const res = await getLinkList(workspaceId!, widgetId);
            if (seq !== fetchSeq) return;
            links = res.links.map((l) => ({ id: ++nextRowId, label: l.label, url: l.url }));
        } catch {
            // 404 or network error, show empty state
        } finally {
            if (seq === fetchSeq) loaded = true;
        }
    }

    function scheduleSave() {
        if (!workspaceId || saving) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(doSave, AUTOSAVE_DEBOUNCE_MS);
    }

    async function doSave() {
        saving = true;
        try {
            await putLinkList(workspaceId!, widgetId, links.map(({ label, url }) => ({ label, url })));
        } catch {
            // silent failure — user can retry
        } finally {
            saving = false;
            saveTimeout = null;
        }
    }

    function addRow() {
        links = [...links, { id: ++nextRowId, label: '', url: '' }];
    }

    function removeRow(index: number) {
        links = links.filter((_, i) => i !== index);
        scheduleSave();
    }

    function updateLabel(index: number, value: string) {
        links = links.map((l, i) => i === index ? { ...l, label: value } : l);
        scheduleSave();
    }

    function updateUrl(index: number, value: string) {
        links = links.map((l, i) => i === index ? { ...l, url: value } : l);
        scheduleSave();
    }
</script>

{#if !workspaceId}
    <p class="text-sm text-on-container/70 text-center py-4">Save workspace to add links</p>
{:else if !loaded}
    <p class="text-sm text-on-container/70 text-center py-4">Loading...</p>
{:else}
    <div class="flex flex-col gap-2 py-1">
        {#each links as link, i (link.id)}
            <div class="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Label"
                    value={link.label}
                    oninput={(e) => updateLabel(i, e.currentTarget.value)}
                    class="flex-1 text-sm px-2 py-1 rounded-lg border border-outline bg-surface-container-low text-on-container placeholder:text-on-container/70"
                />
                <input
                    type="text"
                    placeholder="URL"
                    value={link.url}
                    oninput={(e) => updateUrl(i, e.currentTarget.value)}
                    class="flex-[2] text-sm px-2 py-1 rounded-lg border border-outline bg-surface-container-low text-on-container placeholder:text-on-container/70"
                />
                <button
                    onclick={() => removeRow(i)}
                    class="text-on-container/70 hover:text-destructive transition-colors p-1 rounded cursor-pointer"
                    aria-label="Remove link"
                >
                    <Trash2 class="w-4 h-4" />
                </button>
            </div>
        {/each}
        <button
            onclick={addRow}
            class="flex items-center gap-1 text-sm text-on-container hover:text-primary/70 transition-colors mt-1 cursor-pointer"
        >
            <Plus class="w-3.5 h-3.5" />
            Add link
        </button>
        {#if saving}
            <p class="text-xs text-on-container/70 text-right">Saving...</p>
        {/if}
    </div>

    <AttachmentUpload {workspaceId} widgetId={widgetId} />
{/if}