<script lang="ts">
    import { putNotes, getNotes } from '$lib/api/notes';
    import type { Widget } from '$lib/api/workspaces';
    import { AUTOSAVE_DEBOUNCE_MS } from '$lib/components/system-form.config';

    let { widget, workspaceId }: { widget: Widget; workspaceId: string | null } = $props();

    const widgetId = (() => widget.id)();

    let text = $state('');
    let loaded = $state(false);
    let saving = $state(false);
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    let fetchSeq = 0;

    $effect(() => {
        if (workspaceId) loadNotes();
    });

    $effect(() => {
        return () => {
            if (saveTimeout) clearTimeout(saveTimeout);
        };
    });

    async function loadNotes() {
        const seq = ++fetchSeq;
        try {
            const res = await getNotes(workspaceId!, widgetId);
            if (seq !== fetchSeq) return;
            text = res.text;
        } catch {
            // 404 or network error, show empty state
        } finally {
            if (seq === fetchSeq) loaded = true;
        }
    }

    function handleInput(e: Event) {
        text = (e.target as HTMLTextAreaElement).value;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(doSave, AUTOSAVE_DEBOUNCE_MS);
    }

    async function doSave() {
        if (!workspaceId || saving) return;
        saving = true;
        try {
            await putNotes(workspaceId!, widgetId, text);
        } catch {
            // silent failure
        } finally {
            saving = false;
            saveTimeout = null;
        }
    }
</script>

{#if !workspaceId}
    <p class="text-sm text-on-container/70 text-center py-4">Save workspace to add notes</p>
{:else if !loaded}
    <p class="text-sm text-on-container/70 text-center py-4">Loading...</p>
{:else}
    <div class="flex flex-col gap-1 flex-1">
        <textarea
            value={text}
            oninput={handleInput}
            placeholder="Write your notes here..."
            class="flex-1 min-h-[100px] text-sm px-3 py-2 rounded-lg border border-outline bg-surface-container-low text-on-container placeholder:text-on-container/70 resize-none"
        ></textarea>
        {#if saving}
            <p class="text-xs text-on-container/70 text-right">Saving...</p>
        {/if}
    </div>
{/if}