import { create } from 'zustand';

export const THEMES = {
  EMERALD: 'default',
  NEON_PURPLE: 'theme-neon-purple',
  CYBER_YELLOW: 'theme-cyber-yellow',
  CRIMSON_RED: 'theme-crimson-red',
};

export const MODES = {
  DARK: 'dark',
  LIGHT: 'light',
};

const applyThemeToDOM = (theme, mode) => {
  const root = document.documentElement;

  // --- Apply Accent Theme ---
  Object.values(THEMES).forEach(t => {
    if (t !== 'default') root.classList.remove(t);
  });
  if (theme !== THEMES.EMERALD) {
    root.classList.add(theme);
  }

  // --- Apply Display Mode ---
  if (mode === MODES.DARK) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useTheme = create((set, get) => ({
  theme: localStorage.getItem('klivra-theme') || THEMES.EMERALD,
  mode: localStorage.getItem('klivra-mode') || MODES.DARK,

  setTheme: (newTheme) => {
    const { mode } = get();
    localStorage.setItem('klivra-theme', newTheme);
    applyThemeToDOM(newTheme, mode);
    set({ theme: newTheme });
  },

  setMode: (newMode) => {
    const { theme } = get();
    localStorage.setItem('klivra-mode', newMode);
    applyThemeToDOM(theme, newMode);
    set({ mode: newMode });
  },

  // Call this right when the app mounts (e.g., inside App.jsx or Layout.jsx)
  initTheme: () => {
    const savedTheme = localStorage.getItem('klivra-theme') || THEMES.EMERALD;
    const savedMode = localStorage.getItem('klivra-mode') || MODES.DARK;
    applyThemeToDOM(savedTheme, savedMode);
    set({ theme: savedTheme, mode: savedMode });
  }
}));
