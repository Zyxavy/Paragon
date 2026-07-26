<script lang="ts">
  import { draftSystem } from '$lib/api/ai';
  import { ApiError } from '$lib/api/client';
  import type { SystemDraft } from '$lib/api/ai';

  let { ondraft }: { ondraft?: (draft: SystemDraft) => void } = $props();

  let prompt = $state('');
  let loading = $state(false);
  let aiUnavailable = $state(false);
  let error = $state<string | null>(null);

  async function handleDraft() {
    const trimmed = prompt.trim();
    if (trimmed.length < 5) {
      error = 'Please describe your system in at least 5 characters.';
      return;
    }

    loading = true;
    error = null;

    try {
      const { draft } = await draftSystem(trimmed);
      ondraft?.(draft);
      prompt = '';
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ai_unavailable') {
        aiUnavailable = true;
      } else if (e instanceof ApiError) {
        error = e.message;
      } else {
        error = 'Something went wrong. Try again.';
      }
    } finally {
      loading = false;
    }
  }
</script>

<details class="mb-6 group" open={!aiUnavailable}>
  <summary
    class="cursor-pointer font-body text-sm font-semibold text-primary
           hover:text-primary/80 transition-colors"
  >
    Draft with AI
  </summary>

  <div class="mt-3">
    {#if aiUnavailable}
      <p class="text-sm text-on-surface-muted font-body">
        AI assist is unavailable today. You can still create your system manually, all fields are editable.
      </p>
    {:else}
      <textarea
        bind:value={prompt}
        rows="3"
        class="mt-1 block w-full rounded-md border-border bg-surface text-on-surface
               px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Describe the system you want to build... e.g. 'I want to read more before bed'"
      ></textarea>

      {#if error}
        <p class="mt-2 text-sm text-destructive font-body">{error}</p>
      {/if}

      <button
        type="button"
        onclick={handleDraft}
        disabled={loading || prompt.trim().length < 5}
        class="mt-3 rounded-2xl bg-gradient-to-br from-primary to-primary-container
               text-on-primary px-5 py-2.5 text-sm font-body font-semibold
               disabled:opacity-50 transition-all duration-200
               hover:opacity-90 active:scale-[0.98] cursor-pointer"
      >
        {loading ? 'Drafting...' : 'Draft'}
      </button>
    {/if}
  </div>
</details>