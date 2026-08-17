<script lang="ts">
  import { WorkspaceEditorStore } from '$lib/stores/workspace-editor.svelte';
  import WidgetPalette from '$lib/components/WidgetPalette.svelte';
  import WorkspaceCanvas from '$lib/components/WorkspaceCanvas.svelte';
  import SaveBar from '$lib/components/SaveBar.svelte';
  import { CalendarX } from '@lucide/svelte';

  let { data } = $props();

  let store = new WorkspaceEditorStore();

  // Load data is present synchronously at init in this CSR app, so seed the
  // store before the first render instead of copying data in an effect.
  // svelte-ignore state_referenced_locally
  store.load(data.systemId, data.layout);

  // The component instance is reused when navigating between
  // /systems/[id]/workspace pages, so re-ingest only when the system changes.
  $effect(() => {
    if (store.systemId !== data.systemId) {
      store.load(data.systemId, data.layout);
    }
  });
</script>

{#if !data.instanceId && store.layout.widgets.length > 0}
    <div class="flex items-start gap-2.5 rounded-xl bg-secondary/10 text-secondary px-4 py-3 mb-4">
      <CalendarX class="w-4 h-4 mt-0.5 shrink-0" />
      <p class="font-body text-xs leading-relaxed">
        No instance for today, so daily widgets are inactive.
        <a href={`/systems/${data.systemId}/edit`} class="font-semibold underline hover:opacity-80">Add a schedule</a>
        to this system to generate daily instances.
      </p>
    </div>
  {/if}
  <div class="flex flex-col lg:flex-row gap-4">
    <WidgetPalette onAdd={(t) => store.addWidget(t)} />
    <div class="flex-1">
      <WorkspaceCanvas
        widgets={store.layout.widgets}
        instanceId={data.instanceId}
        workspaceId={data.workspaceId}
        systemId={data.systemId}
        onMove={(id, x, y) => store.moveWidget(id, x, y)}
        onResize={(id, w, h) => store.resizeWidget(id, w, h)}
        onRemove={(id) => store.removeWidget(id)}
      />
    </div>
  </div>
  <SaveBar dirty={store.dirty} onSave={() => store.save()} />
