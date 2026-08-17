<script lang="ts">
  import { renderMarkdown } from '$lib/markdown/markdown';

  let { content, tone = 'on-container' }: { content: string; tone?: 'on-container' | 'on-surface' } = $props();

  const html = $derived(renderMarkdown(content));
</script>

<div
  class="prose prose-sm max-w-none {tone === 'on-container' ? 'text-on-container' : 'text-on-surface'} prose-headings:font-display prose-p:font-body prose-li:font-body prose-strong:font-semibold prose-table:text-sm prose-th:text-left"
  data-markdown
>
  {@html html}
</div>
