<script lang="ts">
  import { getSchedules } from '$lib/api/schedules';
  import type { Schedule } from '$lib/api/schedules';

  let { systemId }: { systemId: string } = $props();

  let schedules = $state<Schedule[]>([]);
  let loaded = $state(false);
  let caught = $state(false);

  const DAY_LABELS = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

  $effect(() => {
    if (loaded) return;
    getSchedules(systemId)
      .then((res) => {
        schedules = res.schedules;
        loaded = true;
      })
      .catch(() => {
        loaded = true;
        caught = true;
      });
  });
</script>

{#if schedules.length > 0}
  <div class="flex flex-col gap-2">
    {#each schedules as schedule (schedule.id)}
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-surface/50 px-3 py-2">
        <div class="flex gap-1">
          {#each DAY_LABELS as label, i}
            <span
              class="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-body
                     {schedule.days_of_week & (1 << i) ? 'bg-primary/15 text-primary font-semibold' : 'bg-surface text-on-surface-muted'}"
            >
              {label}
            </span>
          {/each}
        </div>
        <span class="text-sm font-body text-on-container tabular-nums">
          {schedule.time_window_start} – {schedule.time_window_end}
        </span>
      </div>
    {/each}
  </div>
{:else if loaded && !caught}
  <p class="font-body text-sm text-on-container/70">No schedule configured.</p>
{/if}
