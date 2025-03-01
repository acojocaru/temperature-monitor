import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startAuthentication, logout as logoutService, getValidAccessToken } from '../services/auth';
import { unregisterBackgroundFetch } from '../services/notifications';

// Key for storing auth state in AsyncStorage
const AUTH_STATE_KEY = 'temperature_monitor_auth_state';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthenticated: (value: boolean) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  
  setAuthenticated: (value) => {
    set({ isAuthenticated: value });
    // Persist the updated state
    AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ isAuthenticated: value }))
      .catch(err => console.error('Failed to persist auth state:', err));
  },
  
  login: async () => {
    try {
      set({ isLoading: true });
      await startAuthentication();
      set({ isAuthenticated: true });
      // Persist the updated state
      await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ isAuthenticated: true }));
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
      // Persist the updated state
      await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ isAuthenticated: false }));
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
        // Persist the updated state
        await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ isAuthenticated: true }));
      }
      return true;
    } catch (err) {
      if (get().isAuthenticated) {
        set({ isAuthenticated: false });
        // Persist the updated state
        await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ isAuthenticated: false }));
      }
      return false;
    }
  },
  
  // Function to load persisted state from AsyncStorage
  hydrate: async () => {
    try {
      const storedState = await AsyncStorage.getItem(AUTH_STATE_KEY);
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        set({ isAuthenticated: parsedState.isAuthenticated });
        
        // Verify the token is still valid if user is authenticated
        if (parsedState.isAuthenticated) {
          try {
            await getValidAccessToken();
          } catch (err) {
            // Token is invalid, update state and storage
            set({ isAuthenticated: false });
            await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ isAuthenticated: false }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to hydrate auth state:', error);
    }
  }
})); 