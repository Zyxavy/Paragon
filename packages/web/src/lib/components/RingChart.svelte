<script lang="ts">
    let { value, size = 64 }: { value: number; size?: number } = $props();

    const stroke = 12;
    const radius = $derived((size - stroke) / 2);
    const circumference = $derived(2 * Math.PI * radius);
    const offset = $derived(circumference - (Math.min(value, 100) / 100) * circumference);
</script>

<svg width={size} height={size} class="transform -rotate-90">
    <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="var(--color-primary)" />
            <stop offset="100%" stop-color="var(--color-primary-container)" />
        </linearGradient>
    </defs>
    <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="var(--color-surface-container-low)"
        stroke-width={stroke}
        stroke-linecap="round"
    />
    <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="url(#ring-grad)"
        stroke-width={stroke}
        stroke-linecap="round"
        stroke-dasharray={circumference}
        stroke-dashoffset={offset}
        class="transition-all duration-500"
    />
</svg>

<div class="text-center">
    <span class="text-xl font-bold text-on-surface">{Math.round(value)}%</span>
</div>