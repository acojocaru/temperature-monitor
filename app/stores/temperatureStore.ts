import { create } from 'zustand';
import { Alert } from 'react-native';
import { useSettingsStore } from './settingsStore';

export interface TemperatureState {
  currentTemperature: number | null;
  previousTemperature: number | null;
  
  // Actions
  setPreviousTemperature: (value: number) => void;
  checkTemperatureTransition: (currentTemp: number) => void;
  isTemperatureInRange: (temperature: number) => boolean;
  processNewTemperature: (temperature: number) => void;
}

export const useTemperatureStore = create<TemperatureState>((set, get) => ({
  currentTemperature: null,
  previousTemperature: null,
  
  setPreviousTemperature: (value) => {
    set({ previousTemperature: value });
  },
  
  checkTemperatureTransition: (currentTemp) => {
    const { previousTemperature } = get();
    if (previousTemperature === null) return;
    
    const { minTemperature, maxTemperature } = useSettingsStore.getState();
    
    // Check if temperature was outside range and is now inside
    const wasOutside = previousTemperature < minTemperature || previousTemperature > maxTemperature;
    const isInside = currentTemp >= minTemperature && currentTemp <= maxTemperature;
    
    if (wasOutside && isInside) {
      Alert.alert(
        "Temperature Update",
        `Temperature (${currentTemp.toFixed(1)}°C) is now within the desired range (${minTemperature.toFixed(1)}°C - ${maxTemperature.toFixed(1)}°C).`
      );
    }
    
    // Check if temperature was inside range and is now outside
    const wasInside = previousTemperature >= minTemperature && previousTemperature <= maxTemperature;
    const isOutside = currentTemp < minTemperature || currentTemp > maxTemperature;
    
    if (wasInside && isOutside) {
      Alert.alert(
        "Temperature Alert",
        currentTemp < minTemperature
          ? `Temperature (${currentTemp.toFixed(1)}°C) has fallen below the minimum threshold (${minTemperature.toFixed(1)}°C).`
          : `Temperature (${currentTemp.toFixed(1)}°C) has exceeded the maximum threshold (${maxTemperature.toFixed(1)}°C).`
      );
    }
  },
  
  isTemperatureInRange: (temperature) => {
    const { minTemperature, maxTemperature } = useSettingsStore.getState();
    return temperature >= minTemperature && temperature <= maxTemperature;
  },
  
  processNewTemperature: (temperature) => {
    const { currentTemperature } = get();
    
    // If we have a current temperature, move it to previous
    if (currentTemperature !== null) {
      get().setPreviousTemperature(currentTemperature);
      // Check for transitions
      get().checkTemperatureTransition(temperature);
    }
    
    // Update current temperature
    set({ currentTemperature: temperature });
  }
})); 