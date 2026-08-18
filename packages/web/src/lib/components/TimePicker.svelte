<script lang="ts">
    import Modal from './Modal.svelte';

    let { value, onchange, label }: {
        value: string;
        onchange: (v: string) => void;
        label: string;
    } = $props();

    let open = $state(false);
    let draftHour12 = $state(9);
    let draftPeriod = $state<'AM' | 'PM'>('AM');
    let draftMinute = $state(0);
    let step = $state<'hour' | 'minute'>('hour');

    const HOURS12 = Array.from({ length: 12 }, (_, i) => i + 1);
    const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

    function to24(h12: number, period: 'AM' | 'PM'): number {
        if (h12 === 12) return period === 'AM' ? 0 : 12;
        return period === 'PM' ? h12 + 12 : h12;
    }

    function from24(h24: number): { h12: number; period: 'AM' | 'PM' } {
        if (h24 === 0) return { h12: 12, period: 'AM' };
        if (h24 === 12) return { h12: 12, period: 'PM' };
        return h24 > 12 ? { h12: h24 - 12, period: 'PM' } : { h12: h24, period: 'AM' };
    }

    function format24(h12: number, period: 'AM' | 'PM', m: number): string {
        return `${String(to24(h12, period)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function format12(h12: number, period: 'AM' | 'PM', m: number): string {
        return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    }

    function currentDisplay(): string {
        if (!value) return 'Select';
        const [h, m] = value.split(':').map(Number);
        const validH = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 9;
        const validM = Number.isFinite(m) && m >= 0 && m < 60 ? m : 0;
        const { h12, period } = from24(validH);
        return format12(h12, period, validM);
    }

    function openPicker() {
        const [h, m] = value ? value.split(':').map(Number) : [9, 0];
        const validH = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 9;
        const validM = Number.isFinite(m) && m >= 0 && m < 60 ? m : 0;
        const { h12, period } = from24(validH);
        draftHour12 = h12;
        draftPeriod = period;
        draftMinute = validM;
        step = 'hour';
        open = true;
    }

    function apply() {
        onchange(format24(draftHour12, draftPeriod, draftMinute));
        open = false;
    }
</script>

<button
    type="button"
    class="block w-full rounded-md border border-border bg-surface text-on-surface px-3 py-2 text-sm font-body tabular-nums text-left hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
    aria-label={value ? `${label}: ${currentDisplay()}` : `${label}: select time`}
    onclick={openPicker}
>
    {currentDisplay()}
</button>

<Modal open={open} title={label} onclose={() => (open = false)}>
    <div class="flex items-center justify-center gap-2 mb-3">
        <button
            type="button"
            class="rounded-lg border border-border px-4 py-1.5 text-sm font-body font-medium cursor-pointer
                   {draftPeriod === 'AM' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-container hover:bg-surface-container-lowest'}"
            onclick={() => (draftPeriod = 'AM')}
        >
            AM
        </button>
        <button
            type="button"
            class="rounded-lg border border-border px-4 py-1.5 text-sm font-body font-medium cursor-pointer
                   {draftPeriod === 'PM' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-container hover:bg-surface-container-lowest'}"
            onclick={() => (draftPeriod = 'PM')}
        >
            PM
        </button>
    </div>

    {#if step === 'hour'}
        <p class="text-xs font-body text-muted-foreground mb-1 text-center">Hour</p>
        <div class="grid grid-cols-4 gap-2" role="group" aria-label="Hour">
            {#each HOURS12 as hour (hour)}
                <button
                    type="button"
                    aria-label={`${hour} o'clock`}
                    onclick={() => {
                        draftHour12 = hour;
                        step = 'minute';
                    }}
                    class="rounded-xl px-2 py-3 text-base font-body tabular-nums cursor-pointer
                           {draftHour12 === hour ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-container hover:bg-surface-container-lowest'}"
                >
                    {hour}
                </button>
            {/each}
        </div>
    {:else}
        <p class="text-xs font-body text-muted-foreground mb-1 text-center">Minute</p>
        <button
            type="button"
            onclick={() => (step = 'hour')}
            class="block mx-auto mb-2 text-xs font-body text-muted-foreground hover:text-on-surface cursor-pointer"
        >
            ← Hour
        </button>
        <div class="grid grid-cols-4 gap-2" role="group" aria-label="Minute">
            {#each MINUTES as minute (minute)}
                <button
                    type="button"
                    onclick={() => (draftMinute = minute)}
                    class="rounded-xl px-2 py-3 text-base font-body tabular-nums cursor-pointer
                           {draftMinute === minute ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-container hover:bg-surface-container-lowest'}"
                >
                    {String(minute).padStart(2, '0')}
                </button>
            {/each}
        </div>
    {/if}

    <p class="mt-3 text-sm font-body tabular-nums text-on-surface text-center">
        Selected: <span class="font-semibold">{format12(draftHour12, draftPeriod, draftMinute)}</span>
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
            class="rounded-2xl bg-primary text-on-primary px-4 py-2 text-sm font-body font-semibold cursor-pointer"
        >
            OK
        </button>
    </div>
</Modal>