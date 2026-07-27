<script lang="ts">
    import { putNotes, getNotes } from '$lib/api/notes';
    import type { Widget } from '$lib/api/workspaces';
    import { AUTOSAVE_DEBOUNCE_MS } from '$lib/components/system-form.config';

    let { widget, workspaceId }: { widget: Widget; workspaceId: string | null } = $props();

    let text = $state('');
    let loaded = $state(false);
    let saving = $state(false);
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    $effect(() => {
        if (workspaceId) loadNotes();
    });

    $effect(() => {
        return () => {
            if (saveTimeout) clearTimeout(saveTimeout);
        };
    });

    async function loadNotes() {
        try {
            const res = await getNotes(workspaceId!, widget.id);
            text = res.text;
        } catch {
            // 404 or network error, show empty state
        } finally {
            loaded = true;
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
            await putNotes(workspaceId!, widget.id, text);
        } catch {
            // silent failure
        } finally {
            saving = false;
            saveTimeout = null;
        }
    }
</script>

{#if !workspaceId}
    <p class="text-sm text-muted-foreground text-center py-4">Save workspace to add notes</p>
{:else if !loaded}
    <p class="text-sm text-muted-foreground text-center py-4">Loading...</p>
{:else}
    <div class="flex flex-col gap-1 flex-1">
        <textarea
            value={text}
            oninput={handleInput}
            placeholder="Write your notes here..."
            class="flex-1 min-h-[100px] text-sm px-3 py-2 rounded-lg border border-outline bg-surface-container-low text-on-surface placeholder:text-muted-foreground resize-none"
        ></textarea>
        {#if saving}
            <p class="text-xs text-muted-foreground text-right">Saving...</p>
        {/if}
    </div>
{/if}