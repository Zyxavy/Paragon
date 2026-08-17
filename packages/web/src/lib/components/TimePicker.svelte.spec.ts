import { page } from 'vitest/browser';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TimePicker from './TimePicker.svelte';

describe('TimePicker', () => {
    it('shows the current value on the trigger button in 12-hour format', async () => {
        render(TimePicker, { props: { value: '09:30', label: 'Start time', onchange: vi.fn() } });

        const trigger = page.getByRole('button', { name: 'Start time: 9:30 AM' });
        await expect.element(trigger).toBeVisible();
        await expect.element(trigger).toHaveTextContent('9:30 AM');
    });

    it('shows PM values on the trigger button in 12-hour format', async () => {
        render(TimePicker, { props: { value: '14:30', label: 'Start time', onchange: vi.fn() } });

        const trigger = page.getByRole('button', { name: 'Start time: 2:30 PM' });
        await expect.element(trigger).toBeVisible();
    });

    it('opens the dial and applies the chosen time via onchange', async () => {
        const onchange = vi.fn();
        render(TimePicker, { props: { value: '', label: 'Start time', onchange } });

        await page.getByRole('button', { name: 'Start time: select time' }).click();

        // Dial opens with the hour face (defaults 9 AM)
        await expect.element(page.getByRole('button', { name: 'OK' })).toBeVisible();
        await expect.element(page.getByRole('button', { name: '9 o\x27clock' })).toBeVisible();

        await page.getByRole('button', { name: 'PM', exact: true }).click();
        await page.getByRole('button', { name: /^2 o'clock$/ }).click();
        // Selecting an hour advances to the minute face
        expect(page.getByRole('button', { name: '1 o\x27clock' }).query()).toBeNull();
        await page.getByRole('button', { name: '45', exact: true }).click();
        await page.getByRole('button', { name: 'OK' }).click();

        expect(onchange).toHaveBeenCalledWith('14:45');
        // Modal closed — OK button gone
        expect(page.getByRole('button', { name: 'OK' }).query()).toBeNull();
    });

    it('cancel discards the draft and does not call onchange', async () => {
        const onchange = vi.fn();
        render(TimePicker, { props: { value: '08:00', label: 'End time', onchange } });

        await page.getByRole('button', { name: 'End time: 8:00 AM' }).click();

        await page.getByRole('button', { name: /^7 o'clock$/ }).click();
        await page.getByRole('button', { name: 'Cancel' }).click();

        expect(onchange).not.toHaveBeenCalled();
        // Modal closed — OK button gone
        expect(page.getByRole('button', { name: 'OK' }).query()).toBeNull();
    });
});