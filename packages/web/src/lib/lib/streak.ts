export interface StreakResult {
    current: number;
    longest: number;
}

export function calculateStreak(instances: { date: string; state: string }[]): StreakResult {
    // Sort ascending by date for sequential scan
    const sorted = [...instances].sort((a, b) => a.date.localeCompare(b.date));

    let currentRun = 0;
    let longest = 0;

    for (const inst of sorted) {
        if (inst.state === 'full' || inst.state === 'floor') {
            currentRun++;
            if (currentRun > longest) longest = currentRun;
        } else if (inst.state === 'missed') {
            currentRun = 0;
        }
        // 'pending'
    }

    // Current streak: walk descending from most recent non-pending date
    const desc = [...instances].sort((a, b) => b.date.localeCompare(a.date));
    let current = 0;
    let started = false;

    for (const inst of desc) {
        if (!started && inst.state === 'pending') continue; // skip today if undecided
        started = true;

        if (inst.state === 'full' || inst.state === 'floor') {
            current++;
        } else if (inst.state === 'missed') {
            break;
        }
        if (inst.state === 'pending') break;
    }

    return { current, longest };
}