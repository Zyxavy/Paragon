<script lang="ts">
  let { data } = $props();
</script>

<div class="flex items-center justify-between mb-6">
    <h2 class="font-display text-xl font-semibold text-on-surface">Reviews</h2>
    <a href="/systems/{data.systemId}/reviews/new"
       class="bg-primary text-on-primary
              px-4 py-2 rounded-2xl text-sm font-semibold
              transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer">
      + New review
    </a>
  </div>

  {#if data.reviews.length === 0}
    <div class="bg-surface-container-low rounded-xl p-10 text-center max-w-md mx-auto">
      <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
        <span class="text-2xl">+</span>
      </div>
      <h2 class="font-body text-lg font-semibold text-on-container mb-2">No reviews yet</h2>
      <p class="font-body text-sm text-on-container/70 max-w-sm mx-auto">
        Complete your first review period to see your history here.
      </p>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      {#each data.reviews as review (review.id)}
        <div class="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm
                    transition-shadow duration-200 hover:shadow-ambient-md">
          <div class="flex items-center justify-between mb-3">
            <span class="font-body text-sm font-semibold text-on-container">
              {review.period_start}, {review.period_end}
            </span>
            <span class="font-body text-xs text-on-container/70">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          {#if review.what_worked}
            <p class="font-body text-sm text-on-container/70">
              <span class="font-medium text-on-container">Worked:</span> {review.what_worked}
            </p>
          {/if}
          {#if review.what_broke}
            <p class="font-body text-sm text-on-container/70 mt-1">
              <span class="font-medium text-on-container">Broke:</span> {review.what_broke}
            </p>
          {/if}
        </div>
      {/each}
    </div>

    {#if data.next_cursor}
      <p class="mt-6 text-sm text-muted-foreground font-body text-center">(Pagination coming in a future slice)</p>
    {/if}
  {/if}
