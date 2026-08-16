import { page } from 'vitest/browser';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AccountPage from './+page.svelte';
import { themeStore } from '$lib/stores/theme.svelte';

vi.mock('$lib/api/recovery-codes', () => ({
  getRecoveryCodes: vi.fn().mockResolvedValue({ codes: [] }),
  regenerateRecoveryCodes: vi.fn().mockResolvedValue({
    codes: ['POLARIS-AAAA-BBBB', 'POLARIS-CCCC-DDDD', 'POLARIS-EEEE-FFFF'],
  }),
}));

const data = {
  codes: [],
  error: null,
  session: { user: { email: 'a@b.c', name: 'A' } },
} as never;

describe('AccountPage theme toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    themeStore.apply('light');
  });

  it('applies dark mode when the toggle is clicked', async () => {
    render(AccountPage, { props: { data } });
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('applies light mode when the toggle is clicked again', async () => {
    render(AccountPage, { props: { data } });
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});