import { page } from 'vitest/browser';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TimePicker from './TimePicker.svelte';

describe('TimePicker', () => {
    it('shows the current value on the trigger button', async () => {
        render(TimePicker, { props: { value: '09:30', label: 'Start time', onchange: vi.fn() } });

        const trigger = page.getByRole('button', { name: 'Start time: 09:30' });
        await expect.element(trigger).toBeVisible();
        await expect.element(trigger).toHaveTextContent('09:30');
    });

    it('opens the modal and applies the chosen time via onchange', async () => {
        const onchange = vi.fn();
        render(TimePicker, { props: { value: '', label: 'Start time', onchange } });

        await page.getByRole('button', { name: 'Start time: select time' }).click();

        // Modal opens with hour/minute grids (defaults 09:00)
        await expect.element(page.getByRole('button', { name: 'OK' })).toBeVisible();

        await page.getByRole('button', { name: '14', exact: true }).click();
        await page.getByRole('button', { name: '45', exact: true }).click();
        await page.getByRole('button', { name: 'OK' }).click();

        expect(onchange).toHaveBeenCalledWith('14:45');
        // Modal closed — OK button gone
        expect(page.getByRole('button', { name: 'OK' }).query()).toBeNull();
    });

    it('cancel discards the draft and does not call onchange', async () => {
        const onchange = vi.fn();
        render(TimePicker, { props: { value: '08:00', label: 'End time', onchange } });

        await page.getByRole('button', { name: 'End time: 08:00' }).click();

        await page.getByRole('button', { name: '07', exact: true }).click();
        await page.getByRole('button', { name: 'Cancel' }).click();

        expect(onchange).not.toHaveBeenCalled();
        // Modal closed — OK button gone
        expect(page.getByRole('button', { name: 'OK' }).query()).toBeNull();
    });
});
