<script lang="ts">
    import { getCounterLogs } from '$lib/api/counter-logs';
    import type { Widget } from '$lib/api/workspaces';

    let { widget }: { widget: Widget } = $props();

    let bars = $state<{ date: string; total: number }[]>([]);
    let loaded = $state(false);
    let error = $state(false);

    $effect(() => {
        loadChart();
    });

    async function loadChart() {
        const now = new Date();
        const to = now.toISOString().slice(0, 10);
        const from = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);

        try {
            const res = await getCounterLogs(widget.id, { from, to });

            // Group by date and sum values
            const map = new Map<string, number>();
            for (const log of res.counter_logs) {
                const d = log.created_at.slice(0, 10);
                map.set(d, (map.get(d) || 0) + log.value);
            }

            // Fill all 7 days (including zeros)
            const result: { date: string; total: number }[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
                result.push({ date: d, total: map.get(d) || 0 });
            }
            bars = result;
        } catch {
            error = true;
        } finally {
            loaded = true;
        }
    }

    const maxTotal = $derived(Math.max(...bars.map(b => b.total), 1));
    const barHeight = 80;

    function shortDate(iso: string): string {
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString([], { weekday: 'short' });
    }
</script>

{#if !loaded}
    <p class="text-sm text-muted-foreground text-center py-4">Loading...</p>
{:else if error}
    <p class="text-sm text-muted-foreground text-center py-4">Could not load chart data</p>
{:else if bars.every(b => b.total === 0)}
    <p class="text-sm text-muted-foreground text-center py-4">No data yet — start logging</p>
{:else}
    <div class="flex items-end gap-1 justify-center h-[100px]">
        {#each bars as bar}
            <div class="flex flex-col items-center gap-0.5 flex-1">
                <svg width="100%" height={barHeight} class="overflow-visible">
                    <rect
                        x="2" y={barHeight - (bar.total / maxTotal) * barHeight}
                        width="calc(100% - 4)" height={(bar.total / maxTotal) * barHeight}
                        rx="3"
                        fill="var(--color-primary)"
                        class="transition-all duration-300"
                    />
                </svg>
                <span class="text-[10px] text-muted-foreground">{shortDate(bar.date)}</span>
            </div>
        {/each}
    </div>
{/if}