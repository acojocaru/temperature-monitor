import { Text, View, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
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

// Storage keys
const TEMP_RANGE_STORAGE_KEY = 'temperature_range';

export default function Index() {
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

  // Request permissions and set up background fetch on first load
  useEffect(() => {
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
  }, [showDebugInfo]);

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

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
        <Text style={styles.title}>Temperature Monitor</Text>
        
        {/* Authentication section */}
        {!isAuthenticated ? (
          <TouchableOpacity 
            style={styles.configButton}
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>Login with Viessmann Account</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        )}
        
        {/* Temperature range configuration */}
        {isAuthenticated && !showRangeInput ? (
          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => setShowRangeInput(true)}
          >
            <Text style={styles.buttonText}>Configure Temperature Range</Text>
          </TouchableOpacity>
        ) : null}

        {showRangeInput && (
          <View style={styles.rangeContainer}>
            <View style={styles.rangeInputRow}>
              <Text style={styles.rangeLabel}>Low:</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="Min °C"
                value={lowTemp}
                onChangeText={setLowTemp}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rangeInputRow}>
              <Text style={styles.rangeLabel}>High:</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="Max °C"
                value={highTemp}
                onChangeText={setHighTemp}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={saveTemperatureRange}
            >
              <Text style={styles.buttonText}>Save Range</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Loading indicator */}
        {loading && <Text style={styles.message}>Loading...</Text>}
        
        {/* Error message */}
        {error && <Text style={styles.errorMessage}>Error: {error}</Text>}
        
        {/* Temperature display */}
        {temperature !== null && !loading && !error && (
          <View style={styles.temperatureContainer}>
            <Text style={[
              styles.temperature, 
              isTemperatureInRange() ? styles.tempInRange : styles.tempOutOfRange
            ]}>
              {temperature}°C
            </Text>
            <Text style={styles.description}>Current Outside Temperature</Text>
            {lastUpdated && (
              <Text style={styles.lastUpdated}>
                Last updated: {formatDateTime(lastUpdated)}
              </Text>
            )}
            <Text style={styles.rangeInfo}>
              Target range: {lowTemp}°C - {highTemp}°C
            </Text>
            <Text style={[
              styles.rangeStatus,
              isTemperatureInRange() ? styles.inRangeText : styles.outOfRangeText
            ]}>
              {isTemperatureInRange() ? "Within range" : "Out of range"}
            </Text>
          </View>
        )}
        
        {/* Refresh button - only show if authenticated */}
        {!loading && isAuthenticated && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchTemperature}
          >
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
        )}
        
        {/* Debug section toggle */}
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={toggleDebugInfo}
        >
          <Text style={styles.buttonText}>
            {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
          </Text>
        </TouchableOpacity>
        
        {/* Debug information section */}
        {showDebugInfo && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Information</Text>
            
            {/* Background fetch status */}
            <TouchableOpacity 
              style={styles.debugActionButton}
              onPress={async () => {
                await checkBackgroundStatus();
                await checkDetailedBackgroundStatus();
              }}
            >
              <Text style={styles.buttonText}>Check Background Status</Text>
            </TouchableOpacity>
            
            {backgroundStatus && (
              <View style={styles.statusContainer}>
                <Text style={styles.debugText}>
                  Status: {backgroundStatus.statusText}
                </Text>
                <Text style={styles.debugText}>
                  Registered: {backgroundStatus.isRegistered ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.debugText}>
                  Interval: {backgroundStatus.isRegistered ? '15 minutes' : 'N/A'}
                </Text>
                
                {detailedTaskStatus && (
                  <>
                    <Text style={styles.debugSubtitle}>Task Execution:</Text>
                    <Text style={styles.debugText}>
                      Last Registered: {detailedTaskStatus.lastRegistration 
                        ? new Date(detailedTaskStatus.lastRegistration).toLocaleString() 
                        : 'Never'}
                    </Text>
                    <Text style={styles.debugText}>
                      Last Started: {detailedTaskStatus.lastExecutionStart 
                        ? new Date(detailedTaskStatus.lastExecutionStart).toLocaleString() 
                        : 'Never'}
                    </Text>
                    <Text style={styles.debugText}>
                      Last Completed: {detailedTaskStatus.lastExecutionCompletion 
                        ? new Date(detailedTaskStatus.lastExecutionCompletion).toLocaleString() 
                        : 'Never'}
                    </Text>
                    <Text style={styles.debugText}>
                      Note: System may delay background tasks beyond the requested interval.
                    </Text>
                  </>
                )}
              </View>
            )}
            
            {/* Background task management */}
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.smallActionButton, styles.registerButton]}
                onPress={handleRegisterBackgroundTask}
              >
                <Text style={styles.buttonText}>Register Task</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.smallActionButton, styles.unregisterButton]}
                onPress={handleUnregisterBackgroundTask}
              >
                <Text style={styles.buttonText}>Unregister Task</Text>
              </TouchableOpacity>
            </View>
            
            {/* Background logs */}
            <View style={styles.logsContainer}>
              <View style={styles.logsHeader}>
                <Text style={styles.debugSubtitle}>Background Task Logs</Text>
                <TouchableOpacity 
                  style={styles.smallButton}
                  onPress={loadBackgroundLogs}
                >
                  <Text style={styles.smallButtonText}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.smallButton}
                  onPress={handleClearLogs}
                >
                  <Text style={styles.smallButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
              
              {backgroundLogs.length === 0 ? (
                <Text style={styles.debugText}>No logs available</Text>
              ) : (
                backgroundLogs.map((log, index) => {
                  return (
                    <View key={index} style={styles.logEntry}>
                      <Text style={styles.logTimestamp}>
                        {new Date(log.timestamp).toLocaleString()}
                      </Text>
                      <Text style={styles.logMessage}>{log.message}</Text>
                    </View>
                  );
                }).filter(Boolean)
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

