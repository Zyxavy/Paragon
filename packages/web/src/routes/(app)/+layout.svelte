<script lang="ts">
  import NavBar from '$lib/components/NavBar.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  let { children, data } = $props();

  let sidebarCollapsed = $state(false);
  let isXl = $state(false);

  $effect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('sidebar-collapsed') : null;
    if (stored === 'true') sidebarCollapsed = true;

    const mq = window.matchMedia('(min-width: 1280px)');
    isXl = mq.matches;
    const handler = (e: MediaQueryListEvent) => isXl = e.matches;
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }
</script>

<NavBar session={data.session} collapsed={sidebarCollapsed} ontoggle={toggleSidebar} />
<ToastContainer />
<main
  class="max-w-7xl mx-auto px-6 pt-8 pb-[var(--nav-bottom-offset)] xl:pb-8"
  style="min-height: 100dvh;
         margin-left: {isXl ? (sidebarCollapsed ? '4rem' : '12rem') : '0'};"
>
  {@render children()}
</main>
