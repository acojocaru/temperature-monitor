import { View, ScrollView, Alert, Platform } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './styles';
import * as Linking from 'expo-linking';
import { 
  registerBackgroundFetch, 
  requestNotificationsPermissions,
  updateLastTemperature,
  isBackgroundFetchRegistered,
  getBackgroundLogs,
  clearBackgroundLogs,
  unregisterBackgroundFetch,
  getBackgroundTaskStatus
} from './services/notifications';
import {
  startAuthentication,
  getValidAccessToken,
  logout
} from './services/auth';

// Components
import TemperatureDisplay from './components/TemperatureDisplay';
import TemperatureRangeConfig from './components/TemperatureRangeConfig';
import AuthenticationSection from './components/AuthenticationSection';
import DebugPanel from './components/DebugPanel';
import RefreshButton from './components/RefreshButton';
import Header from './components/Header';

// Storage keys
const TEMP_RANGE_STORAGE_KEY = 'temperature_range';

export default function TemperatureMonitor() {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [previousTemperature, setPreviousTemperature] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lowTemp, setLowTemp] = useState<string>("15");
  const [highTemp, setHighTemp] = useState<string>("25");
  const [showRangeInput, setShowRangeInput] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState<any>(null);
  const [backgroundLogs, setBackgroundLogs] = useState<any[]>([]);
  const [detailedTaskStatus, setDetailedTaskStatus] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isWeb, setIsWeb] = useState(false);

  // Load temperature range from storage on component mount
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        // Check if we have a valid token
        try {
          await getValidAccessToken();
          setIsAuthenticated(true);
        } catch (err) {
          setIsAuthenticated(false);
        }
        
        // Load temperature range with error handling
        try {
          const savedRange = await AsyncStorage.getItem(TEMP_RANGE_STORAGE_KEY);
          if (savedRange) {
            const { low, high } = JSON.parse(savedRange);
            setLowTemp(low.toString());
            setHighTemp(high.toString());
          }
        } catch (storageError) {
          console.error('Error loading temperature range:', storageError);
          // Continue with default values if loading fails
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading stored data:', err);
        setLoading(false);
      }
    };
    
    loadStoredData();
  }, []);
  
  // Check authentication status when app comes to foreground
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        await getValidAccessToken();
        if (!isAuthenticated) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        if (isAuthenticated) {
          setIsAuthenticated(false);
        }
      }
    };
    
    // Add event listener for when the app comes to the foreground
    const subscription = Linking.addEventListener('url', () => {
      checkAuthStatus();
    });
    
    // Check auth status on mount
    checkAuthStatus();
    
    // Clean up subscription
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Set up scheduled fetching
  useEffect(() => {
    if (isAuthenticated) {
      // Initial fetch
      fetchTemperature();
      
      // Set up timer for next fetch at the next 15-minute mark
      const setupNextFetch = () => {
        const now = new Date();
        const minutes = now.getMinutes();
        const secondsToNextQuarter = ((15 - (minutes % 15)) * 60) - now.getSeconds();
        
        // Clear any existing timers
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Set timer for next fetch
        timerRef.current = setTimeout(() => {
          fetchTemperature();
          // After fetching, set up the next 15-minute interval
          intervalRef.current = setInterval(() => {
            fetchTemperature();
          }, 15 * 60 * 1000);
        }, secondsToNextQuarter * 1000);
      };
      
      setupNextFetch();
      
      // Cleanup function
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Check platform on mount
  useEffect(() => {
    setIsWeb(Platform.OS === 'web');
  }, []);

  // Request permissions and set up background fetch on first load
  useEffect(() => {
    // Skip background task setup on web
    if (isWeb) return;

    const setupNotifications = async () => {
      try {
        console.log('Setting up notifications and background fetch...');
        const permissionsGranted = await requestNotificationsPermissions();
        
        if (permissionsGranted) {
          console.log('Notification permissions granted, setting up background fetch');
          
          // Check if background fetch is already registered
          const status = await isBackgroundFetchRegistered();
          console.log('Background fetch status check:', JSON.stringify(status));
          
          if (!status.isRegistered) {
            console.log('Background fetch not registered, registering now');
            const result = await registerBackgroundFetch();
            console.log('Background fetch registration result:', result);
            
            // Verify registration was successful
            const verifyStatus = await isBackgroundFetchRegistered();
            console.log('Verification status after registration:', JSON.stringify(verifyStatus));
          } else {
            console.log('Background fetch already registered with status:', status.statusText);
          }
          
          // Load background logs to see if tasks are running
          const logs = await getBackgroundLogs();
          console.log(`Found ${logs.length} background logs`);
        } else {
          console.log('Notification permissions not granted');
        }
      } catch (error) {
        console.error('Error setting up notifications and background fetch:', error);
      }
    };
    
    setupNotifications();
    
    // Re-check background task status periodically
    const backgroundStatusInterval = setInterval(async () => {
      if (showDebugInfo) {
        await checkBackgroundStatus();
        await checkDetailedBackgroundStatus();
        await loadBackgroundLogs();
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(backgroundStatusInterval);
    };
  }, [showDebugInfo, isWeb]);

  const fetchTemperature = async () => {
    try {
      setLoading(true);
      
      // Get a valid token (will refresh if needed)
      const token = await getValidAccessToken();
      
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
      // Access the temperature value from the correct path in the response
      const tempValue = data.data.properties.value.value;
      
      // Store previous temperature before updating
      if (temperature !== null) {
        setPreviousTemperature(temperature);
      }
      
      setTemperature(tempValue);
      setLastUpdated(new Date());
      setError(null);
      
      // Update last temperature in storage for background checks
      await updateLastTemperature(tempValue);
      
      // Check for temperature range transitions
      checkTemperatureTransition(tempValue);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching temperature:', err);
      
      // If there's an authentication error, set isAuthenticated to false
      if (err instanceof Error && 
          (err.message.includes('token') || err.message.includes('auth'))) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkTemperatureTransition = (currentTemp: number) => {
    if (previousTemperature === null) return;
    
    const low = parseFloat(lowTemp);
    const high = parseFloat(highTemp);
    
    // Check if temperature was outside range and is now inside
    const wasOutside = previousTemperature < low || previousTemperature > high;
    const isInside = currentTemp >= low && currentTemp <= high;
    
    if (wasOutside && isInside) {
      Alert.alert(
        "Temperature Update",
        `Temperature (${currentTemp}°C) is now within the desired range (${low}°C - ${high}°C).`
      );
    }
    
    // Check if temperature was inside range and is now outside
    const wasInside = previousTemperature >= low && previousTemperature <= high;
    const isOutside = currentTemp < low || currentTemp > high;
    
    if (wasInside && isOutside) {
      Alert.alert(
        "Temperature Alert",
        currentTemp < low
          ? `Temperature (${currentTemp}°C) has fallen below the minimum threshold (${low}°C).`
          : `Temperature (${currentTemp}°C) has exceeded the maximum threshold (${high}°C).`
      );
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await startAuthentication();
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Unregister background fetch when logging out
      await unregisterBackgroundFetch();
      await logout();
      setIsAuthenticated(false);
      setTemperature(null);
      setPreviousTemperature(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const saveTemperatureRange = async () => {
    try {
      // Validate inputs
      const low = parseFloat(lowTemp);
      const high = parseFloat(highTemp);
      
      if (isNaN(low) || isNaN(high)) {
        setError('Please enter valid numbers for temperature range');
        return;
      }
      
      if (low >= high) {
        setError('Low temperature must be less than high temperature');
        return;
      }
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(
        TEMP_RANGE_STORAGE_KEY, 
        JSON.stringify({ low, high })
      );
      
      setShowRangeInput(false);
      setError(null);
    } catch (err) {
      console.error('Error saving temperature range:', err);
      setError('Failed to save temperature range');
    }
  };

  const isTemperatureInRange = () => {
    if (temperature === null) return false;
    
    const low = parseFloat(lowTemp);
    const high = parseFloat(highTemp);
    
    return temperature >= low && temperature <= high;
  };

  const checkBackgroundStatus = async () => {
    const status = await isBackgroundFetchRegistered();
    setBackgroundStatus(status);
  };

  const checkDetailedBackgroundStatus = async () => {
    const status = await getBackgroundTaskStatus();
    setDetailedTaskStatus(status);
  };

  const loadBackgroundLogs = async () => {
    const logs = await getBackgroundLogs();
    setBackgroundLogs(logs);
  };

  const handleClearLogs = async () => {
    await clearBackgroundLogs();
    setBackgroundLogs([]);
  };

  const handleRegisterBackgroundTask = async () => {
    const result = await registerBackgroundFetch();
    if (result) {
      Alert.alert('Success', 'Background fetch task registered successfully');
      await checkBackgroundStatus();
    } else {
      Alert.alert('Error', 'Failed to register background fetch task');
    }
  };

  const handleUnregisterBackgroundTask = async () => {
    const result = await unregisterBackgroundFetch();
    if (result) {
      Alert.alert('Success', 'Background fetch task unregistered successfully');
      await checkBackgroundStatus();
    } else {
      Alert.alert('Error', 'Failed to unregister background fetch task');
    }
  };

  const toggleDebugInfo = async () => {
    // Don't allow toggling debug info on web
    if (isWeb) {
      Alert.alert('Not Available', 'Background tasks are not supported in web environments.');
      return;
    }
    
    const newState = !showDebugInfo;
    setShowDebugInfo(newState);
    
    if (newState) {
      await checkBackgroundStatus();
      await checkDetailedBackgroundStatus();
      await loadBackgroundLogs();
    }
  };

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Header title="Temperature Monitor" />
        
        {/* Authentication section */}
        <AuthenticationSection 
          isAuthenticated={isAuthenticated}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />
        
        {/* Temperature range configuration */}
        {isAuthenticated && (
          <TemperatureRangeConfig
            lowTemp={lowTemp}
            highTemp={highTemp}
            setLowTemp={setLowTemp}
            setHighTemp={setHighTemp}
            saveTemperatureRange={saveTemperatureRange}
            showRangeInput={showRangeInput}
            setShowRangeInput={setShowRangeInput}
          />
        )}
        
        {/* Temperature display */}
        <TemperatureDisplay
          temperature={temperature}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          lowTemp={lowTemp}
          highTemp={highTemp}
          isTemperatureInRange={isTemperatureInRange}
        />
        
        {/* Refresh button - only show if authenticated */}
        {!loading && isAuthenticated && (
          <RefreshButton 
            onPress={fetchTemperature}
            loading={loading}
          />
        )}
        
        {/* Debug panel */}
        <DebugPanel
          showDebugInfo={showDebugInfo}
          toggleDebugInfo={toggleDebugInfo}
          isWeb={isWeb}
          backgroundStatus={backgroundStatus}
          detailedTaskStatus={detailedTaskStatus}
          backgroundLogs={backgroundLogs}
          checkBackgroundStatus={checkBackgroundStatus}
          checkDetailedBackgroundStatus={checkDetailedBackgroundStatus}
          loadBackgroundLogs={loadBackgroundLogs}
          handleClearLogs={handleClearLogs}
          handleRegisterBackgroundTask={handleRegisterBackgroundTask}
          handleUnregisterBackgroundTask={handleUnregisterBackgroundTask}
        />
      </View>
    </ScrollView>
  );
}
