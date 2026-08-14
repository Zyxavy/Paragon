<script lang="ts">
  import MarkdownText from './MarkdownText.svelte';

  let { id, label, value, placeholder = '', rows = 4, hint, onchange }: {
    id: string;
    label: string;
    value: string;
    placeholder?: string;
    rows?: number;
    hint?: string;
    onchange: (v: string) => void;
  } = $props();

  let mode = $state<'write' | 'preview'>('write');

  function toggleMode(next: 'write' | 'preview') {
    mode = next;
  }
</script>

<div>
  <div class="flex items-center justify-between mb-1">
    <label for={id} class="font-body text-sm font-medium text-on-surface">{label}</label>
    <div class="flex rounded-lg border border-border overflow-hidden text-xs font-body">
      <button
        type="button"
        onclick={() => toggleMode('write')}
        class="px-2.5 py-1 cursor-pointer transition-colors duration-150
               {mode === 'write' ? 'bg-primary text-white' : 'bg-surface text-on-surface-muted hover:text-on-surface'}"
      >
        Write
      </button>
      <button
        type="button"
        onclick={() => toggleMode('preview')}
        class="px-2.5 py-1 cursor-pointer transition-colors duration-150
               {mode === 'preview' ? 'bg-primary text-white' : 'bg-surface text-on-surface-muted hover:text-on-surface'}"
      >
        Preview
      </button>
    </div>
  </div>

  {#if mode === 'write'}
    <textarea
      id={id}
      value={value}
      rows={rows}
      placeholder={placeholder}
      oninput={(e) => onchange((e.currentTarget as HTMLTextAreaElement).value)}
      class="mt-1 block w-full rounded-xl border-border bg-surface text-on-surface px-4 py-3 text-sm font-body
             focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
             placeholder:text-muted-foreground transition-all duration-200"
    ></textarea>
  {:else}
    <div class="mt-1 rounded-xl border border-border bg-surface px-4 py-3 min-h-[80px]">
      {#if value.trim()}
        <MarkdownText content={value} />
      {:else}
        <p class="font-body text-sm text-muted-foreground">Nothing to preview yet.</p>
      {/if}
    </div>
  {/if}

  {#if hint}
    <p class="mt-1 font-body text-xs text-muted-foreground">{hint}</p>
  {/if}
</div>
