import { page } from 'vitest/browser';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SystemDetailPage from './+page.svelte';
import type { System } from '$lib/api/systems';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/api/systems', () => ({
    pauseSystem: vi.fn(),
    unarchiveSystem: vi.fn(),
    deleteSystem: vi.fn(),
}));
vi.mock('$lib/api/templates', () => ({ saveAsTemplate: vi.fn() }));
vi.mock('$lib/api/export', () => ({ exportSystem: vi.fn() }));
vi.mock('$lib/stores/toast.svelte', () => ({ addToast: vi.fn() }));

function makeSystem(status: System['status']): System {
    return {
        id: 'sys1',
        user_id: 'user1',
        name: 'Reading',
        domain: 'health',
        purpose: 'Read daily',
        philosophy: 'Books matter',
        protocol: '20 min',
        floor_action: 'Open a book',
        trigger: 'After dinner',
        barrier_list: [],
        environment_cue: 'Book on desk',
        template_origin: null,
        status,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
    };
}

describe('system detail page pause/resume', () => {
    it('shows a Resume button after pausing the system', async () => {
        const { pauseSystem } = await import('$lib/api/systems');
        vi.mocked(pauseSystem).mockResolvedValue(makeSystem('paused'));

        render(SystemDetailPage, { props: { data: { session: null, system: makeSystem('active') } } });

        await page.getByRole('button', { name: 'Pause' }).click();

        await expect.element(page.getByRole('button', { name: 'Resume' })).toBeVisible();
        // Pause button gone once the system is paused
        expect(page.getByRole('button', { name: 'Pause' }).query()).toBeNull();
    });

    it('shows a Pause button again after resuming', async () => {
        const { unarchiveSystem } = await import('$lib/api/systems');
        vi.mocked(unarchiveSystem).mockResolvedValue(makeSystem('active'));

        render(SystemDetailPage, { props: { data: { session: null, system: makeSystem('paused') } } });

        await page.getByRole('button', { name: 'Resume' }).click();

        await expect.element(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    });
});
