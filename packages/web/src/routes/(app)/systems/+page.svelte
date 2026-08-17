<script lang="ts">
  import { Clock, Sparkles } from '@lucide/svelte';
  import { goto } from '$app/navigation';

  let { data } = $props();

  const systems = $derived(data.systems);
  const todayMap = $derived(data.todayMap ?? {});
  const currentStatus = $derived(data.currentStatus ?? 'active');

  const statusTabs = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
    { label: 'Archived', value: 'archived' },
  ];

  function navigateTab(status: string) {
    goto(`/systems?status=${status}`);
  }
</script>

<div class="max-w-6xl">
    <div class="flex items-center justify-between mb-4">
      <h1 class="font-display text-2xl font-semibold text-on-surface">Your systems</h1>
      <a href="/systems/new"
         class="bg-primary text-on-primary
                px-5 py-2.5 rounded-2xl font-semibold text-sm
                transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer">
        + New system
      </a>
    </div>

    <nav class="flex gap-4 overflow-x-auto border-b border-border/50 mb-6 pb-0">
      {#each statusTabs as tab}
        <button
          onclick={() => navigateTab(tab.value)}
          class="pb-3 font-body text-sm whitespace-nowrap transition-colors duration-150
                 {currentStatus === tab.value ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-on-surface'}">
          {tab.label}
        </button>
      {/each}
    </nav>

    <p class="font-body text-sm text-muted-foreground mb-6">{systems.length} {currentStatus === 'all' ? 'total' : currentStatus} system{systems.length !== 1 ? 's' : ''}</p>

    {#if systems.length === 0}
      <div class="bg-surface-container-low rounded-xl p-10 text-center max-w-lg mx-auto">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">+</span>
        </div>
        <h2 class="font-body text-lg font-semibold text-on-container mb-2">
          {currentStatus === 'active' ? 'No active systems' :
           currentStatus === 'paused' ? 'No paused systems' :
           currentStatus === 'archived' ? 'No archived systems' :
           'No systems yet'}
        </h2>
        <p class="font-body text-sm text-on-container/70 mx-auto mb-6">
          Create your first system to get started.
        </p>
        <a href="/systems/new"
           class="inline-block bg-primary text-on-primary
                  px-5 py-2.5 rounded-2xl font-semibold text-sm
                  transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer">
          Create a system
        </a>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each systems as system (system.id)}
          <a href="/systems/{system.id}"
             data-sveltekit-preload-code="hover"
             class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm
                    transition-all duration-200 hover:shadow-ambient-md
                    cursor-pointer block">
            <div class="flex items-start justify-between mb-4">
              <h2 class="font-body text-lg font-semibold text-on-container">{system.name}</h2>
              {#if system.domain}
                <span class="text-xs font-medium text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg shrink-0 ml-2">
                  {system.domain}
                </span>
              {/if}
            </div>

            {#if system.floor_action}
              <p class="font-body text-sm text-on-container/70 line-clamp-2 mb-4">
                {system.floor_action}
              </p>
            {/if}

            <div class="flex items-center justify-between text-xs text-on-container/70 border-t border-border/50 pt-4">
              {#if todayMap[system.id]}
                <span class="flex items-center gap-1.5 capitalize">
                  <span class="w-2 h-2 rounded-full
                    {todayMap[system.id].state === 'full' ? 'bg-on-container/25' :
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
                <span class="flex items-center gap-1.5 text-on-container/80">
                  <Sparkles class="w-3.5 h-3.5" />
                  Done
                </span>
              {/if}
            </div>
          </a>
        {/each}
      </div>

      {#if data.next_cursor}
        <p class="mt-6 text-sm text-muted-foreground font-body text-center">(Pagination coming in a future slice)</p>
      {/if}
    {/if}
  </div>
