import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getValidAccessToken } from './auth';

// Storage keys
const TEMP_RANGE_STORAGE_KEY = 'temperature_range';
const LAST_TEMP_KEY = 'last_temperature';
const BACKGROUND_LOG_KEY = 'background_fetch_log';

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

// Helper function to log background activity
async function logBackgroundActivity(message: string) {
  try {
    // Get existing logs
    let existingLogs = [];
    try {
      const existingLogsStr = await AsyncStorage.getItem(BACKGROUND_LOG_KEY);
      existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
    } catch (storageError) {
      console.error('Failed to read background logs:', storageError);
    }
    
    // Add new log entry with timestamp
    const newLog = {
      timestamp: new Date().toISOString(),
      message
    };
    
    // Keep only the last 15 logs
    const updatedLogs = [newLog, ...existingLogs].slice(0, 15);
    
    // Save updated logs
    try {
      await AsyncStorage.setItem(BACKGROUND_LOG_KEY, JSON.stringify(updatedLogs));
    } catch (saveError) {
      console.error('Failed to save background logs:', saveError);
    }
  } catch (error) {
    console.error('Failed to log background activity:', error);
  }
}

// Define the background fetch task with more detailed logging
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const startTime = new Date();
  console.log(`Background fetch task started at ${startTime.toISOString()}`);
  
  try {
    await logBackgroundActivity(`Background fetch task started at ${startTime.toISOString()}`);
    
    // Calculate delay from last execution (simplified)
    try {
      const logsStr = await AsyncStorage.getItem(BACKGROUND_LOG_KEY);
      const logs = logsStr ? JSON.parse(logsStr) : [];
      
      // Find previous execution logs
      const executionLogs = logs.filter((log: any) => 
        log.message.includes('Background fetch task started at') && 
        new Date(log.timestamp).getTime() < startTime.getTime()
      );
      
      if (executionLogs.length > 0) {
        const lastExecutionLog = executionLogs[0];
        const lastExecutionTime = new Date(lastExecutionLog.timestamp);
        const intervalInSeconds = Math.round((startTime.getTime() - lastExecutionTime.getTime()) / 1000);
        await logBackgroundActivity(`Time since last execution: ${intervalInSeconds} seconds`);
      }
    } catch (error) {
      console.error('Error calculating task intervals:', error);
    }
    
    // Get temperature range from storage
    let rangeStr = null;
    try {
      rangeStr = await AsyncStorage.getItem(TEMP_RANGE_STORAGE_KEY);
    } catch (storageError) {
      console.error('Failed to read temperature range from storage:', storageError);
      await logBackgroundActivity(`Failed to read temperature range: ${storageError}`);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    if (!rangeStr) {
      await logBackgroundActivity('No temperature range found in storage');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    let low, high;
    try {
      const parsedRange = JSON.parse(rangeStr);
      low = parsedRange.low;
      high = parsedRange.high;
      await logBackgroundActivity(`Temperature range loaded: ${low}°C - ${high}°C`);
    } catch (parseError) {
      console.error('Failed to parse temperature range:', parseError);
      await logBackgroundActivity(`Failed to parse temperature range: ${parseError}`);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    // Get previous temperature
    let prevTempStr = null;
    try {
      prevTempStr = await AsyncStorage.getItem(LAST_TEMP_KEY);
    } catch (storageError) {
      console.error('Failed to read previous temperature from storage:', storageError);
      await logBackgroundActivity(`Failed to read previous temperature: ${storageError}`);
      // Continue execution even if we can't get previous temperature
    }
    
    const previousTemperature = prevTempStr ? parseFloat(prevTempStr) : null;
    await logBackgroundActivity(`Previous temperature: ${previousTemperature !== null ? previousTemperature + '°C' : 'None'}`);
    
    // Get a valid token (will refresh if needed)
    let token;
    try {
      token = await getValidAccessToken();
      await logBackgroundActivity('Successfully retrieved valid access token');
    } catch (error: any) {
      await logBackgroundActivity(`Authentication error: ${error.message || 'Unknown error'}`);
      console.error("Authentication error in background task:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    // Fetch current temperature
    await logBackgroundActivity('Fetching current temperature from API');
    const response = await fetch(
      'https://api.viessmann.com/iot/v1/equipment/installations/2585628/gateways/7736172150862221/devices/0/features/heating.sensors.temperature.outside',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorMsg = `Failed to fetch temperature data: ${response.status}`;
      await logBackgroundActivity(errorMsg);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    const currentTemp = data.data.properties.value.value;
    await logBackgroundActivity(`Current temperature: ${currentTemp}°C`);
    
    // Save current temperature for next check
    try {
      await AsyncStorage.setItem(LAST_TEMP_KEY, currentTemp.toString());
    } catch (storageError) {
      console.error('Failed to save current temperature to storage:', storageError);
      await logBackgroundActivity(`Failed to save current temperature: ${storageError}`);
      // Continue execution even if we can't save the current temperature
    }
    
    // Check for temperature transitions
    if (previousTemperature !== null) {
      // Check if temperature was outside range and is now inside
      const wasOutside = previousTemperature < low || previousTemperature > high;
      const isInside = currentTemp >= low && currentTemp <= high;
      
      if (wasOutside && isInside) {
        await logBackgroundActivity('Temperature transitioned from outside to inside range - sending notification');
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
        await logBackgroundActivity('Temperature transitioned from inside to outside range - sending notification');
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
    
    const endTime = new Date();
    const executionTime = (endTime.getTime() - startTime.getTime()) / 1000;
    await logBackgroundActivity(`Background fetch task completed successfully in ${executionTime.toFixed(1)} seconds`);
    console.log(`Background fetch task completed at ${endTime.toISOString()} (took ${executionTime.toFixed(1)}s)`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error: any) {
    const endTime = new Date();
    const executionTime = (endTime.getTime() - startTime.getTime()) / 1000;
    await logBackgroundActivity(`Background fetch failed after ${executionTime.toFixed(1)} seconds: ${error.message || 'Unknown error'}`);
    console.error(`Background fetch failed at ${endTime.toISOString()}:`, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background fetch task
export async function registerBackgroundFetch() {
  try {
    // Ensure TaskManager and BackgroundFetch are initialized
    if (!TaskManager || !BackgroundFetch) {
      console.error('TaskManager or BackgroundFetch is not available');
      return false;
    }
    
    // Check if the task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    if (isRegistered) {
      // If it's already registered, unregister it first to avoid duplicates
      try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      } catch (unregisterError) {
        console.error('Error unregistering existing task:', unregisterError);
      }
    }
    
    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    // Get the status after registration
    const status = await BackgroundFetch.getStatusAsync();
    const statusText = status !== null ? getBackgroundFetchStatusText(status) : 'Unknown';
    
    const registrationTime = new Date();
    await logBackgroundActivity(`Background fetch task registered at ${registrationTime.toISOString()} with 15-minute interval`);
    
    return true;
  } catch (err) {
    console.error('Background fetch registration failed:', err);
    await logBackgroundActivity(`Background fetch registration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
}

// Unregister the background fetch task
export async function unregisterBackgroundFetch() {
  try {
    // Check if task is registered before attempting to unregister
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('Background fetch task unregistered');
      await logBackgroundActivity('Background fetch task unregistered');
      return true;
    } else {
      console.log('No background fetch task to unregister');
      return true;
    }
  } catch (err) {
    console.error('Background fetch unregistration failed:', err);
    return false;
  }
}

// Request notification permissions
export async function requestNotificationsPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  console.log('Notification permissions status:', status);
  return status === 'granted';
}

// Update the last temperature in storage (call this from the main app)
export async function updateLastTemperature(temperature: number) {
  await AsyncStorage.setItem(LAST_TEMP_KEY, temperature.toString());
}

// Get the background fetch logs
export async function getBackgroundLogs() {
  const logsStr = await AsyncStorage.getItem(BACKGROUND_LOG_KEY);
  return logsStr ? JSON.parse(logsStr) : [];
}

// Clear the background fetch logs
export async function clearBackgroundLogs() {
  await AsyncStorage.removeItem(BACKGROUND_LOG_KEY);
}

// Check if background fetch is registered
export async function isBackgroundFetchRegistered() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    return { 
      status, 
      isRegistered,
      statusText: status !== null ? getBackgroundFetchStatusText(status) : 'Unknown'
    };
  } catch (error) {
    console.error('Failed to check background fetch status:', error);
    return { status: null, isRegistered: false, statusText: 'Error checking status' };
  }
}

// Helper function to convert background fetch status to text
function getBackgroundFetchStatusText(status: BackgroundFetch.BackgroundFetchStatus) {
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return 'Available';
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return 'Denied';
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return 'Restricted';
    default:
      return 'Unknown';
  }
}

// Function to check the last execution time of the background task
export async function getBackgroundTaskStatus() {
  try {
    // Get the logs to check the last execution time
    const logs = await getBackgroundLogs();
    
    // Find the most recent task start and completion
    const startLogs = logs.filter((log: { message: string }) => 
      log.message.includes('Background fetch task started at')
    );
    
    const completionLogs = logs.filter((log: { message: string }) => 
      log.message.includes('Background fetch task completed successfully') || 
      log.message.includes('Background fetch failed')
    );
    
    const registrationLogs = logs.filter((log: { message: string }) => 
      log.message.includes('Background fetch task registered at')
    );
    
    // Get the last registration time
    const lastRegistration = registrationLogs.length > 0 ? 
      new Date(registrationLogs[0].timestamp) : null;
    
    // Get the last execution start time
    const lastStart = startLogs.length > 0 ? 
      new Date(startLogs[0].timestamp) : null;
    
    // Get the last execution completion time
    const lastCompletion = completionLogs.length > 0 ? 
      new Date(completionLogs[0].timestamp) : null;
    
    // Check registration status
    const registrationStatus = await isBackgroundFetchRegistered();
    
    // Get all registered tasks
    const registeredTasks = await TaskManager.getRegisteredTasksAsync();
    
    return {
      isRegistered: registrationStatus.isRegistered,
      statusText: registrationStatus.statusText,
      lastRegistration: lastRegistration,
      lastExecutionStart: lastStart,
      lastExecutionCompletion: lastCompletion,
      allRegisteredTasks: registeredTasks.map(t => t.taskName)
    };
  } catch (error) {
    console.error('Failed to get background task status:', error);
    return {
      isRegistered: false,
      statusText: 'Error checking status',
      lastRegistration: null,
      lastExecutionStart: null,
      lastExecutionCompletion: null,
      allRegisteredTasks: []
    };
  }
} 