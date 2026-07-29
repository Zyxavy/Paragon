<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();

  let ready = $state(false);
  let loadError = $state(false);
  let reviews: any[] = $state([]);
  let next_cursor: string | null = $state(null);
  let systemId: string = $state('');

  $effect(() => {
    if (data) {
      ready = true;
      if (data.reviews) {
        reviews = data.reviews;
        next_cursor = data.next_cursor;
        systemId = data.systemId;
      } else {
        loadError = true;
      }
    }
  });
</script>

{#if !ready}
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="skeleton h-7 w-28 rounded-xl animate-pulse"></div>
      <div class="skeleton h-9 w-28 rounded-xl animate-pulse"></div>
    </div>
    {#each Array(3) as _}
      <div class="skeleton h-24 rounded-xl animate-pulse"></div>
    {/each}
  </div>
{:else if loadError}
  <div class="flex flex-col items-center justify-center py-20 gap-4">
    <div class="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
      <span class="text-xl font-bold">!</span>
    </div>
    <h2 class="font-body text-lg font-semibold text-on-surface">Couldn't load reviews</h2>
    <p class="font-body text-sm text-muted-foreground text-center max-w-sm">Something went wrong.</p>
    <button onclick={() => location.reload()}
            class="bg-gradient-to-br from-primary to-primary-container text-on-primary
                   px-5 py-2.5 rounded-2xl font-semibold text-sm mt-2 cursor-pointer">
      Try again
    </button>
  </div>
{:else}
  <div class="flex items-center justify-between mb-6">
    <h2 class="font-display text-xl font-semibold text-on-surface">Reviews</h2>
    <a href="/systems/{systemId}/reviews/new"
       class="bg-gradient-to-br from-primary to-primary-container text-on-primary
              px-4 py-2 rounded-2xl text-sm font-semibold
              transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer">
      + New review
    </a>
  </div>

  {#if reviews.length === 0}
    <div class="bg-surface-container-low rounded-xl p-10 text-center max-w-md mx-auto">
      <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
        <span class="text-2xl">+</span>
      </div>
      <h2 class="font-body text-lg font-semibold text-on-surface mb-2">No reviews yet</h2>
      <p class="font-body text-sm text-muted-foreground max-w-sm mx-auto">
        Complete your first review period to see your history here.
      </p>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      {#each reviews as review (review.id)}
        <div class="bg-surface-container-lowest rounded-xl p-5 shadow-ambient-sm
                    transition-shadow duration-200 hover:shadow-ambient-md">
          <div class="flex items-center justify-between mb-3">
            <span class="font-body text-sm font-semibold text-on-surface">
              {review.period_start} — {review.period_end}
            </span>
            <span class="font-body text-xs text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          {#if review.what_worked}
            <p class="font-body text-sm text-muted-foreground">
              <span class="font-medium text-on-surface">Worked:</span> {review.what_worked}
            </p>
          {/if}
          {#if review.what_broke}
            <p class="font-body text-sm text-muted-foreground mt-1">
              <span class="font-medium text-on-surface">Broke:</span> {review.what_broke}
            </p>
          {/if}
        </div>
      {/each}
    </div>

    {#if next_cursor}
      <p class="mt-6 text-sm text-muted-foreground font-body text-center">(Pagination coming in a future slice)</p>
    {/if}
  {/if}
{/if}
