import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { themeStore } from '$lib/stores/theme.svelte';

function stubSystemDark(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: dark,
  } as unknown as MediaQueryList);
}

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies the saved theme from localStorage when present', () => {
    localStorage.setItem('paragon-theme', 'dark');
    themeStore.init();
    expect(themeStore.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('falls back to the system preference when nothing is saved', () => {
    stubSystemDark(true);
    themeStore.init();
    expect(themeStore.theme).toBe('dark');
  });

  it('defaults to light when nothing is saved and the system is light', () => {
    themeStore.init();
    expect(themeStore.theme).toBe('light');
  });

  it('apply sets the data-theme attribute, persists, and updates state', () => {
    themeStore.apply('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('paragon-theme')).toBe('dark');
    expect(themeStore.theme).toBe('dark');
  });

  it('toggle flips light to dark and back, keeping state and storage in sync', () => {
    themeStore.apply('light');
    themeStore.toggle();
    expect(themeStore.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('paragon-theme')).toBe('dark');
    themeStore.toggle();
    expect(themeStore.theme).toBe('light');
    expect(localStorage.getItem('paragon-theme')).toBe('light');
  });
});