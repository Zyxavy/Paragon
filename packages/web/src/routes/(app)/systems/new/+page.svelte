<script lang="ts">
    import SystemForm from '$lib/components/SystemForm.svelte';
    import TemplatePicker from '$lib/components/TemplatePicker.svelte';
    import type { Template } from '$lib/api/templates';

    let templateDefaults = $state<{ [key: string]: any } | undefined>(undefined);

    function onTemplateSelect(tpl: Template) {
        templateDefaults = {
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
</script>

<div class="w-full md:max-w-2xl lg:max-w-3xl mx-auto px-4 md:px-0">
    <h1 class="font-display text-2xl text-on-surface mb-6">Create System</h1>
    <TemplatePicker ontemplateSelect={onTemplateSelect} />
    <SystemForm defaults={templateDefaults} />
</div>