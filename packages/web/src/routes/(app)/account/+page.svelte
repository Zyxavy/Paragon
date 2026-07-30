<script lang="ts">
  import { Eye, EyeOff } from '@lucide/svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { regenerateRecoveryCodes, getRecoveryCodes, maskCode } from '$lib/api/recovery-codes';
  import type { RecoveryCode } from '$lib/api/recovery-codes';
  import { ApiError } from '$lib/api/client';

  let { data } = $props();

  let codes = $state<RecoveryCode[]>(data.codes);
  let loadError = $state<string | null>(data.error);
  let revealed = $state<Set<string>>(new Set());
  let showRegenConfirm = $state(false);
  let regenError = $state<string | null>(null);
  let regenerating = $state(false);

  let session = $derived(data.session);

  function toggleReveal(id: string) {
    const next = new Set(revealed);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    revealed = next;
  }

  async function handleRegenerate() {
    regenerating = true;
    regenError = null;
    try {
      await regenerateRecoveryCodes();
      const fresh = await getRecoveryCodes();
      codes = fresh.codes;
      revealed = new Set();
      showRegenConfirm = false;
    } catch (e) {
      regenError = e instanceof ApiError ? e.message : 'Failed to regenerate codes.';
    } finally {
      regenerating = false;
    }
  }
</script>

<div class="max-w-2xl flex flex-col gap-8">
  <h1 class="font-display text-2xl font-semibold text-on-surface">Account Settings</h1>

  <!-- Profile section -->
  <section class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm">
    <h2 class="font-body text-base font-semibold text-on-surface mb-4">Profile</h2>
    <div class="flex flex-col gap-3 text-sm text-on-surface">
      <div class="flex gap-2">
        <span class="text-muted-foreground w-20 shrink-0">Email:</span>
        <span>{session?.user?.email ?? '—'}</span>
      </div>
      <div class="flex gap-2">
        <span class="text-muted-foreground w-20 shrink-0">Name:</span>
        <span>{session?.user?.name ?? '—'}</span>
      </div>
    </div>
  </section>

  <!-- Recovery Codes section -->
  <section class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm">
    <h2 class="font-body text-base font-semibold text-on-surface mb-1">Recovery Codes</h2>
    <p class="font-body text-sm text-muted-foreground mb-6">
      Each code can be used once to sign in if you lose access to your account.
    </p>

    {#if loadError}
      <p class="text-sm text-destructive">{loadError}</p>
    {:else if codes.length === 0}
      <p class="text-sm text-muted-foreground mb-4">No recovery codes available. Generate some below.</p>
    {:else}
      <div class="space-y-3 mb-6">
        {#each codes as rc (rc.id)}
          <div class="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
            <span class="font-mono text-sm text-on-surface">
              {revealed.has(rc.id) ? rc.code : maskCode(rc.code)}
            </span>
            <button onclick={() => toggleReveal(rc.id)}
                    class="text-muted-foreground hover:text-on-surface transition-colors cursor-pointer p-1 rounded"
                    aria-label={revealed.has(rc.id) ? 'Hide code' : 'Show code'}>
              {#if revealed.has(rc.id)}
                <EyeOff class="w-4 h-4" />
              {:else}
                <Eye class="w-4 h-4" />
              {/if}
            </button>
          </div>
        {/each}
      </div>
    {/if}

    {#if regenError}
      <p class="text-sm text-destructive mb-3">{regenError}</p>
    {/if}

    <button onclick={() => showRegenConfirm = true} disabled={regenerating}
            class="bg-gradient-to-br from-primary to-primary-container text-on-primary
                   px-5 py-2.5 rounded-2xl text-sm font-semibold
                   transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                   disabled:opacity-40 cursor-pointer">
      {regenerating ? 'Regenerating...' : 'Regenerate codes'}
    </button>
  </section>
</div>

<Modal open={showRegenConfirm} title="Regenerate Recovery Codes?" onclose={() => showRegenConfirm = false}>
  <p class="text-sm text-muted-foreground mb-6">
    This will invalidate all your existing recovery codes. Are you sure?
  </p>
  <div class="flex gap-3 justify-end">
    <button onclick={() => showRegenConfirm = false}
            class="px-4 py-2 rounded-2xl bg-surface-container-low text-on-surface text-sm font-medium
                   transition-all duration-200 hover:bg-muted cursor-pointer">
      Cancel
    </button>
    <button onclick={handleRegenerate} disabled={regenerating}
            class="px-4 py-2 rounded-2xl bg-destructive text-white text-sm font-semibold
                   transition-all duration-200 hover:opacity-90
                   disabled:opacity-40 cursor-pointer">
      {regenerating ? 'Regenerating...' : 'Yes, regenerate'}
    </button>
  </div>
</Modal>
