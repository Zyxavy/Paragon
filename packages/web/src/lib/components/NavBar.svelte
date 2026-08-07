<script lang="ts">
  import { page } from '$app/stores';
  import { authClient } from '$lib/auth-client';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Cog from '@lucide/svelte/icons/cog';
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
  import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
  import type { Component } from 'svelte';
  import UserCircle from '@lucide/svelte/icons/user-circle';

  let { session, collapsed, ontoggle }: {
    session: any;
    collapsed: boolean;
    ontoggle: () => void;
  } = $props();

  let active = $derived($page.url.pathname);

  interface NavItem {
    label: string;
    href: string;
    icon: Component;
  }

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Systems', href: '/systems', icon: Cog },
    { label: 'Review Day', href: '/review-day', icon: ClipboardCheck },
    { label: 'Guides', href: '/guides', icon: BookOpen },
    { label: 'Account', href: '/account', icon: UserCircle },
  ];

</script>

<nav
  class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 xl:hidden
         h-14 px-6 flex items-center gap-6 sm:gap-8
         bg-surface/70 backdrop-blur-xl rounded-full
         shadow-ambient-lg transition-shadow duration-200"
>
  {#each navItems as item}
    <a
      href={item.href}
      data-sveltekit-preload-code="hover"
      class="flex items-center gap-1.5 font-body text-sm
             transition-colors duration-150
             {active.startsWith(item.href)
               ? 'text-primary font-semibold'
               : 'text-muted-foreground hover:text-on-surface'}"
      aria-current={active.startsWith(item.href) ? 'page' : undefined}
    >
      <item.icon class="w-4 h-4" />
      <span class="hidden sm:inline">{item.label}</span>
    </a>
  {/each}

</nav>

<aside
  class="hidden xl:flex fixed left-0 top-0 h-screen
         bg-surface-container-low flex-col justify-between z-40
         transition-all duration-300 ease-in-out overflow-hidden"
  class:w-16={collapsed}
  class:w-48={!collapsed}
>
  <div class="flex flex-col gap-1 min-w-48 p-6">
    <div class="flex items-center justify-between mb-6">
      <a href="/dashboard" class="flex items-center gap-2 no-underline" aria-label="Paragon dashboard">
        <img src="/apple-touch-icon.png" alt="Paragon" class="w-8 h-8 rounded-xl shrink-0" />
        <span class="font-display font-semibold text-primary text-lg" class:hidden={collapsed}>Paragon</span>
      </a>
      <button
        onclick={ontoggle}
        class="text-muted-foreground hover:text-on-surface transition-colors cursor-pointer bg-transparent border-none p-1 rounded"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {#if collapsed}
          <PanelRightOpen class="w-4 h-4" />
        {:else}
          <PanelRightClose class="w-4 h-4" />
        {/if}
      </button>
    </div>
    {#each navItems.filter(n => n.href !== '/account') as item}
      <a
        href={item.href}
        data-sveltekit-preload-code="hover"
        class="flex items-center gap-2 px-3 py-2 rounded-lg font-body text-sm
               transition-colors duration-150
               {active.startsWith(item.href)
                 ? 'bg-primary/10 text-primary font-semibold'
                 : 'text-muted-foreground hover:text-on-surface hover:bg-muted'}"
        class:justify-center={collapsed}
        aria-current={active.startsWith(item.href) ? 'page' : undefined}
      >
        <item.icon class="w-4 h-4 shrink-0" />
        <span class:hidden={collapsed}>{item.label}</span>
      </a>
    {/each}
  </div>

  <div class="flex flex-col gap-1 pt-4 min-w-48 p-6">
    <span class="font-body text-xs text-muted-foreground truncate pb-1" class:hidden={collapsed} class:px-3={!collapsed}>{session?.user?.email}</span>
    <a
      href="/account"
      data-sveltekit-preload-code="hover"
      class="flex items-center gap-2 px-3 py-2 rounded-lg font-body text-sm
             transition-colors duration-150
             {active.startsWith('/account')
               ? 'bg-primary/10 text-primary font-semibold'
               : 'text-muted-foreground hover:text-on-surface hover:bg-muted'}"
      class:justify-center={collapsed}
    >
      <UserCircle class="w-4 h-4 shrink-0" />
      <span class:hidden={collapsed}>Account</span>
    </a>
    <button
      onclick={async () => { await authClient.signOut(); window.location.href = '/'; }}
      class="text-left text-sm text-muted-foreground hover:text-on-surface px-3 py-2 rounded-lg font-body
             transition-colors duration-150 hover:bg-muted cursor-pointer w-full"
      class:hidden={collapsed}
    >
      Sign out
    </button>
  </div>
</aside>
