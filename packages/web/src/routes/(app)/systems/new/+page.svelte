<script lang="ts">
  import SystemForm from '$lib/components/SystemForm.svelte';
  import TemplatePicker from '$lib/components/TemplatePicker.svelte';
  import AIDraftPanel from '$lib/components/AIDraftPanel.svelte';
  import ImportPanel from '$lib/components/ImportPanel.svelte';
  import type { Template } from '$lib/api/templates';
  import type { SystemDraft } from '$lib/api/ai';

  interface SystemFormDefaults {
    name?: string;
    purpose?: string;
    philosophy?: string;
    protocol?: string | string[];
    floor_action?: string;
    trigger?: string;
    barrier_list?: string[];
    environment_cue?: string;
    domain?: string;
    reference_table?: string;
    success_metric?: string;
  }

  let formDefaults = $state<SystemFormDefaults | undefined>(undefined);

  function onTemplateSelect(tpl: Template) {
    formDefaults = {
      name: tpl.name,
      purpose: tpl.default_purpose,
      philosophy: tpl.default_philosophy,
      protocol: tpl.default_protocol,
      floor_action: tpl.default_floor_action,
      trigger: tpl.default_trigger_pattern,
      barrier_list: tpl.default_barrier_list,
      environment_cue: tpl.default_environment_cue,
    };
  }

  function onAIDraft(draft: SystemDraft) {
    formDefaults = { ...draft };
  }

  function onImport(draft: SystemDraft) {
    formDefaults = { ...draft };
  }
</script>

<div class="max-w-3xl mx-auto px-6 py-8">
  <div class="mb-10">
    <h1 class="font-display text-2xl font-semibold text-on-surface">Create a system</h1>
    <p class="font-body text-sm text-muted-foreground mt-1">
      Define a repeatable process that works even on your worst day.
    </p>
  </div>

  <TemplatePicker ontemplateSelect={onTemplateSelect} />
  <AIDraftPanel ondraft={onAIDraft} />
  <ImportPanel onimport={onImport} />
  <SystemForm defaults={formDefaults} />
</div>
