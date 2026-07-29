<script lang="ts">
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Cog from '@lucide/svelte/icons/cog';
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import Repeat from '@lucide/svelte/icons/repeat';
  import Sparkles from '@lucide/svelte/icons/sparkles';
</script>

<section class="min-h-dvh bg-surface flex flex-col">
  <header class="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
    <a href="/" class="flex items-center gap-2.5 font-display text-lg font-semibold text-primary no-underline">
      <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary text-sm font-bold">P</span>
      Paragon
    </a>
    <a href="/sign-in" class="font-body text-sm text-muted-foreground hover:text-on-surface transition-colors duration-150 no-underline">Log in</a>
  </header>

  <div class="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto w-full">
    <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-body font-medium text-primary mb-8">
      <Sparkles class="w-3 h-3" />
      A personal systems builder
    </div>

    <h1 class="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-on-surface leading-[0.92] tracking-tight max-w-3xl text-balance">
      Systems that work<br />
      <span class="text-primary">on your worst day</span>
    </h1>

    <p class="font-body text-lg text-muted-foreground max-w-lg mt-6 text-balance leading-relaxed">
      A tool for designing repeatable processes that produce results without depending on daily motivation.
    </p>

    <div class="flex items-center gap-4 mt-10">
      <a href="/sign-up"
         class="bg-gradient-to-br from-primary to-primary-container text-on-primary
                px-8 py-3.5 rounded-2xl font-body font-semibold text-sm
                transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                cursor-pointer no-underline">
        Get started free
      </a>
      <a href="/sign-in"
         class="font-body text-sm text-muted-foreground hover:text-on-surface transition-colors duration-150 px-6 py-3.5 rounded-2xl no-underline">
        Sign in
      </a>
    </div>
  </div>

  <div class="max-w-5xl mx-auto w-full px-6 pb-20">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient-sm">
        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <LayoutDashboard class="w-5 h-5" />
        </div>
        <h3 class="font-body text-base font-semibold text-on-surface mb-1.5">Design a system</h3>
        <p class="font-body text-sm text-muted-foreground leading-relaxed">Name its purpose, set a floor action you can always hit, and schedule when it runs.</p>
      </div>
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient-sm">
        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <ClipboardCheck class="w-5 h-5" />
        </div>
        <h3 class="font-body text-base font-semibold text-on-surface mb-1.5">Execute daily</h3>
        <p class="font-body text-sm text-muted-foreground leading-relaxed">Instances appear automatically. Mark full, floor, or missed — no decisions, just data.</p>
      </div>
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient-sm">
        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Repeat class="w-5 h-5" />
        </div>
        <h3 class="font-body text-base font-semibold text-on-surface mb-1.5">Review & refine</h3>
        <p class="font-body text-sm text-muted-foreground leading-relaxed">Weekly reviews capture what broke and what changed. The system evolves with you.</p>
      </div>
    </div>
  </div>

  <footer class="py-6 text-center border-t border-border/30">
    <span class="font-body text-xs text-muted-foreground">Paragon &middot; systems for people, not productivity</span>
  </footer>
</section>
