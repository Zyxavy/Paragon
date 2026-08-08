import { page } from 'vitest/browser';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { readable } from 'svelte/store';
import NavBar from './NavBar.svelte';

vi.mock('$app/stores', () => ({
    page: readable({ url: { pathname: '/dashboard' } }),
}));

vi.mock('$lib/auth-client', () => ({
    authClient: { signOut: vi.fn() },
}));

describe('NavBar', () => {
    it('keeps the expand toggle inside the rail when collapsed: drops the 192px min-width and hides the logo', async () => {
        const ontoggle = vi.fn();
        render(NavBar, { props: { session: null, collapsed: true, ontoggle } });

        const logo = await page.getByRole('link', { name: 'Paragon dashboard' }).element();
        const contentDiv = logo.parentElement?.parentElement as HTMLElement;
        expect(contentDiv.classList.contains('min-w-0')).toBe(true);
        expect(contentDiv.classList.contains('min-w-48')).toBe(false);
        expect(logo.classList.contains('hidden')).toBe(true);

        await expect.element(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    });

    it('calls ontoggle when the toggle button is clicked', async () => {
        const ontoggle = vi.fn();
        render(NavBar, { props: { session: null, collapsed: false, ontoggle } });

        await page.getByRole('button', { name: 'Collapse sidebar' }).click();

        expect(ontoggle).toHaveBeenCalledOnce();
    });
});
