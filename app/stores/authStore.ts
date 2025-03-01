import { create } from 'zustand';
import { startAuthentication, logout as logoutService, getValidAccessToken } from '../services/auth';
import { unregisterBackgroundFetch } from '../services/notifications';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthenticated: (value: boolean) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  login: async () => {
    try {
      set({ isLoading: true });
      await startAuthentication();
      set({ isAuthenticated: true });
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try {
      set({ isLoading: true });
      // Unregister background fetch when logging out
      await unregisterBackgroundFetch();
      await logoutService();
      set({ isAuthenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  checkAuthStatus: async () => {
    try {
      await getValidAccessToken();
      if (!get().isAuthenticated) {
        set({ isAuthenticated: true });
      }
      return true;
    } catch (err) {
      if (get().isAuthenticated) {
        set({ isAuthenticated: false });
      }
      return false;
    }
  }
})); 