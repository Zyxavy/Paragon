import { describe, it, expect } from 'vitest';
import { calculateStreak } from './streak';

function day(date: string, state: string) {
    return { date, state };
}

describe('calculateStreak', () => {
    it('returns 0 for empty history', () => {
        const result = calculateStreak([]);
        expect(result.current).toBe(0);
        expect(result.longest).toBe(0);
    });

    it('returns 0 current when most recent non-pending is missed', () => {
        const instances = [
            day('2026-07-29', 'pending'),
            day('2026-07-28', 'missed'),
            day('2026-07-27', 'full'),
            day('2026-07-26', 'full'),
        ];
        const result = calculateStreak(instances);
        expect(result.current).toBe(0);
        expect(result.longest).toBe(2);
    });

    it('counts consecutive full/floor as current streak', () => {
        const instances = [
            day('2026-07-29', 'pending'),
            day('2026-07-28', 'full'),
            day('2026-07-27', 'full'),
            day('2026-07-26', 'floor'),
            day('2026-07-25', 'missed'),
        ];
        const result = calculateStreak(instances);
        expect(result.current).toBe(3);
        expect(result.longest).toBe(3);
    });

    it('longest streak survives a break', () => {
        const instances = [
            day('2026-07-29', 'pending'),
            day('2026-07-28', 'full'),    // current = 1
            day('2026-07-27', 'missed'),  // break
            day('2026-07-26', 'full'),    // longest = 3
            day('2026-07-25', 'full'),
            day('2026-07-24', 'full'),
        ];
        const result = calculateStreak(instances);
        expect(result.current).toBe(1);
        expect(result.longest).toBe(3);
    });

    it('broken-then-resumed streak', () => {
        const instances = [
            day('2026-07-29', 'pending'),
            day('2026-07-28', 'full'),
            day('2026-07-27', 'missed'),
            day('2026-07-26', 'full'),
            day('2026-07-25', 'full'),
        ];
        const result = calculateStreak(instances);
        expect(result.current).toBe(1);
        expect(result.longest).toBe(2);
    });
});