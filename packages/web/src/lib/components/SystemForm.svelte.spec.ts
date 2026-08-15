import { page } from 'vitest/browser';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SystemForm from './SystemForm.svelte';
import { AUTOSAVE_DEBOUNCE_MS } from './system-form.config';
import type { System } from '$lib/api/systems';

const mockSystem = vi.hoisted((): System => ({
    id: 'sys_test123',
    user_id: 'user_test123',
    name: 'My System',
    domain: null,
    purpose: '',
    philosophy: '',
    protocol: '',
    floor_action: '',
    trigger: '',
    barrier_list: [],
    environment_cue: '',
    reference_table: '',
    success_metric: '',
    visual_aid: null,
    template_origin: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
}));

vi.mock('$lib/api/systems', () => ({
    createSystem: vi.fn().mockResolvedValue(mockSystem),
    patchSystem: vi.fn().mockResolvedValue(mockSystem),
    confirmSystem: vi.fn().mockResolvedValue({ id: 'sys_test123' }),
}));

describe('SystemForm autosave', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('does not save immediately when user types', async () => {
        const { createSystem } = await import('$lib/api/systems');
        render(SystemForm);

        await page.getByPlaceholder('e.g. Reading System').fill('My System');

        expect(createSystem).not.toHaveBeenCalled();
    });

    it('auto-saves after debounce interval when name is filled', async () => {
        const { createSystem } = await import('$lib/api/systems');
        render(SystemForm);

        await page.getByPlaceholder('e.g. Reading System').fill('My System');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 100);

        expect(createSystem).toHaveBeenCalledOnce();
        expect(createSystem).toHaveBeenCalledWith(expect.objectContaining({ name: 'My System' }));
    });

    it('calls patchSystem on second save after system id exists', async () => {
        const { createSystem, patchSystem } = await import('$lib/api/systems');
        render(SystemForm);

        await page.getByPlaceholder('e.g. Reading System').fill('My System');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 100);

        await page.getByPlaceholder('e.g. Study, Fitness, Writing').fill('Study');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 100);

        expect(patchSystem).toHaveBeenCalledWith(
        'sys_test123',
        expect.objectContaining({ domain: 'Study' })
        );
    });
});

describe('SystemForm duplicate-submit guard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ignores extra Confirm clicks while the first save is in flight and only confirms once', async () => {
        vi.useRealTimers();
        const { createSystem, confirmSystem } = await import('$lib/api/systems');
        let resolveCreate: (value: System) => void = () => {};
        vi.mocked(createSystem).mockReturnValue(new Promise((res) => { resolveCreate = res; }));

        render(SystemForm);

        await page.getByPlaceholder('e.g. Reading System').fill('My System');

        const confirmBtn = page.getByRole('button', { name: /^Confirm system$/ });
        await confirmBtn.click();

        // While the create is pending the button is disabled, so re-submits are ignored.
        await expect.element(confirmBtn).toBeDisabled();
        (confirmBtn.element() as HTMLButtonElement).click();
        (confirmBtn.element() as HTMLButtonElement).click();

        expect(createSystem).toHaveBeenCalledOnce();
        expect(confirmSystem).not.toHaveBeenCalled();

        resolveCreate(mockSystem);
        await vi.waitFor(() => {
            expect(confirmSystem).toHaveBeenCalledOnce();
        });

        // Restore the default mock behavior for subsequent tests.
        vi.mocked(createSystem).mockResolvedValue(mockSystem);
    });
});

describe('SystemForm validation', () => {
    it('submit button is disabled when name is empty', async () => {
        render(SystemForm);

        const button = page.getByRole('button', { name: /^Confirm system$/ });
        await expect.element(button).toBeDisabled();
    });

    it('submit button is enabled when name is filled', async () => {
        render(SystemForm);

        await page.getByPlaceholder('e.g. Reading System').fill('Reading System');

        const button = page.getByRole('button', { name: /^Confirm system$/ });
        await expect.element(button).toBeEnabled();
    });
});