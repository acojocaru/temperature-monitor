import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useDebugStore } from '../stores/debugStore';

interface LogEntry {
  timestamp: string;
  message: string;
}

const DebugPanel = () => {
  // Get values and methods directly from the debug store
  const { 
    toggleDebugInfo,
    registerBackgroundTask,
    unregisterBackgroundTask,
    backgroundStatus,
    logs,
    clearLogs
  } = useDebugStore();
  
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Information</Text>
        <TouchableOpacity style={styles.closeButton} onPress={toggleDebugInfo}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Background Task Status</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Registered:</Text>
          <Text style={[
            styles.statusValue,
            backgroundStatus?.isRegistered ? styles.statusActive : styles.statusInactive
          ]}>
            {backgroundStatus?.isRegistered ? 'Yes' : 'No'}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusValue}>
            {backgroundStatus?.statusText || 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Interval:</Text>
          <Text style={styles.statusValue}>
            {backgroundStatus?.isRegistered ? '15 minutes' : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.registerButton]} 
            onPress={registerBackgroundTask}
            disabled={backgroundStatus?.isRegistered}
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.unregisterButton]} 
            onPress={unregisterBackgroundTask}
            disabled={!backgroundStatus?.isRegistered}
          >
            <Text style={styles.buttonText}>Unregister</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Background Task Logs</Text>
          <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.logContainer}>
          {logs.length === 0 ? (
            <Text style={styles.emptyLogs}>No logs available</Text>
          ) : (
            logs.map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <Text style={styles.logTimestamp}>
                  {formatTimestamp(log.timestamp)}
                </Text>
                <Text style={styles.logMessage}>{log.message}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#495057',
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusLabel: {
    width: 100,
    fontSize: 14,
    color: '#6c757d',
  },
  statusValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  statusActive: {
    color: '#28a745',
  },
  statusInactive: {
    color: '#dc3545',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  registerButton: {
    backgroundColor: '#28a745',
  },
  unregisterButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
  },
  logContainer: {
    maxHeight: 200,
    backgroundColor: '#343a40',
    borderRadius: 5,
    padding: 10,
  },
  emptyLogs: {
    color: '#adb5bd',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  logEntry: {
    marginBottom: 8,
  },
  logTimestamp: {
    color: '#adb5bd',
    fontSize: 10,
    marginBottom: 2,
  },
  logMessage: {
    color: '#f8f9fa',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});

export default DebugPanel; 