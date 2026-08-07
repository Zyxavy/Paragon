<script lang="ts">
  import { createSystem, patchSystem, confirmSystem } from '$lib/api/systems';
  import { ApiError } from '$lib/api/client';
  import type { System } from '$lib/api/systems';
  import { AUTOSAVE_DEBOUNCE_MS } from './system-form.config';
  import SchedulePicker from './SchedulePicker.svelte';
  import { Check } from '@lucide/svelte';

  let { system: initial, defaults: defaultsProp, edit = false }: {
    system?: System | null;
    defaults?: {
      name?: string;
      purpose?: string;
      philosophy?: string;
      protocol?: string;
      floor_action?: string;
      trigger?: string;
      barrier_list?: string[];
      environment_cue?: string;
    };
    edit?: boolean;
  } = $props();
  const snap = (() => ({ ...initial }))();

  let lastDefaultsKey = $state<string | null>(null);
  let systemId = $state<string | null>(snap?.id ?? null);
  let name = $state(snap?.name ?? '');
  let domain = $state(snap?.domain ?? '');
  let purpose = $state(snap?.purpose ?? '');
  let philosophy = $state(snap?.philosophy ?? '');
  let protocol = $state(snap?.protocol ?? '');
  let floor_action = $state(snap?.floor_action ?? '');
  let trigger = $state(snap?.trigger ?? '');
  let barrier_list = $state<string[]>(snap?.barrier_list ?? []);
  let barrierInput = $state('');
  let environment_cue = $state(snap?.environment_cue ?? '');

  $effect(() => {
    if (defaultsProp) {
      const key = JSON.stringify(defaultsProp);
      if (key !== lastDefaultsKey) {
        lastDefaultsKey = key;
        systemId = null;
        name = defaultsProp.name ?? '';
        purpose = defaultsProp.purpose ?? '';
        philosophy = defaultsProp.philosophy ?? '';
        protocol = Array.isArray(defaultsProp.protocol) ? defaultsProp.protocol.join('\n') : (defaultsProp.protocol ?? '');
        floor_action = defaultsProp.floor_action ?? '';
        trigger = defaultsProp.trigger ?? '';
        barrier_list = defaultsProp.barrier_list ?? [];
        environment_cue = defaultsProp.environment_cue ?? '';
      }
    }
  });

  let confirmError = $state<string | null>(null);
  let saving = $state(false);
  let saved = $state(false);
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  let dirty = $derived.by(() => {
    if (systemId) {
      return name !== (snap?.name ?? '')
        || domain !== (snap?.domain ?? '')
        || purpose !== (snap?.purpose ?? '')
        || philosophy !== (snap?.philosophy ?? '')
        || protocol !== (snap?.protocol ?? '')
        || floor_action !== (snap?.floor_action ?? '')
        || trigger !== (snap?.trigger ?? '')
        || JSON.stringify(barrier_list) !== JSON.stringify(snap?.barrier_list ?? [])
        || environment_cue !== (snap?.environment_cue ?? '');
    }
    return name.trim().length > 0;
  });

  function scheduleAutosave() {
    saved = false;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(doAutosave, AUTOSAVE_DEBOUNCE_MS);
  }

  async function doAutosave() {
    if (!name.trim()) return;
    saving = true;
    try {
      const payload: any = { name: name.trim() };
      if (domain !== (snap?.domain ?? '')) payload.domain = domain || null;
      if (purpose !== (snap?.purpose ?? '')) payload.purpose = purpose;
      if (philosophy !== (snap?.philosophy ?? '')) payload.philosophy = philosophy;
      if (protocol !== (snap?.protocol ?? '')) payload.protocol = protocol;
      if (floor_action !== (snap?.floor_action ?? '')) payload.floor_action = floor_action;
      if (trigger !== (snap?.trigger ?? '')) payload.trigger = trigger;
      if (JSON.stringify(barrier_list) !== JSON.stringify(snap?.barrier_list ?? [])) payload.barrier_list = barrier_list;
      if (environment_cue !== (snap?.environment_cue ?? '')) payload.environment_cue = environment_cue;

      if (!systemId) {
        const created = await createSystem(payload);
        systemId = created.id;
      } else {
        await patchSystem(systemId, payload);
      }
      saved = true;
    } catch (e) {
      // autosave errors are silent
    } finally {
      saving = false;
    }
  }

  function addBarrier() {
    const trimmed = barrierInput.trim();
    if (trimmed && !barrier_list.includes(trimmed)) {
      barrier_list = [...barrier_list, trimmed];
      barrierInput = '';
      scheduleAutosave();
    }
  }

  function removeBarrier(index: number) {
    barrier_list = barrier_list.filter((_, i) => i !== index);
    scheduleAutosave();
  }

  async function handleConfirm() {
    if (!systemId) {
      await doAutosave();
      if (!systemId) return;
    }

    confirmError = null;
    try {
      await confirmSystem(systemId);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'floor_action_required') {
        confirmError = e.message;
      } else {
        throw e;
      }
    }
  }
</script>

<form class="flex flex-col gap-10 max-w-2xl" onsubmit={async (e) => { e.preventDefault(); await handleConfirm(); }}>
  <!-- Section 1: Purpose -->
  <section>
    <div class="flex items-center gap-3 mb-4">
      <span class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-display text-xs font-semibold">1</span>
      <h2 class="font-body text-base font-semibold text-on-surface">Purpose</h2>
    </div>
    <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm space-y-4">
      <div class="field-group">
        <label for="name" class="font-body text-sm font-medium text-on-surface">Name *</label>
        <input id="name" type="text" bind:value={name} oninput={scheduleAutosave}
               class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                      focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                      placeholder:text-muted-foreground transition-all duration-200"
               placeholder="e.g. Reading System" required />
      </div>

      <div class="field-group">
        <label for="domain" class="font-body text-sm font-medium text-on-surface">Domain</label>
        <input id="domain" type="text" bind:value={domain} oninput={scheduleAutosave}
               class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                      focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                      placeholder:text-muted-foreground transition-all duration-200"
               placeholder="e.g. Study, Fitness, Writing" />
      </div>

      <div class="field-group">
        <label for="purpose" class="font-body text-sm font-medium text-on-surface">Purpose</label>
        <textarea id="purpose" bind:value={purpose} oninput={scheduleAutosave}
                  class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="Why does this system exist?"></textarea>
      </div>

      <div class="field-group">
        <label for="philosophy" class="font-body text-sm font-medium text-on-surface">Philosophy</label>
        <textarea id="philosophy" bind:value={philosophy} oninput={scheduleAutosave}
                  class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="What principles guide this system?"></textarea>
      </div>
    </div>
  </section>

  <!-- Section 2: Floor Action -->
  <section>
    <div class="flex items-center gap-3 mb-4">
      <span class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-display text-xs font-semibold">2</span>
      <h2 class="font-body text-base font-semibold text-on-surface">Floor Action</h2>
    </div>
    <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm space-y-4">
      <p class="font-body text-xs text-muted-foreground">
        The minimum viable action that counts as a win — must be doable on your worst day.
      </p>

      <div class="field-group">
        <label for="floor_action" class="font-body text-sm font-medium text-on-surface">What's the smallest version?</label>
        <textarea id="floor_action" bind:value={floor_action} oninput={scheduleAutosave}
                  class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="e.g. Read one page"></textarea>
        <p class="mt-1 font-body text-xs text-muted-foreground">What would count as a win on your worst day?</p>
        {#if confirmError}
          <p class="mt-1 text-sm text-destructive font-body">{confirmError}</p>
        {/if}
      </div>

      <div class="field-group">
        <label for="trigger" class="font-body text-sm font-medium text-on-surface">Trigger (after I [X], I will [Y])</label>
        <input id="trigger" type="text" bind:value={trigger} oninput={scheduleAutosave}
               class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                      focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                      placeholder:text-muted-foreground transition-all duration-200"
               placeholder="After I pour my morning coffee, I will open my book" />
      </div>

      <div class="field-group">
        <label for="protocol" class="font-body text-sm font-medium text-on-surface">Protocol</label>
        <textarea id="protocol" bind:value={protocol} oninput={scheduleAutosave}
                  class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                         placeholder:text-muted-foreground transition-all duration-200"
                  rows="2" placeholder="What are the steps or rules?"></textarea>
      </div>
    </div>
  </section>

  <!-- Section 3: Barriers & Environment -->
  <section>
    <div class="flex items-center gap-3 mb-4">
      <span class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-display text-xs font-semibold">3</span>
      <h2 class="font-body text-base font-semibold text-on-surface">Barriers & Environment</h2>
    </div>
    <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm space-y-4">
      <div class="field-group">
        <p class="font-body text-sm font-medium text-on-surface">What usually gets in the way?</p>
        <div class="flex flex-wrap gap-2 mt-1 mb-2">
          {#each barrier_list as barrier, i}
            <span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-body text-primary">
              {barrier}
              <button type="button" onclick={() => removeBarrier(i)} class="hover:text-destructive">&times;</button>
            </span>
          {/each}
        </div>
        <div class="flex gap-2">
          <input type="text" bind:value={barrierInput}
                 onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBarrier(); } }}
                 class="block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                        focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                        placeholder:text-muted-foreground transition-all duration-200"
                 placeholder="e.g. Phone notifications, tired after work" />
          <button type="button" onclick={addBarrier}
                  class="rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2 text-sm font-body font-semibold
                         transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer">
            Add
          </button>
        </div>
      </div>

      <div class="field-group">
        <label for="environment_cue" class="font-body text-sm font-medium text-on-surface">Environment cue</label>
        <input id="environment_cue" type="text" bind:value={environment_cue} oninput={scheduleAutosave}
               class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
                      focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                      placeholder:text-muted-foreground transition-all duration-200"
               placeholder="e.g. Book on the pillow, gym bag by the door" />
      </div>
    </div>
  </section>

  <!-- Section 4: Schedule -->
  <section>
    <div class="flex items-center gap-3 mb-4">
      <span class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-display text-xs font-semibold">4</span>
      <h2 class="font-body text-base font-semibold text-on-surface">Schedule</h2>
    </div>
    <div class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm">
      <p class="font-body text-xs text-muted-foreground mb-4">
        How often does this system run? Each day has its own time window.
      </p>
      <SchedulePicker systemId={systemId} />
    </div>
  </section>

  <!-- Footer -->
  <div class="flex items-center justify-between pt-4 border-t border-border/50">
    <span class="text-xs text-muted-foreground flex items-center gap-1">
      {#if saved}
        Saved <Check class="w-3 h-3" />
      {:else if dirty || name.trim()}
        Unsaved changes
      {/if}
    </span>
    <div class="flex items-center gap-3">
      {#if saving}
        <span class="text-xs text-muted-foreground font-body">Autosaving&hellip;</span>
      {/if}
      <button type="submit" disabled={!name.trim()}
              class="rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary
                     px-8 py-3 font-semibold text-sm
                     disabled:opacity-50 transition-all duration-200
                     hover:opacity-90 active:scale-[0.98] cursor-pointer">
        {edit ? 'Save changes' : 'Confirm system'}
      </button>
    </div>
  </div>
</form>
