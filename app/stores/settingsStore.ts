import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMP_RANGE_STORAGE_KEY = 'temperature_range';

export interface SettingsState {
  minTemperature: number;
  maxTemperature: number;
  
  // Actions
  setMinTemperature: (value: number) => void;
  setMaxTemperature: (value: number) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  minTemperature: 17,
  maxTemperature: 27,
  
  setMinTemperature: (value) => {
    set({ minTemperature: value });
    // Save to storage
    const { maxTemperature } = useSettingsStore.getState();
    AsyncStorage.setItem(
      TEMP_RANGE_STORAGE_KEY,
      JSON.stringify({ low: value, high: maxTemperature })
    );
  },
  
  setMaxTemperature: (value) => {
    set({ maxTemperature: value });
    // Save to storage
    const { minTemperature } = useSettingsStore.getState();
    AsyncStorage.setItem(
      TEMP_RANGE_STORAGE_KEY,
      JSON.stringify({ low: minTemperature, high: value })
    );
  },
  
  loadSettings: async () => {
    try {
      const savedRange = await AsyncStorage.getItem(TEMP_RANGE_STORAGE_KEY);
      if (savedRange) {
        const { low, high } = JSON.parse(savedRange);
        set({ 
          minTemperature: parseFloat(low), 
          maxTemperature: parseFloat(high) 
        });
      }
    } catch (error) {
      console.error('Error loading temperature range:', error);
      // Continue with default values if loading fails
    }
  }
})); 