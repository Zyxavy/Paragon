<script lang="ts">
    import { putChecklist, getChecklist } from '$lib/api/checklist';
    import type { ChecklistStep } from '$lib/api/checklist';
    import type { Widget } from '$lib/api/workspaces';

    let { widget, instanceId }: { widget: Widget; instanceId: string | null } = $props();

    const widgetId = (() => widget.id)();

    let steps = $state<ChecklistStep[]>([]);
    let loaded = $state(false);
    let saving = $state(false);
    let fetchSeq = 0;

    $effect(() => {
        if (instanceId) loadChecklist();
    });

    async function loadChecklist() {
        const seq = ++fetchSeq;
        try {
            const res = await getChecklist(instanceId!, widgetId);
            if (seq !== fetchSeq) return;
            steps = res.steps;
        } catch {
            // network error — show empty state
        } finally {
            if (seq === fetchSeq) loaded = true;
        }
    }

    async function toggleStep(index: number) {
        if (!instanceId || saving) return;
        const newSteps = steps.map((s, i) => i === index ? { ...s, checked: !s.checked } : s);
        steps = newSteps;
        saving = true;
        try {
            await putChecklist(instanceId, widgetId, newSteps);
        } catch {
            steps = steps.map((s, i) => i === index ? { ...s, checked: !s.checked } : s);
        } finally {
            saving = false;
        }
    }
</script>

{#if !instanceId}
    <p class="text-sm text-on-container/70 text-center py-4">No instance today — add a schedule</p>
{:else if !loaded}
    <p class="text-sm text-on-container/70 text-center py-4">Loading...</p>
{:else if steps.length === 0}
    <div class="flex flex-col items-center gap-2 py-4">
        <p class="text-xs text-on-container/70">No checklist items</p>
        <p class="text-xs text-on-container/70">Configure steps in the widget settings</p>
    </div>
{:else}
    <div class="flex flex-col gap-1 py-1">
        {#each steps as step, i (i)}
            <label class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer">
                <input
                    type="checkbox"
                    checked={step.checked}
                    onchange={() => toggleStep(i)}
                    disabled={saving}
                    class="accent-primary w-4 h-4 rounded cursor-pointer"
                />
                <span class="text-sm font-body text-on-container {step.checked ? 'line-through text-on-container/70' : ''}">
                    {step.label}
                </span>
            </label>
        {/each}
    </div>
{/if}