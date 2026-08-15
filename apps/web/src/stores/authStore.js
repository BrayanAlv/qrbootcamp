import { create } from 'zustand';
import { authService } from '../services/authService.js';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  initializing: true,

  setAccessToken: (token) => set({ accessToken: token }),

  // Arranca la sesión con /refresh (cookie httpOnly): fuente de verdad única al cargar la página.
  init: async () => {
    try {
      const refreshed = await authService.refresh();
      set({ user: refreshed.user, accessToken: refreshed.accessToken, initializing: false });
    } catch {
      set({ user: null, accessToken: null, initializing: false });
    }
  },

  login: async ({ email, password }) => {
    const session = await authService.login({ email, password });
    set({ user: session.user, accessToken: session.accessToken });
    return session;
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      set({ user: null, accessToken: null });
    }
  },
}));

export default useAuthStore;