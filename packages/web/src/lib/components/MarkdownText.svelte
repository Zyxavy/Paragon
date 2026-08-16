<script lang="ts">
  import { renderMarkdown } from '$lib/markdown/markdown';

  let { content }: { content: string } = $props();

  const html = $derived(renderMarkdown(content));
</script>

<div
  class="prose prose-sm max-w-none text-on-container prose-headings:font-display prose-p:font-body prose-li:font-body prose-strong:font-semibold prose-table:text-sm prose-th:text-left"
  data-markdown
>
  {@html html}
</div>
