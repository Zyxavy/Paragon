<script lang="ts">
  import DueReviewList from '$lib/components/DueReviewList.svelte';

  let { data } = $props();
  let due = $derived(data.due);
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-8">
    <h1 class="font-display text-2xl font-semibold text-on-surface">Review Day</h1>
    <p class="font-body text-sm text-muted-foreground mt-1">
      {#if due.length > 0}
        {due.length} system{due.length !== 1 ? 's' : ''} due for review
      {:else}
        All caught up — no systems due for review
      {/if}
    </p>
  </div>
  <DueReviewList {due} />
</div>
