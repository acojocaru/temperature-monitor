import { create } from 'zustand';
import { Alert, Platform } from 'react-native';
import {
  registerBackgroundFetch,
  unregisterBackgroundFetch,
  isBackgroundFetchRegistered,
  getBackgroundLogs,
  clearBackgroundLogs,
  getBackgroundTaskStatus
} from '../services/notifications';

export interface BackgroundStatus {
  isRegistered: boolean;
  statusText: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
}

export interface DebugState {
  showDebugInfo: boolean;
  backgroundStatus: BackgroundStatus | null;
  logs: LogEntry[];
  
  // Actions
  toggleDebugInfo: () => void;
  checkBackgroundStatus: () => Promise<void>;
  registerBackgroundTask: () => Promise<void>;
  unregisterBackgroundTask: () => Promise<void>;
  loadLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;
}

export const useDebugStore = create<DebugState>((set, get) => ({
  showDebugInfo: false,
  backgroundStatus: null,
  logs: [],
  
  toggleDebugInfo: () => {
    // Don't allow toggling debug info on web
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Background tasks are not supported in web environments.');
      return;
    }
    
    const newState = !get().showDebugInfo;
    set({ showDebugInfo: newState });
    
    if (newState) {
      // Load debug info when showing
      get().checkBackgroundStatus();
      get().loadLogs();
    }
  },
  
  checkBackgroundStatus: async () => {
    try {
      const status = await isBackgroundFetchRegistered();
      set({ backgroundStatus: status });
    } catch (error) {
      console.error('Error checking background status:', error);
      Alert.alert('Error', 'Failed to check background task status');
    }
  },
  
  registerBackgroundTask: async () => {
    try {
      const result = await registerBackgroundFetch();
      if (result) {
        Alert.alert('Success', 'Background fetch task registered successfully');
        await get().checkBackgroundStatus();
      } else {
        Alert.alert('Error', 'Failed to register background fetch task');
      }
    } catch (error) {
      console.error('Error registering background task:', error);
      Alert.alert('Error', 'Failed to register background task');
    }
  },
  
  unregisterBackgroundTask: async () => {
    try {
      const result = await unregisterBackgroundFetch();
      if (result) {
        Alert.alert('Success', 'Background fetch task unregistered successfully');
        await get().checkBackgroundStatus();
      } else {
        Alert.alert('Error', 'Failed to unregister background fetch task');
      }
    } catch (error) {
      console.error('Error unregistering background task:', error);
      Alert.alert('Error', 'Failed to unregister background task');
    }
  },
  
  loadLogs: async () => {
    try {
      const logs = await getBackgroundLogs();
      set({ logs });
    } catch (error) {
      console.error('Error loading background logs:', error);
    }
  },
  
  clearLogs: async () => {
    try {
      await clearBackgroundLogs();
      set({ logs: [] });
    } catch (error) {
      console.error('Error clearing background logs:', error);
      Alert.alert('Error', 'Failed to clear background logs');
    }
  }
})); 