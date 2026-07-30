<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import Repeat from '@lucide/svelte/icons/repeat';
  import Target from '@lucide/svelte/icons/target';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import Layers from '@lucide/svelte/icons/layers';
  import CheckCircle from '@lucide/svelte/icons/check-circle';

  const days = [
    { state: 'full', label: 'Full' },
    { state: 'full', label: 'Full' },
    { state: 'floor', label: 'Floor' },
    { state: 'floor', label: 'Floor' },
    { state: 'full', label: 'Full' },
    { state: 'full', label: 'Full' },
    { state: 'floor', label: 'Floor' },
    { state: 'full', label: 'Full' },
    { state: 'floor', label: 'Floor' },
    { state: 'full', label: 'Full' },
    { state: 'full', label: 'Full' },
  ];

  function reveal(node: HTMLElement) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('revealed');
          observer.unobserve(node);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(node);
    return {
      destroy() { observer.disconnect(); }
    };
  }

  function stagger(node: HTMLElement) {
    const children = node.querySelectorAll('[data-stagger]');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          children.forEach((child, i) => {
            (child as HTMLElement).style.transitionDelay = `${i * 120}ms`;
            child.classList.add('revealed');
          });
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return {
      destroy() { observer.disconnect(); }
    };
  }
</script>

<div class="bg-surface">
  <!-- Nav -->
  <nav class="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border/20">
    <div class="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
      <a href="/" class="flex items-center gap-2.5 font-display text-lg font-semibold text-primary no-underline">
        <img src="/apple-touch-icon.png" alt="Paragon" class="w-8 h-8 rounded-xl" />
        Paragon
      </a>
      <div class="flex items-center gap-3">
        <a href="/sign-in" class="font-body text-sm font-medium text-muted-foreground hover:text-on-surface transition-colors duration-200 no-underline px-4 py-2">Log in</a>
        <a href="/sign-up" class="font-body text-sm font-semibold text-on-primary bg-gradient-to-br from-primary to-primary-container px-5 py-2 rounded-2xl transition-all duration-200 hover:opacity-90 active:scale-[0.98] no-underline">Get started</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="min-h-dvh flex flex-col pt-24 md:pt-28">
    <div class="flex-1 flex flex-col justify-center px-6 max-w-6xl mx-auto w-full">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <!-- Left: text -->
        <div class="flex flex-col items-start text-left">
          <div class="animate-fade-up [animation-delay:200ms] opacity-0" style="animation-fill-mode: both;">
          </div>

          <h1 class="mt-8 animate-fade-up [animation-delay:400ms] opacity-0 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-on-surface leading-[0.9] tracking-tight max-w-3xl" style="animation-fill-mode: both;">
            Systems that work<br />
            <span class="text-primary">on your worst day</span>
          </h1>

          <p class="mt-6 animate-fade-up [animation-delay:600ms] opacity-0 font-body text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed" style="animation-fill-mode: both;">
            A tool for designing repeatable processes that survive real life.
          </p>

          <div class="mt-10 animate-fade-up [animation-delay:800ms] opacity-0 flex flex-col sm:flex-row items-start gap-4" style="animation-fill-mode: both;">
            <a href="/sign-up"
               class="inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-3.5 rounded-2xl font-body font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer no-underline">
              Get started free
            </a>
          </div>
        </div>

        <!-- Right: floor-action hero visual -->
        <div class="animate-fade-up [animation-delay:1000ms] opacity-0" style="animation-fill-mode: both;">
          <div class="flex flex-col items-start gap-4">
            <div class="flex items-end justify-start gap-2 sm:gap-3 h-20 sm:h-24 md:h-28 w-full">
              {#each days as day, i}
                <div class="relative flex flex-col items-center justify-end" style="animation-delay: {i * 100}ms;">
                  <div class="pill-dot rounded-full transition-all duration-1000 ease-out {day.state === 'full' ? 'bg-primary w-4 sm:w-5 md:w-6 h-10 sm:h-12 md:h-16' : 'bg-blush w-3 sm:w-4 md:w-5 h-6 sm:h-7 md:h-9'}"></div>
                  <span class="mt-2 font-body text-[10px] sm:text-xs font-medium {day.state === 'full' ? 'text-primary' : 'text-blush'}">{day.label}</span>
                </div>
              {/each}
            </div>
            <span class="font-body text-xs text-muted-foreground/60 tracking-wider uppercase">12 consecutive days, no breaks</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Insight: the difference -->
  <section use:reveal class="py-20 md:py-28 px-6 reveal-section">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16">
        <span class="font-body text-xs font-semibold text-primary tracking-widest uppercase">The insight</span>
        <h2 class="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface leading-tight text-balance max-w-3xl mx-auto">
          Habit trackers break on bad days.<br />
          <span class="text-primary">Systems adjust.</span>
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div class="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient-sm border border-border/20">
          <div class="flex items-center gap-3 mb-6">
            <span class="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <TrendingUp class="w-5 h-5" />
            </span>
            <span class="font-body text-sm font-semibold text-on-surface">The streak model</span>
          </div>
          <div class="flex items-end gap-1.5 sm:gap-2 h-24 sm:h-28 mb-4">
            {#each [1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1] as val}
              <div
                class="w-4 sm:w-5 md:w-6 rounded-t-md transition-all duration-500 {val === 1 ? 'bg-primary/60' : 'bg-destructive/30'}"
                style="height: {val === 1 ? 60 + Math.random() * 40 : 10}%;"></div>
            {/each}
          </div>
          <p class="font-body text-sm text-muted-foreground leading-relaxed">
            One missed day resets everything. The pressure to maintain a streak makes every gap feel like failure, and failure makes it harder to start again.
          </p>
        </div>

        <div class="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient-sm border border-primary/10">
          <div class="flex items-center gap-3 mb-6">
            <span class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers class="w-5 h-5" />
            </span>
            <span class="font-body text-sm font-semibold text-on-surface">The system model</span>
          </div>
          <div class="flex items-end gap-1.5 sm:gap-2 h-24 sm:h-28 mb-4">
            {#each [1, 0.9, 0.4, 0.3, 0.8, 1, 0.5, 0.3, 1, 0.9, 1, 1, 0.4, 0.8] as val}
              <div
                class="w-4 sm:w-5 md:w-6 rounded-t-md transition-all duration-500 {val >= 0.7 ? 'bg-primary' : 'bg-blush'}"
                style="height: {val * 100}%;"></div>
            {/each}
          </div>
          <p class="font-body text-sm text-muted-foreground leading-relaxed">
            Every day counts, no matter the intensity. A floor action keeps the system alive on low-energy days. The baseline never resets, you build on everything.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section use:reveal class="py-20 md:py-28 px-6 reveal-section">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16">
        <span class="font-body text-xs font-semibold text-primary tracking-widest uppercase">How it works</span>
        <h2 class="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface leading-tight text-balance">
          Design, execute, and refine<br />
          <span class="text-primary">in one loop</span>
        </h2>
      </div>

      <div use:stagger class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5">
        <div data-stagger class="relative bg-surface-container-lowest rounded-2xl p-8 shadow-ambient-sm border border-border/20 opacity-0 translate-y-6 transition-all duration-700 ease-out hover:shadow-ambient-md">
          <span class="font-display text-6xl font-bold text-primary/10 absolute top-4 right-6 leading-none">01</span>
          <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <LayoutDashboard class="w-5 h-5" />
          </div>
          <h3 class="font-body text-lg font-semibold text-on-surface mb-2">Design a system</h3>
          <p class="font-body text-sm text-muted-foreground leading-relaxed">
            Name its purpose, set a floor action you can always hit, and schedule when it runs. The floor is the minimum version that counts as a win.
          </p>
        </div>

        <div data-stagger class="relative bg-surface-container-lowest rounded-2xl p-8 shadow-ambient-sm border border-border/20 opacity-0 translate-y-6 transition-all duration-700 ease-out hover:shadow-ambient-md">
          <span class="font-display text-6xl font-bold text-primary/10 absolute top-4 right-6 leading-none">02</span>
          <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <ClipboardCheck class="w-5 h-5" />
          </div>
          <h3 class="font-body text-lg font-semibold text-on-surface mb-2">Execute daily</h3>
          <p class="font-body text-sm text-muted-foreground leading-relaxed">
            Instances appear automatically. Mark full, floor, or missed, no decisions, just data. The system never asks if you feel like it.
          </p>
        </div>

        <div data-stagger class="relative bg-surface-container-lowest rounded-2xl p-8 shadow-ambient-sm border border-border/20 opacity-0 translate-y-6 transition-all duration-700 ease-out hover:shadow-ambient-md">
          <span class="font-display text-6xl font-bold text-primary/10 absolute top-4 right-6 leading-none">03</span>
          <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <Repeat class="w-5 h-5" />
          </div>
          <h3 class="font-body text-lg font-semibold text-on-surface mb-2">Review &amp; refine</h3>
          <p class="font-body text-sm text-muted-foreground leading-relaxed">
            Weekly reviews capture what broke and what changed. Every review produces an edit, the system evolves with you, not against you.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Floor action detail -->
  <section use:reveal class="py-20 md:py-28 px-6 reveal-section">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16">
        <span class="font-body text-xs font-semibold text-primary tracking-widest uppercase">The mechanism</span>
        <h2 class="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface leading-tight text-balance max-w-3xl mx-auto">
          A floor you can<br />
          <span class="text-primary">always hit</span>
        </h2>
      </div>

      <div class="bg-surface-container-lowest rounded-3xl p-8 md:p-12 shadow-ambient-sm border border-border/20">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <div class="flex items-center gap-3 mb-6">
              <span class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Target class="w-5 h-5" />
              </span>
              <div>
                <h3 class="font-body text-base font-semibold text-on-surface">The floor action</h3>
                <p class="font-body text-xs text-muted-foreground">The heart of the system</p>
              </div>
            </div>
            <p class="font-body text-sm text-muted-foreground leading-relaxed mb-5">
              Every system has a floor: the minimum version that counts as a win. Not the ideal version, the version that's achievable when you're tired, distracted, or running on empty.
            </p>
            <p class="font-body text-sm text-muted-foreground leading-relaxed mb-6">
              Bad day? Hit the floor. Great day? Go full. The system never skips, it adjusts. A floor completion earns the same continuity as a full one.
            </p>
            <div class="flex items-center gap-2 text-primary">
              <CheckCircle class="w-4 h-4" />
              <span class="font-body text-sm font-semibold">The system works on your worst day, or it doesn't ship.</span>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="bg-surface rounded-xl p-5 border border-border/20">
              <div class="flex items-center justify-between mb-2">
                <span class="font-body text-xs font-semibold text-on-surface">Full day</span>
                <span class="rounded-full bg-primary/10 text-primary text-[10px] font-body font-semibold px-2.5 py-0.5">100%</span>
              </div>
              <p class="font-body text-xs text-muted-foreground">Full protocol executed. The ideal version of this system at its best.</p>
            </div>
            <div class="bg-surface rounded-xl p-5 border border-primary/10">
              <div class="flex items-center justify-between mb-2">
                <span class="font-body text-xs font-semibold text-on-surface">Floor day</span>
                <span class="rounded-full bg-blush/20 text-blush text-[10px] font-body font-semibold px-2.5 py-0.5">Minimum</span>
              </div>
              <p class="font-body text-xs text-muted-foreground">Floor action completed. The system stays alive. It counts, meaningfully.</p>
            </div>
            <div class="bg-surface rounded-xl p-5 border border-border/20">
              <div class="flex items-center justify-between mb-2">
                <span class="font-body text-xs font-semibold text-on-surface">Missed day</span>
                <span class="rounded-full bg-destructive/10 text-destructive text-[10px] font-body font-semibold px-2.5 py-0.5">Rare</span>
              </div>
              <p class="font-body text-xs text-muted-foreground">Logged transparently. No streak penalty. Tomorrow is a new instance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section use:reveal class="py-20 md:py-28 px-6 reveal-section">
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface leading-tight text-balance">
        Start designing<br />
        <span class="text-primary">your systems</span>
      </h2>
      <p class="mt-5 font-body text-base md:text-lg text-muted-foreground max-w-lg mx-auto text-balance leading-relaxed">
        No streaks to protect. No motivation required. Just your next floor action.
      </p>
      <a href="/sign-up"
         class="mt-10 inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-10 py-4 rounded-2xl font-body font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] cursor-pointer no-underline shadow-ambient-md">
        Get started free
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-8 px-6 text-center border-t border-border/20">
    <span class="font-body text-xs text-muted-foreground/60">Paragon &middot; systems for people, not productivity</span>
  </footer>
</div>

<style>
  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.animate-fade-up) {
    animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes pulse-soft {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }

  :global(.pill-dot) {
    animation: pulse-soft 3s ease-in-out infinite;
  }

  :global(.pill-dot:nth-child(odd)) {
    animation-delay: 0.5s;
  }

  :global(.pill-dot:nth-child(3n)) {
    animation-delay: 1s;
  }

  :global(.reveal-section) {
    opacity: 0;
    transform: translateY(40px);
    transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  }

  :global(.reveal-section.revealed) {
    opacity: 1;
    transform: translateY(0);
  }

  :global([data-stagger].revealed) {
    opacity: 1;
    transform: translateY(0);
  }
</style>
