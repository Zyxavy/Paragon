<script lang="ts">
    import Modal from './Modal.svelte';

    let { value, onchange, label }: {
        value: string;
        onchange: (v: string) => void;
        label: string;
    } = $props();

    let open = $state(false);
    let draftHour = $state(9);
    let draftMinute = $state(0);

    const HOURS = Array.from({ length: 24 }, (_, i) => i);
    const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

    function format(h: number, m: number): string {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function openPicker() {
        const [h, m] = value ? value.split(':').map(Number) : [9, 0];
        draftHour = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 9;
        draftMinute = Number.isFinite(m) && m >= 0 && m < 60 ? m : 0;
        open = true;
    }

    function apply() {
        onchange(format(draftHour, draftMinute));
        open = false;
    }
</script>

<button
    type="button"
    class="block w-full rounded-md border border-border bg-surface text-on-surface px-3 py-2 text-sm font-body tabular-nums text-left hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
    aria-label={`${label}: ${value || 'select time'}`}
    onclick={openPicker}
>
    {value || 'Select'}
</button>

<Modal open={open} title={label} onclose={() => (open = false)}>
    <div class="flex gap-4">
        <div>
            <p class="text-xs font-body text-on-surface-muted mb-1">Hour</p>
            <div class="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto pr-1">
                {#each HOURS as hour}
                    <button
                        type="button"
                        onclick={() => (draftHour = hour)}
                        class="rounded-md px-2 py-1 text-sm font-body tabular-nums cursor-pointer
                               {draftHour === hour ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-lowest'}"
                    >
                        {String(hour).padStart(2, '0')}
                    </button>
                {/each}
            </div>
        </div>
        <div>
            <p class="text-xs font-body text-on-surface-muted mb-1">Minute</p>
            <div class="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
                {#each MINUTES as minute}
                    <button
                        type="button"
                        onclick={() => (draftMinute = minute)}
                        class="rounded-md px-2 py-1 text-sm font-body tabular-nums cursor-pointer
                               {draftMinute === minute ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-lowest'}"
                    >
                        {String(minute).padStart(2, '0')}
                    </button>
                {/each}
            </div>
        </div>
    </div>
    <p class="mt-3 text-sm font-body tabular-nums text-on-surface">
        Selected: <span class="font-semibold">{format(draftHour, draftMinute)}</span>
    </p>
    <div class="flex justify-end gap-2 mt-4">
        <button
            type="button"
            onclick={() => (open = false)}
            class="rounded-xl border border-border text-on-surface px-4 py-2 text-sm font-body font-medium hover:bg-surface/50 cursor-pointer"
        >
            Cancel
        </button>
        <button
            type="button"
            onclick={apply}
            class="rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2 text-sm font-body font-semibold cursor-pointer"
        >
            OK
        </button>
    </div>
</Modal>
