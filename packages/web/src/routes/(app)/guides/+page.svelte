<script lang="ts">
  import { fly } from 'svelte/transition';
  import { ExternalLink } from '@lucide/svelte';

  const guides = [
    {
      number: 1,
      title: 'The Systems Framework',
      description:
        'A Paragon system is built from six parts: domain, purpose, philosophy, protocol, floor action, and trigger, plus barriers and environment cues that shape when and how you act.',
      detail: [
        "Domain: the area of life (Study, Health, Creative)",
        "Floor Action: the smallest version that still counts as a win",
        "Trigger: what tells you it's time to act",
        "Barriers: what typically stops you",
        "Environment Cue: how your space reminds you",
      ],
    },
    {
      number: 2,
      title: 'Types of Sources',
      description:
        'Inspiration for a system can come from anywhere, a book you read, a conversation, a problem you keep running into, or a habit you already have that could use some structure.',
      detail: [
        'Existing routines: formalize what already works',
        'Pain points: build a system for the thing you keep forgetting',
        'Role models: adapt what others do to your own context',
        'Experiments: try a floor action for one week, then adjust',
      ],
    },
    {
      number: 3,
      title: 'Tips & Insights',
      description:
        "Systems work best when they're forgiving. A missed day isn't a failure, it's data. Lower the floor action until it feels too easy, then do that.",
      detail: [
        'Start smaller than you think you need',
        'Review weekly: what worked, what broke, what changed',
        'The floor action is a promise to yourself, keep it keepable',
        'Environment > willpower every time',
      ],
    },
  ];

  const sources = [
    { number: 1, title: 'How To Set Systems Instead Of Goals', creator: '', url: 'https://www.youtube.com/watch?v=hyUr5E_xwjk' },
    { number: 2, title: 'How to Build Systems to Actually Achieve Your Goals', creator: 'Dr. Justin Sung', url: 'https://www.youtube.com/watch?v=fXyRprdoEoE' },
    { number: 3, title: 'Productivity is Hard Until You Build Systems Like This', creator: 'Dr. Justin Sung', url: 'https://www.youtube.com/watch?v=AeV5F0ppaGw' },
    { number: 4, title: 'Success Is Hard Until You Build Systems Like This', creator: 'Ali Abdaal', url: 'https://www.youtube.com/watch?v=MBPHU7aaklM' },
    { number: 5, title: 'How to Build Systems (with AI) to ACTUALLY Achieve Your Goals', creator: 'Dan Martell', url: 'https://www.youtube.com/watch?v=y5jL8KsUwaI' },
    { number: 6, title: 'How to Create Systems in Your Life', creator: '', url: 'https://www.youtube.com/watch?v=e-hhoaTi2T0' },
    { number: 7, title: 'Success Is Hard Until You Build Systems Like This', creator: 'MIT Monk', url: 'https://www.youtube.com/watch?v=p3F-1QyvHnY' },
    { number: 8, title: 'Success Is Hard Until You Build Systems Like This', creator: 'Matt Gray', url: 'https://youtu.be/iemuHxed0nY' },
  ];
</script>

<div class="max-w-3xl mx-auto px-6 py-12">
  {#each guides as guide, i}
    <article
      class="bg-surface-container-lowest rounded-xl p-6 shadow-ambient-sm
             transition-shadow duration-200 hover:shadow-ambient-md
             {i > 0 ? 'mt-8' : ''}"
      transition:fly={{ y: 20, duration: 400, delay: i * 100, opacity: 0 }}
    >
      <div class="flex items-start gap-4">
        <span
          class="w-8 h-8 rounded-lg bg-blush/20 text-blush
                 flex items-center justify-center font-display text-sm font-semibold shrink-0"
        >
          {guide.number}
        </span>
        <div class="flex-1">
          <h2 class="font-body text-lg font-semibold text-on-surface mb-2">{guide.title}</h2>
          <p class="font-body text-sm text-muted-foreground mb-3">{guide.description}</p>
          <ul class="flex flex-col gap-1">
            {#each guide.detail as point}
              <li class="font-body text-xs text-muted-foreground flex items-start gap-2">
                <span class="text-blush mt-0.5">&bull;</span>
                {point}
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </article>
  {/each}

  <div class="mt-12">
    <h2 class="font-display text-xl font-semibold text-on-surface mb-4">Sources</h2>
    <p class="font-body text-sm text-muted-foreground mb-6 max-w-2xl">
      These are the creators and frameworks the Paragon guides are built on.
    </p>
    <div class="flex flex-col gap-3">
      {#each sources as source}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-4 bg-surface-container-lowest rounded-xl p-4 shadow-ambient-sm
                 transition-shadow duration-200 hover:shadow-ambient-md no-underline"
        >
          <span
            class="w-8 h-8 rounded-lg bg-blush/20 text-blush
                   flex items-center justify-center font-display text-sm font-semibold shrink-0"
          >
            {source.number}
          </span>
          <span class="flex-1 min-w-0">
            <span class="block font-body text-sm font-semibold text-on-surface truncate">{source.title}</span>
            {#if source.creator}
              <span class="block font-body text-xs text-muted-foreground">{source.creator}</span>
            {/if}
          </span>
          <ExternalLink class="w-4 h-4 text-muted-foreground shrink-0" />
        </a>
      {/each}
    </div>
  </div>

  <div class="mt-12 bg-surface-container-low rounded-xl p-8 text-center">
    <h2 class="font-display text-xl font-semibold text-on-surface mb-3">Ready to start?</h2>
    <p class="font-body text-sm text-muted-foreground mb-6 max-w-md mx-auto text-balance">
      Skip the guides and build your first system right now.
    </p>
    <a
      href="/systems/new"
      class="inline-block bg-gradient-to-br from-primary to-primary-container text-on-primary
             px-8 py-3 rounded-2xl font-semibold text-sm
             transition-all duration-200 hover:opacity-90 active:scale-[0.98]
             cursor-pointer"
    >
      Create your first system
    </a>
  </div>
</div>
