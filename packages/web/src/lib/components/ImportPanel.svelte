<script lang="ts">
  import { EXAMPLE_MARKDOWN, parseSystemMarkdown } from '$lib/markdown/import';
  import type { ImportedSystemDraft } from '$lib/markdown/import';

  let { onimport }: { onimport: (draft: ImportedSystemDraft) => void } = $props();

  let error = $state<string | null>(null);
  let importing = $state(false);
  let showExample = $state(false);

  function handleFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    error = null;
    importing = true;

    const reader = new FileReader();
    reader.onload = () => {
      importing = false;
      const result = parseSystemMarkdown(String(reader.result ?? ''));
      if (result.error) {
        error = result.error;
      } else if (result.draft) {
        onimport(result.draft);
      }
      input.value = '';
    };
    reader.onerror = () => {
      importing = false;
      error = "Couldn't read that file. Use a .md file.";
      input.value = '';
    };
    reader.readAsText(file);
  }
</script>

<div class="rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-5">
  <h3 class="font-body text-sm font-semibold text-on-container">Import System</h3>
  <p class="font-body text-xs text-on-container/70 mt-1 mb-3">
    Upload a Markdown file with a <code class="text-primary"># Title</code> and
    <code class="text-primary">##</code> sections (Domain, Purpose, Philosophy, Protocol, Floor Action, Trigger,
    Barriers, Environment Cue, Reference Table, Success Metric) to fill the form.
  </p>

  <label
    class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-body font-medium text-on-surface hover:bg-surface/60 cursor-pointer disabled:opacity-50 transition-all duration-200"
    class:opacity-50={importing}
  >
    {importing ? 'Importing...' : 'Choose .md file'}
    <input type="file" accept=".md,text/markdown" class="hidden" onchange={handleFile} disabled={importing} />
  </label>

  <button
    type="button"
    aria-expanded={showExample}
    class="mt-3 font-body text-xs font-medium text-primary hover:text-primary/80 cursor-pointer transition-colors duration-200"
    onclick={() => (showExample = !showExample)}
  >
    {#if showExample}
      Hide example .md file
    {:else}
      Show example .md file
    {/if}
  </button>

  {#if showExample}
    <pre
      class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-outline-variant/25 bg-surface p-4 font-mono text-xs text-on-surface">{EXAMPLE_MARKDOWN}</pre>
  {/if}

  {#if error}
    <p class="mt-2 text-sm text-destructive font-body">{error}</p>
  {/if}
</div>
