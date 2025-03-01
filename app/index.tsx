import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useTemperature } from "./hooks/useTemperature";
import { useAuthStore } from "./stores/authStore";
import { useDebugStore } from "./stores/debugStore";
import { useTemperatureStore } from "./stores/temperatureStore";
import LoginForm from "./components/LoginForm";
import TemperatureDisplay from "./components/TemperatureDisplay";
import DebugPanel from "./components/DebugPanel";
import SettingsPanel from "./components/SettingsPanel";

export default function TemperatureMonitor() {
  const isWeb = Platform.OS === 'web';
  const [showSettings, setShowSettings] = useState(false);
  
  // Auth store
  const { isAuthenticated, logout } = useAuthStore();
  
  // Debug store
  const { 
    showDebugInfo, 
    toggleDebugInfo, 
    checkBackgroundStatus,
    registerBackgroundTask,
    unregisterBackgroundTask,
    backgroundStatus,
    loadLogs,
    clearLogs,
    logs
  } = useDebugStore();
  
  // Temperature store
  const { processNewTemperature } = useTemperatureStore();
  
  // Temperature data from API
  const { 
    data: temperatureData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useTemperature();
  
  // Process new temperature data when it arrives
  useEffect(() => {
    if (temperatureData) {
      processNewTemperature(temperatureData.temperature);
    }
  }, [temperatureData, processNewTemperature]);
  
  // Check background status on component mount
  useEffect(() => {
    if (!isWeb) {
      checkBackgroundStatus();
    }
  }, [checkBackgroundStatus, isWeb]);
  
  const handleLogout = () => {
    logout();
  };
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <StatusBar style="auto" />
        
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Temperature Monitor</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={toggleSettings}
            >
              <Text style={styles.buttonText}>
                {showSettings ? "Hide Settings" : "Settings"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TemperatureDisplay 
          temperatureData={temperatureData}
          isLoading={isLoading}
          isError={isError}
          error={error}
          refetch={refetch}
        />
        
        {showSettings && <SettingsPanel />}
        
        {!isWeb && (
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={toggleDebugInfo}
          >
            <Text style={styles.buttonText}>
              {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
            </Text>
          </TouchableOpacity>
        )}
        
        {!isWeb && showDebugInfo && (
          <DebugPanel />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    flexDirection: "column",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  headerButtons: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginRight: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "500",
  },
  debugButton: {
    backgroundColor: "#6c757d",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 20,
    alignSelf: "center",
  }
});
