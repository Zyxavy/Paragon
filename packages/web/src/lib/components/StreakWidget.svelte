<script lang="ts">
    import RingChart from './RingChart.svelte';
    import { getSystemInstances } from '$lib/api/instances';
    import { calculateStreak } from '$lib/lib/streak';
    import { Flame } from '@lucide/svelte';
    import type { Widget } from '$lib/api/workspaces';

    let { widget, systemId }: { widget: Widget; systemId: string | null } = $props();

    let current = $state(0);
    let longest = $state(0);
    let loaded = $state(false);
    let error = $state(false);

    $effect(() => {
        if (systemId) loadStreak();
    });

    async function loadStreak() {
        try {
            const res = await getSystemInstances(systemId!, { limit: 100 });
            const result = calculateStreak(res.instances);
            current = result.current;
            longest = result.longest;
        } catch {
            error = true;
        } finally {
            loaded = true;
        }
    }
</script>

{#if !systemId}
    <p class="text-sm text-muted-foreground text-center py-4">Save system to track streak</p>
{:else if !loaded}
    <p class="text-sm text-muted-foreground text-center py-4">Loading...</p>
{:else if error}
    <p class="text-sm text-muted-foreground text-center py-4">Could not load streak</p>
{:else}
    <div class="flex flex-col items-center gap-2 py-2">
        <RingChart value={longest > 0 ? (current / longest) * 100 : 0} size={80} />
        <div class="flex items-center gap-1 text-sm text-on-surface">
            <Flame class="w-4 h-4 text-primary" />
            <span class="font-semibold">{current}</span>
            <span class="text-muted-foreground">day{current !== 1 ? 's' : ''}</span>
        </div>
        {#if longest > current}
            <p class="text-xs text-muted-foreground">Best: {longest} day{longest !== 1 ? 's' : ''}</p>
        {/if}
    </div>
{/if}