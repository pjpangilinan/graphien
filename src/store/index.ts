import { create } from 'zustand';

interface AppState {
  password: string | null;
  rememberMe: boolean;
  setPassword: (password: string | null) => void;
  setRememberMe: (value: boolean) => void;
  activeFont: string | null;
  setActiveFont: (fontId: string | null) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useStore = create<AppState>((set) => ({
  password: null,
  rememberMe: false,
  setPassword: (password) => set({ password }),
  setRememberMe: (value) => {
    if (value) {
      sessionStorage.setItem('graphien-remember', 'true');
    } else {
      sessionStorage.removeItem('graphien-remember');
    }
    set({ rememberMe: value });
  },
  activeFont: localStorage.getItem('graphien-active-font'),
  setActiveFont: (fontId) => {
    if (fontId) {
      localStorage.setItem('graphien-active-font', fontId);
    } else {
      localStorage.removeItem('graphien-active-font');
    }
    set({ activeFont: fontId });
  },
  darkMode: localStorage.getItem('graphien-dark') === 'true',
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      localStorage.setItem('graphien-dark', String(next));
      return { darkMode: next };
    }),
}));
