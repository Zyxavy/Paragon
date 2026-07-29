<script lang="ts">
    import { Grid3x3 } from '@lucide/svelte';
    import WidgetCard from './WidgetCard.svelte';
    import type { Widget } from '$lib/api/workspaces';

    let {
        widgets, instanceId, workspaceId, systemId, onMove, onResize, onRemove,
    }: {
        widgets: Widget[];
        instanceId: string | null;
        workspaceId: string | null;
        systemId: string | null;
        onMove: (id: string, x: number, y: number) => void;
        onResize: (id: string, w: number, h: number) => void;
        onRemove: (id: string) => void;
    } = $props();

    let snapToGrid = $state(false);
    let isMobile = $state(false);
    let canvasEl = $state<HTMLElement | null>(null);

    let dragging: { id: string; startX: number; startY: number; origX: number; origY: number } | null = null;
    let resizing: { id: string; startX: number; startY: number; origW: number; origH: number } | null = null;

    $effect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        isMobile = mq.matches;
        const handler = (e: MediaQueryListEvent) => isMobile = e.matches;
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    });

    function snap(v: number): number {
        return Math.round(v / 20) * 20;
    }

    function handlePointerDown(e: PointerEvent) {
        const target = e.target as Element;
        const dragEl = target.closest('[data-drag-handle]');
        const resizeEl = target.closest('[data-resize-handle]');

        if (dragEl) {
            const id = dragEl.getAttribute('data-drag-handle')!;
            const widget = widgets.find(w => w.id === id);
            if (!widget) return;
            dragging = { id, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y };
            canvasEl?.setPointerCapture(e.pointerId);
        } else if (resizeEl) {
            const id = resizeEl.getAttribute('data-resize-handle')!;
            const widget = widgets.find(w => w.id === id);
            if (!widget) return;
            resizing = { id, startX: e.clientX, startY: e.clientY, origW: widget.w, origH: widget.h };
            canvasEl?.setPointerCapture(e.pointerId);
        }
    }

    function handlePointerMove(e: PointerEvent) {
        if (dragging) {
            let x = dragging.origX + (e.clientX - dragging.startX);
            let y = dragging.origY + (e.clientY - dragging.startY);
            if (x < 0) x = 0;
            if (y < 0) y = 0;
            if (snapToGrid) { x = snap(x); y = snap(y); }
            onMove(dragging.id, x, y);
        }
        if (resizing) {
            let w = resizing.origW + (e.clientX - resizing.startX);
            let h = resizing.origH + (e.clientY - resizing.startY);
            if (w < 160) w = 160;
            if (h < 120) h = 120;
            onResize(resizing.id, w, h);
        }
    }

    function handlePointerUp() {
        dragging = null;
        resizing = null;
    }
</script>

{#if isMobile}
    <div class="flex flex-col gap-4 w-full min-h-[60vh] bg-surface rounded-xl p-6">
        {#each widgets as widget (widget.id)}
            <div class="bg-surface-container-lowest rounded-xl p-4 shadow-ambient-sm" style="min-height: {widget.h}px">
                <WidgetCard {widget} {instanceId} {workspaceId} {systemId} {onRemove} />
            </div>
        {/each}
    </div>
{:else}
    <div class="flex flex-col gap-3 w-full">
        <div class="flex items-center justify-between bg-surface rounded-xl px-4 py-2">
            <span class="text-xs text-muted-foreground">{widgets.length} widget{widgets.length === 1 ? '' : 's'}</span>
            <button
                onclick={() => snapToGrid = !snapToGrid}
                class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                class:bg-primary-container={snapToGrid}
                class:text-on-primary-container={snapToGrid}
                class:text-muted-foreground={!snapToGrid}
                class:hover:bg-surface-container-low={!snapToGrid}
                aria-label="Toggle snap to grid"
            >
                <Grid3x3 class="w-3.5 h-3.5" />
                {snapToGrid ? 'Snap: On' : 'Snap: Off'}
            </button>
        </div>

        <div
            bind:this={canvasEl}
            onpointerdown={handlePointerDown}
            onpointermove={handlePointerMove}
            onpointerup={handlePointerUp}
            class="relative w-full min-h-[80vh] bg-surface rounded-xl p-6 overflow-auto"
            style={snapToGrid ? 'background-image: radial-gradient(circle, var(--color-outline) 0.5px, transparent 0.5px); background-size: 20px 20px;' : ''}
        >
            {#each widgets as widget (widget.id)}
                <div
                    class="absolute"
                    style="left: {widget.x}px; top: {widget.y}px; width: {widget.w}px;"
                >
                    <WidgetCard {widget} {instanceId} {workspaceId} {systemId} {onRemove} />
                </div>
            {/each}
        </div>
    </div>
{/if}
