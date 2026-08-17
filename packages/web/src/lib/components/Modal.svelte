<script lang="ts">
    let { open, title, onclose, children }: {
        open: boolean;
        title: string;
        onclose: () => void;
        children?: import('svelte').Snippet;
    } = $props();

    const titleId = `modal-title-${crypto.randomUUID()}`;

    // Moves focus into the dialog on open and restores it to the previously
    // focused element when the dialog unmounts.
    function modalFocus(node: HTMLElement) {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        node.focus();
        return {
            destroy() {
                previouslyFocused?.focus();
            },
        };
    }

    $effect(() => {
        if (!open) return;

        // Window-level Escape fallback — works regardless of where focus is.
        function onWindowKeydown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onclose();
            }
        }

        window.addEventListener('keydown', onWindowKeydown);
        return () => {
            window.removeEventListener('keydown', onWindowKeydown);
        };
    });
</script>

{#if open}
    <div
        use:modalFocus
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabindex="-1"
        class="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/30 backdrop-blur-sm"
        onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
        onkeydown={(e) => {
            // Trap Tab focus within the dialog.
            if (e.key === 'Tab') {
                const el = e.currentTarget as HTMLDivElement;
                const focusables = el.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
                return;
            }
            // Escape inside the dialog: handle here and don't let it bubble to the
            // window fallback (which would call onclose a second time).
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                onclose();
            }
        }}
    >
        <div class="bg-surface rounded-2xl shadow-ambient-lg p-6 max-w-sm w-full mx-4">
            <h2 id={titleId} class="font-display text-lg font-semibold text-on-surface mb-4">{title}</h2>
            {@render children?.()}
        </div>
    </div>
{/if}