<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import { regenerateRecoveryCodes, getRecoveryCodes } from '$lib/api/recovery-codes';
  import type { RecoveryCode } from '$lib/api/recovery-codes';
  import { ApiError } from '$lib/api/client';
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';
  import { themeStore } from '$lib/stores/theme.svelte';

  let { data } = $props();

  let codes = $state<RecoveryCode[]>(data.codes);
  let loadError = $state<string | null>(data.error);
  let showRegenConfirm = $state(false);
  let regenError = $state<string | null>(null);
  let regenerating = $state(false);
  // Raw codes returned exactly once by the regenerate endpoint — shown once.
  let newCodes: string[] | null = $state(null);

  let session = $derived(data.session);

  async function handleRegenerate() {
    regenerating = true;
    regenError = null;
    try {
      const { codes: generated } = await regenerateRecoveryCodes();
      showRegenConfirm = false;
      newCodes = generated;
      // Refresh the stored (masked) list behind the once-only display.
      const fresh = await getRecoveryCodes();
      codes = fresh.codes;
    } catch (e) {
      regenError = e instanceof ApiError ? e.message : 'Failed to regenerate codes.';
    } finally {
      regenerating = false;
    }
  }

  function handleNewCodesDone() {
    newCodes = null;
  }

  async function copyNewCodes() {
    if (newCodes) await navigator.clipboard.writeText(newCodes.join('\n'));
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

  <!-- Appearance section -->
  <section class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm">
    <h2 class="font-body text-base font-semibold text-on-surface mb-4">Appearance</h2>
    <button
      onclick={() => themeStore.toggle()}
      class="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container-low text-on-surface
             text-sm font-medium transition-all duration-200 hover:bg-muted cursor-pointer"
      aria-label={themeStore.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {#if themeStore.theme === 'light'}
        <Moon class="w-4 h-4" />
        <span>Dark mode</span>
      {:else}
        <Sun class="w-4 h-4" />
        <span>Light mode</span>
      {/if}
    </button>
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
      <p class="font-body text-xs text-muted-foreground mb-4">
        Recovery codes are only shown in full once, at sign-up or when you regenerate them. They are masked here for your safety.
      </p>
      <div class="space-y-3 mb-6">
        {#each codes as rc (rc.id)}
          <div class="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
            <span class="font-mono text-sm text-on-surface">{rc.masked_code}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if regenError}
      <p class="text-sm text-destructive mb-3">{regenError}</p>
    {/if}

    <button onclick={() => showRegenConfirm = true} disabled={regenerating}
            class="bg-primary text-on-primary
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

{#if newCodes}
  <Modal open={newCodes !== null} title="Save your new recovery codes" onclose={handleNewCodesDone}>
    <p class="text-sm text-muted-foreground mb-6">
      Your old codes are now invalid. Each of these can be used once to sign in.
    </p>
    <div class="bg-surface-container-low rounded-xl p-4 mb-6 font-mono text-sm text-on-surface space-y-2">
      {#each newCodes as code}
        <div class="flex items-center justify-between">
          <span>{code}</span>
          <span class="text-blush text-xs font-medium">unused</span>
        </div>
      {/each}
    </div>
    <div class="flex flex-col gap-3">
      <button onclick={copyNewCodes}
              class="w-full bg-surface-container-low text-on-surface py-3 rounded-2xl font-semibold
                     transition-all duration-200 hover:bg-muted cursor-pointer">
        Copy codes
      </button>
      <button onclick={handleNewCodesDone}
              class="w-full bg-primary text-on-primary
                     py-3 rounded-2xl font-semibold
                     transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                     cursor-pointer">
        I've saved them
      </button>
    </div>
  </Modal>
{/if}