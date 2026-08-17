<script lang="ts">
    import RingChart from '$lib/components/RingChart.svelte';
    import type { SystemMetrics } from '$lib/api/systems';

    let { data } = $props();
    let metrics = $derived(data.metrics as SystemMetrics | null);
</script>

<div class="flex flex-col gap-6">
    {#if !metrics}
        <div class="bg-surface-container-low rounded-xl p-10 text-center">
            <p class="font-body text-sm text-on-container/70">Could not load metrics.</p>
        </div>
    {:else if metrics.total_instances === 0}
        <div class="bg-surface-container-low rounded-xl p-10 text-center">
            <p class="font-body text-sm text-on-container font-medium mb-1">No data yet</p>
            <p class="font-body text-xs text-on-container/70">Mark your first instance to see metrics.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm text-center">
                <h3 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-4">Floor Hold Rate</h3>
                <RingChart value={metrics.floor_hold_rate.percentage} size={80} />
                <p class="font-body text-xs text-on-container/70 mt-3">
                    {metrics.floor_hold_rate.full} full, {metrics.floor_hold_rate.floor} floor, {metrics.floor_hold_rate.missed} missed
                </p>
            </div>

            <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm text-center">
                <h3 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-4">Review Completion</h3>
                <p class="font-display text-3xl font-bold text-on-container mb-2">
                    {metrics.review_completion.completed}/{metrics.review_completion.total_due}
                </p>
                <div class="w-full bg-surface-container-low rounded-full h-2 mb-2">
                    <div class="bg-primary rounded-full h-2"
                         style="width: {metrics.review_completion.total_due > 0 ? (metrics.review_completion.completed / metrics.review_completion.total_due) * 100 : 0}%">
                    </div>
                </div>
                <p class="font-body text-xs text-on-container/70">
                    {metrics.review_completion.with_changes} with changes
                </p>
            </div>

            <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm text-center">
                <h3 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-4">Current Streak</h3>
                <RingChart value={metrics.current_streak.longest > 0 ? (metrics.current_streak.current / metrics.current_streak.longest) * 100 : 0} size={80} />
                <p class="font-display text-xl font-semibold text-on-container mt-2">{metrics.current_streak.current} days</p>
                <p class="font-body text-xs text-on-container/70">Best: {metrics.current_streak.longest} days</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm">
                <h3 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-1">Total instances</h3>
                <p class="font-display text-2xl font-semibold text-on-container">{metrics.total_instances}</p>
            </div>
            <div class="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm">
                <h3 class="font-body text-xs font-semibold text-on-container/70 uppercase tracking-wide mb-1">Survival (weeks)</h3>
                <p class="font-display text-2xl font-semibold text-on-container">{metrics.survival_weeks}</p>
            </div>
        </div>
    {/if}
</div>