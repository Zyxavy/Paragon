import { page } from 'vitest/browser';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WidgetPalette from './WidgetPalette.svelte';

describe('WidgetPalette', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('collapses the palette when the toggle is clicked and persists the state', async () => {
        const onAdd = vi.fn();
        render(WidgetPalette, { props: { onAdd } });

        await page.getByRole('button', { name: 'Collapse widget palette' }).click();

        const heading = await page.getByRole('heading', { name: 'Widgets' }).element();
        expect(heading.classList.contains('hidden')).toBe(true);
        expect(localStorage.getItem('palette-collapsed')).toBe('true');
        await expect.element(page.getByRole('button', { name: 'Expand widget palette' })).toBeVisible();
    });

    it('starts collapsed when the persisted state says so', async () => {
        localStorage.setItem('palette-collapsed', 'true');

        const onAdd = vi.fn();
        render(WidgetPalette, { props: { onAdd } });

        await expect.element(page.getByRole('button', { name: 'Expand widget palette' })).toBeVisible();
        const heading = await page.getByRole('heading', { name: 'Widgets' }).element();
        expect(heading.classList.contains('hidden')).toBe(true);
    });
});
