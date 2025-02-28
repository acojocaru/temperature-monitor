import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getValidAccessToken } from './auth';

// Storage keys
const TEMP_RANGE_STORAGE_KEY = 'temperature_range';
const LAST_TEMP_KEY = 'last_temperature';

// Task name for background fetch
const BACKGROUND_FETCH_TASK = 'background-temperature-fetch';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Register background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Get temperature range from storage
    const rangeStr = await AsyncStorage.getItem(TEMP_RANGE_STORAGE_KEY);
    if (!rangeStr) return BackgroundFetch.BackgroundFetchResult.NoData;
    
    const { low, high } = JSON.parse(rangeStr);
    
    // Get previous temperature
    const prevTempStr = await AsyncStorage.getItem(LAST_TEMP_KEY);
    const previousTemperature = prevTempStr ? parseFloat(prevTempStr) : null;
    
    // Get a valid token (will refresh if needed)
    let token;
    try {
      token = await getValidAccessToken();
    } catch (error) {
      console.error("Authentication error in background task:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    // Fetch current temperature
    const response = await fetch(
      'https://api.viessmann.com/iot/v1/equipment/installations/2585628/gateways/7736172150862221/devices/0/features/heating.sensors.temperature.outside',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch temperature data: ${response.status}`);
    }
    
    const data = await response.json();
    const currentTemp = data.data.properties.value.value;
    
    // Save current temperature for next check
    await AsyncStorage.setItem(LAST_TEMP_KEY, currentTemp.toString());
    
    // Check for temperature transitions
    if (previousTemperature !== null) {
      // Check if temperature was outside range and is now inside
      const wasOutside = previousTemperature < low || previousTemperature > high;
      const isInside = currentTemp >= low && currentTemp <= high;
      
      if (wasOutside && isInside) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Temperature Update",
            body: `Temperature (${currentTemp}°C) is now within the desired range (${low}°C - ${high}°C).`,
          },
          trigger: null, // Send immediately
        });
      }
      
      // Check if temperature was inside range and is now outside
      const wasInside = previousTemperature >= low && previousTemperature <= high;
      const isOutside = currentTemp < low || currentTemp > high;
      
      if (wasInside && isOutside) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Temperature Alert",
            body: currentTemp < low
              ? `Temperature (${currentTemp}°C) has fallen below the minimum threshold (${low}°C).`
              : `Temperature (${currentTemp}°C) has exceeded the maximum threshold (${high}°C).`,
          },
          trigger: null, // Send immediately
        });
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background fetch failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background fetch task
export async function registerBackgroundFetch() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background fetch task registered');
  } catch (err) {
    console.error('Background fetch registration failed:', err);
  }
}

// Unregister the background fetch task
export async function unregisterBackgroundFetch() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('Background fetch task unregistered');
  } catch (err) {
    console.error('Background fetch unregistration failed:', err);
  }
}

// Request notification permissions
export async function requestNotificationsPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Update the last temperature in storage (call this from the main app)
export async function updateLastTemperature(temperature: number) {
  await AsyncStorage.setItem(LAST_TEMP_KEY, temperature.toString());
} 