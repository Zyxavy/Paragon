<script lang="ts">
    let { open, title, onclose, children }: {
        open: boolean;
        title: string;
        onclose: () => void;
        children?: import('svelte').Snippet;
    } = $props();
</script>

{#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
         onclick={onclose} onkeydown={(e) => { if (e.key === 'Escape') onclose(); }} role="presentation">
        <div class="bg-surface rounded-2xl shadow-ambient-lg p-6 max-w-sm w-full mx-4"
             onclick={(e) => e.stopPropagation()} role="document">
            <h2 class="font-display text-lg font-semibold text-on-surface mb-4">{title}</h2>
            {@render children?.()}
        </div>
    </div>
{/if}