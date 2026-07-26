<script lang="ts">
    import { getTemplates } from '$lib/api/templates';
    import type { Template } from '$lib/api/templates';

    let { ontemplateSelect }: { ontemplateSelect?: (t: Template) => void } = $props();
    let templates = $state<Template[]>([]);
    let loading = $state(true);

    $effect(() => {
        getTemplates().then(res => {
            templates = res.templates;
            loading = false;
        }).catch(() => { loading = false; });
    });
</script>

<details class="mb-6 group">
    <summary class="cursor-pointer font-body text-sm font-semibold text-primary
                    hover:text-primary/80 transition-colors">
        Use a template
    </summary>
    <div class="mt-3">
        {#if loading}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="h-24 rounded-2xl bg-surface-container-lowest animate-pulse"></div>
                <div class="h-24 rounded-2xl bg-surface-container-lowest animate-pulse"></div>
                <div class="h-24 rounded-2xl bg-surface-container-lowest animate-pulse"></div>
            </div>
        {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each templates as tpl}
                    <button
                        type="button"
                        onclick={() => ontemplateSelect?.(tpl)}
                        class="text-left rounded-2xl bg-surface-container-lowest shadow-ambient-sm p-4
                               transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                               cursor-pointer"
                    >
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-display font-semibold text-on-surface text-sm">{tpl.name}</span>
                            {#if tpl.source === 'built_in'}
                                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-body">built-in</span>
                            {/if}
                        </div>
                        <p class="text-xs text-on-surface-muted font-body line-clamp-2">
                            {tpl.default_floor_action || tpl.default_purpose}
                        </p>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</details>