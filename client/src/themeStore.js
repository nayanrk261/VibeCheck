const THEME_KEY = 'vibecheck-theme';
const listeners = new Set();

function readStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(THEME_KEY) || 'light';
}

function emit(theme) {
  for (const listener of listeners) {
    listener(theme);
  }
}

export function getThemeSnapshot() {
  return readStoredTheme();
}

export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }
  emit(theme);
}

export function toggleTheme() {
  const nextTheme = readStoredTheme() === 'light' ? 'dark' : 'light';
  setTheme(nextTheme);
}
