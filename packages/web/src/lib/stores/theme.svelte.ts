export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'paragon-theme';

function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

class ThemeStore {
  theme = $state<Theme>('light');

  init(): void {
    const t = readSavedTheme() ?? (systemPrefersDark() ? 'dark' : 'light');
    this.apply(t);
  }

  apply(t: Theme): void {
    this.theme = t;
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // storage unavailable (private mode) - attribute still applied
    }
  }

  toggle(): void {
    this.apply(this.theme === 'light' ? 'dark' : 'light');
  }
}

export const themeStore = new ThemeStore();