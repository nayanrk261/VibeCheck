import { useEffect } from 'react';
import { getThemeSnapshot, subscribeTheme } from './themeStore';

export function ThemeProvider({ children }) {
  useEffect(() => {
    const theme = getThemeSnapshot();
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    return subscribeTheme((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
      document.body.dataset.theme = nextTheme;
    });
  }, []);

  return children;
}
