<script lang="ts">
    import { Timer, Plus, ListChecks, FileText, Link, Flame, ChartLine, StickyNote, PanelLeftClose, PanelLeftOpen } from '@lucide/svelte';

    let { onAdd }: { onAdd: (type: string) => void } = $props();

    let collapsed = $state(false);

    $effect(() => {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('palette-collapsed') : null;
        if (stored === 'true') collapsed = true;
    });

    function toggleCollapsed() {
        collapsed = !collapsed;
        localStorage.setItem('palette-collapsed', String(collapsed));
    }

    const widgetTypes = [
        { type: 'timer', label: 'Timer', icon: Timer, comingSoon: false },
        { type: 'counter', label: 'Counter', icon: Plus, comingSoon: false },
        { type: 'checklist', label: 'Checklist', icon: ListChecks, comingSoon: false },
        { type: 'log', label: 'Log', icon: FileText, comingSoon: false  },
        { type: 'link-list', label: 'Link List', icon: Link, comingSoon: false },
        { type: 'streak', label: 'Streak', icon: Flame, comingSoon: false },
        { type: 'progress', label: 'Progress Chart', icon: ChartLine, comingSoon: false },
        { type: 'notes', label: 'Notes', icon: StickyNote, comingSoon: false },
    ];
</script>

<aside aria-label="Widget palette"
  class="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-hidden
         shrink-0 bg-surface-container-low rounded-xl p-4
         transition-all duration-300 ease-in-out
         scrollbar-none"
  class:lg:w-12={collapsed}
  class:lg:w-[200px]={!collapsed}
  style="-webkit-overflow-scrolling: touch; scrollbar-width: none;"
>
  <div class="hidden lg:flex items-center justify-between mb-2 shrink-0" class:justify-center={collapsed}>
    <h3 class="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide" class:hidden={collapsed}>Widgets</h3>
    <button
      onclick={toggleCollapsed}
      aria-label={collapsed ? 'Expand widget palette' : 'Collapse widget palette'}
      title={collapsed ? 'Expand widget palette' : 'Collapse widget palette'}
      class="text-muted-foreground hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none p-1 rounded"
    >
      {#if collapsed}
        <PanelLeftOpen class="w-4 h-4" />
      {:else}
        <PanelLeftClose class="w-4 h-4" />
      {/if}
    </button>
  </div>
  {#each widgetTypes as w}
    <button
      onclick={() => { if (!w.comingSoon) onAdd(w.type); }}
      disabled={w.comingSoon}
      title={w.comingSoon ? 'Coming in a future update' : `Add ${w.label}`}
      class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface
             shrink-0
             transition-all duration-150
             {w.comingSoon
               ? 'opacity-30 cursor-not-allowed'
               : 'hover:bg-surface-container-lowest hover:shadow-ambient-sm cursor-pointer active:scale-[0.98]'
             }"
      class:justify-center={collapsed}
    >
      <w.icon class="w-4 h-4 {w.comingSoon ? 'text-muted-foreground' : 'text-primary'}" />
      <span class="font-medium whitespace-nowrap" class:hidden={collapsed}>{w.label}</span>
      {#if w.comingSoon}
        <span class="ml-auto text-[10px] text-muted-foreground" class:hidden={collapsed}>Soon</span>
      {/if}
    </button>
  {/each}
</aside>
