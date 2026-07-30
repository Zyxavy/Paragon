<script lang="ts">
  import SystemForm from '$lib/components/SystemForm.svelte';
  import { ArrowLeft } from '@lucide/svelte';

  let { data } = $props();
</script>

<div class="max-w-3xl mx-auto px-6 py-8">
  <div class="mb-10">
    <div class="flex items-center gap-3 mb-1">
      <a href="/systems/{data.system.id}" class="text-muted-foreground hover:text-on-surface transition-colors">
        <ArrowLeft class="w-4 h-4" />
      </a>
      <h1 class="font-display text-2xl font-semibold text-on-surface">Edit {data.system.name}</h1>
    </div>
    <p class="font-body text-sm text-muted-foreground mt-1 ml-7">
      Changes are saved automatically. Review before saving.
    </p>
  </div>

  <SystemForm system={data.system} edit />
</div>
