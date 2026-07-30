<script lang="ts">
  import { Clock, Sparkles } from '@lucide/svelte';

  let { data } = $props();

  let ready = $state(false);
  let loadError = $state(false);
  let systems: any[] = $state([]);
  let next_cursor: string | null = $state(null);
  let todayMap: Record<string, any> = $state({});

  $effect(() => {
    if (data) {
      ready = true;
      if (data.systems) {
        systems = data.systems;
        next_cursor = data.next_cursor;
        todayMap = data.todayMap ?? {};
      } else {
        loadError = true;
      }
    }
  });
</script>

{#if !ready}
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between mb-2">
      <div class="skeleton h-8 w-40 rounded-xl animate-pulse"></div>
      <div class="skeleton h-10 w-32 rounded-xl animate-pulse"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each Array(4) as _}
        <div class="skeleton h-[160px] rounded-xl animate-pulse"></div>
      {/each}
    </div>
  </div>
{:else if loadError}
  <div class="flex flex-col items-center justify-center py-20 gap-4">
    <div class="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
      <span class="text-xl font-bold">!</span>
    </div>
    <h2 class="font-body text-lg font-semibold text-on-surface">Couldn't load systems</h2>
    <p class="font-body text-sm text-muted-foreground text-center max-w-sm">Something went wrong. Try again.</p>
    <button onclick={() => location.reload()}
            class="bg-gradient-to-br from-primary to-primary-container text-on-primary
                   px-5 py-2.5 rounded-2xl font-semibold text-sm mt-2 cursor-pointer">
      Try again
    </button>
  </div>
{:else}
  <div class="max-w-6xl">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-display text-2xl font-semibold text-on-surface">Your systems</h1>
        <p class="font-body text-sm text-muted-foreground mt-1">{systems.length} active</p>
      </div>
      <a href="/systems/new"
         class="bg-gradient-to-br from-primary to-primary-container text-on-primary
                px-5 py-2.5 rounded-2xl font-semibold text-sm
                transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer">
        + New system
      </a>
    </div>

    {#if systems.length === 0}
      <div class="bg-surface-container-low rounded-xl p-10 text-center max-w-lg mx-auto">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">+</span>
        </div>
        <h2 class="font-body text-lg font-semibold text-on-surface mb-2">No systems yet</h2>
        <p class="font-body text-sm text-muted-foreground mx-auto mb-6">
          Create your first system to get started.
        </p>
        <a href="/systems/new"
           class="inline-block bg-gradient-to-br from-primary to-primary-container text-on-primary
                  px-5 py-2.5 rounded-2xl font-semibold text-sm
                  transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer">
          Create a system
        </a>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each systems as system (system.id)}
          <a href="/systems/{system.id}"
             class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm
                    transition-all duration-200 hover:shadow-ambient-md
                    cursor-pointer block">
            <div class="flex items-start justify-between mb-4">
              <h2 class="font-body text-lg font-semibold text-on-surface">{system.name}</h2>
              {#if system.domain}
                <span class="text-xs font-medium text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg shrink-0 ml-2">
                  {system.domain}
                </span>
              {/if}
            </div>

            {#if system.floor_action}
              <p class="font-body text-sm text-muted-foreground line-clamp-2 mb-4">
                {system.floor_action}
              </p>
            {/if}

            <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-4">
              {#if todayMap[system.id]}
                <span class="flex items-center gap-1.5 capitalize">
                  <span class="w-2 h-2 rounded-full
                    {todayMap[system.id].state === 'full' ? 'bg-blush' :
                     todayMap[system.id].state === 'floor' ? 'bg-secondary' :
                     todayMap[system.id].state === 'missed' ? 'bg-muted' : 'bg-surface-container-low'}">
                  </span>
                  {todayMap[system.id].state}
                </span>
              {:else}
                <span class="flex items-center gap-1.5">
                  <Clock class="w-3.5 h-3.5" />
                  No session today
                </span>
              {/if}
              {#if todayMap[system.id]?.state === 'full'}
                <span class="flex items-center gap-1.5 text-blush">
                  <Sparkles class="w-3.5 h-3.5" />
                  Done
                </span>
              {/if}
            </div>
          </a>
        {/each}
      </div>

      {#if next_cursor}
        <p class="mt-6 text-sm text-muted-foreground font-body text-center">(Pagination coming in a future slice)</p>
      {/if}
    {/if}
  </div>
{/if}
