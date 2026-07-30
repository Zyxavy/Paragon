<script lang="ts">
  import { createReview } from '$lib/api/reviews';
  import { ApiError } from '$lib/api/client';
  import { toastStore } from '$lib/stores/toast.svelte';
  import InstanceSummary from './InstanceSummary.svelte';
  import { goto } from '$app/navigation';
  import { ArrowLeft } from '@lucide/svelte';

  let {
    systemId,
    system: initial,
    periodStart,
    periodEnd,
    instanceCounts,
  }: {
    systemId: string;
    system: {
      floor_action: string;
      purpose: string;
      philosophy: string;
      protocol: string;
      trigger: string;
      environment_cue: string;
    };
    periodStart: string;
    periodEnd: string;
    instanceCounts: { full: number; floor: number; missed: number };
  } = $props();
  const snap = (() => ({ ...initial }))();

  let whatWorked = $state('');
  let whatBroke = $state('');
  let worstDayCheck = $state(false);
  let saving = $state(false);
  let conflictError = $state<string | null>(null);

  let floorAction = $state(snap.floor_action);
  let purpose = $state(snap.purpose);
  let philosophy = $state(snap.philosophy);
  let protocol = $state(snap.protocol);
  let trigger = $state(snap.trigger);
  let environmentCue = $state(snap.environment_cue);
  let changeNote = $state('');

  function buildChangeApplied(): Record<string, string> | null {
    const changes: Record<string, string> = {};
    if (floorAction !== snap.floor_action) changes.floor_action = floorAction;
    if (purpose !== snap.purpose) changes.purpose = purpose;
    if (philosophy !== snap.philosophy) changes.philosophy = philosophy;
    if (protocol !== snap.protocol) changes.protocol = protocol;
    if (trigger !== snap.trigger) changes.trigger = trigger;
    if (environmentCue !== snap.environment_cue) changes.environment_cue = environmentCue;
    return Object.keys(changes).length > 0 ? changes : null;
  }

  async function handleSubmit() {
    saving = true;
    conflictError = null;

    try {
      await createReview(systemId, {
        period_start: periodStart,
        period_end: periodEnd,
        what_worked: whatWorked,
        what_broke: whatBroke,
        worst_day_check: worstDayCheck,
        change_applied: buildChangeApplied(),
        change_applied_note: changeNote || null,
      });

      toastStore.push({ type: 'info', message: 'Review saved' });
      goto(`/systems/${systemId}/reviews`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'review_already_exists') {
        conflictError = 'A review already exists for this period.';
      } else {
        toastStore.push({ type: 'error', message: 'Could not save review.' });
      }
    } finally {
      saving = false;
    }
  }
</script>

<div class="mb-8">
  <p class="font-body text-sm text-muted-foreground">
    {periodStart} — {periodEnd}
  </p>
</div>

{#if conflictError}
  <div class="rounded-xl bg-destructive/10 border border-destructive/20 px-5 py-4 text-sm font-body text-destructive mb-10">
    {conflictError}
  </div>
{/if}

<!-- Instance summary -->
<div class="bg-surface-container-low rounded-xl px-6 py-5 mb-10">
  <InstanceSummary counts={instanceCounts} variant="sm" />
</div>

<form class="flex flex-col gap-10" onsubmit={async (e) => { e.preventDefault(); await handleSubmit(); }}>
  <!-- Section 1: Reflection -->
  <section>
    <div class="flex items-center gap-3 mb-4">
      <span class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-display text-xs font-semibold">1</span>
      <h2 class="font-body text-base font-semibold text-on-surface">Reflection</h2>
    </div>
    <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm space-y-4">
      <div class="field-group">
        <label for="what_worked" class="font-body text-sm font-medium text-on-surface">What worked?</label>
        <textarea id="what_worked" name="what_worked" bind:value={whatWorked}
                  class="mt-1 w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="3" placeholder="What went well? What felt easy?"></textarea>
      </div>

      <div class="field-group">
        <label for="what_broke" class="font-body text-sm font-medium text-on-surface">What broke?</label>
        <textarea id="what_broke" name="what_broke" bind:value={whatBroke}
                  class="mt-1 w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="3" placeholder="What didn't work? Where did you get stuck?"></textarea>
      </div>

      <label class="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none pt-1">
        <input type="checkbox" bind:checked={worstDayCheck}
               class="rounded border-border text-primary focus:ring-primary" />
        <span class="font-body">This was a worst day</span>
      </label>
    </div>
  </section>

  <!-- Section 2: Adjust the system -->
  <section>
    <div class="flex items-center gap-3 mb-4">
      <span class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-display text-xs font-semibold">2</span>
      <h2 class="font-body text-base font-semibold text-on-surface">Adjust the system</h2>
    </div>
    <p class="font-body text-xs text-muted-foreground ml-10 mb-4">
      Edit the fields below to iterate your system. Changes are captured into this review.
    </p>
    <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm space-y-4">
      <div class="field-group">
        <label for="floor_action" class="font-body text-sm font-medium text-on-surface">Floor action</label>
        <textarea id="floor_action" name="floor_action" bind:value={floorAction}
                  class="mt-1 w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="The smallest version that still counts as a win"></textarea>
      </div>

      <div class="field-group">
        <label for="purpose" class="font-body text-sm font-medium text-on-surface">Purpose</label>
        <textarea id="purpose" bind:value={purpose}
                  class="mt-1 w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="Why does this system exist?"></textarea>
      </div>

      <div class="field-group">
        <label for="philosophy" class="font-body text-sm font-medium text-on-surface">Philosophy</label>
        <textarea id="philosophy" bind:value={philosophy}
                  class="mt-1 w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="What principles guide this system?"></textarea>
      </div>

      <div class="field-group">
        <label for="protocol" class="font-body text-sm font-medium text-on-surface">Protocol</label>
        <textarea id="protocol" bind:value={protocol}
                  class="mt-1 w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="What are the steps or rules?"></textarea>
      </div>

      <div class="field-group">
        <label for="trigger" class="font-body text-sm font-medium text-on-surface">Trigger</label>
        <textarea id="trigger" bind:value={trigger}
                  class="mt-1 w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="What starts this behavior?"></textarea>
      </div>

      <div class="field-group">
        <label for="environment_cue" class="font-body text-sm font-medium text-on-surface">Environment cue</label>
        <textarea id="environment_cue" bind:value={environmentCue}
                  class="mt-1 w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="How does your space remind you?"></textarea>
      </div>
    </div>
  </section>

  <!-- Change note -->
  <section>
    <div class="bg-surface-container-low rounded-xl p-6">
      <label for="change_note" class="font-body text-sm font-medium text-on-surface block mb-2">
        Change description <span class="text-muted-foreground font-normal">(optional)</span>
      </label>
      <textarea id="change_note" bind:value={changeNote}
                placeholder="Briefly describe what changed and why..."
                class="w-full rounded-xl border-border bg-surface-container-lowest text-on-surface px-4 py-3 text-sm font-body
                       focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                       placeholder:text-muted-foreground transition-all duration-200"
                rows="2"></textarea>
      <p class="font-body text-xs text-muted-foreground mt-2">
        If left empty, a description is auto-derived from the differences above.
      </p>
    </div>
  </section>

  <!-- Footer -->
  <div class="flex items-center justify-between pt-4 border-t border-border/50">
    <a href="/systems/{systemId}/reviews"
       class="text-sm text-muted-foreground hover:text-on-surface transition-colors cursor-pointer flex items-center gap-1.5">
      <ArrowLeft class="w-3.5 h-3.5" />
      Cancel
    </a>
    <button type="submit" disabled={saving}
            class="bg-gradient-to-br from-primary to-primary-container text-on-primary
                   px-8 py-3 rounded-2xl font-semibold text-sm
                   disabled:opacity-50 transition-all duration-200
                   hover:opacity-90 active:scale-[0.98] cursor-pointer">
      {saving ? 'Saving...' : 'Submit review'}
    </button>
  </div>
</form>
