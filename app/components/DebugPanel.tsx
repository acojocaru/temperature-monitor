import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../styles';

interface DebugPanelProps {
  showDebugInfo: boolean;
  toggleDebugInfo: () => void;
  isWeb: boolean;
  backgroundStatus: any;
  detailedTaskStatus: any;
  backgroundLogs: any[];
  checkBackgroundStatus: () => Promise<void>;
  checkDetailedBackgroundStatus: () => Promise<void>;
  loadBackgroundLogs: () => Promise<void>;
  handleClearLogs: () => Promise<void>;
  handleRegisterBackgroundTask: () => Promise<void>;
  handleUnregisterBackgroundTask: () => Promise<void>;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  showDebugInfo,
  toggleDebugInfo,
  isWeb,
  backgroundStatus,
  detailedTaskStatus,
  backgroundLogs,
  checkBackgroundStatus,
  checkDetailedBackgroundStatus,
  loadBackgroundLogs,
  handleClearLogs,
  handleRegisterBackgroundTask,
  handleUnregisterBackgroundTask,
}) => {
  return (
    <>
      {/* Debug section toggle - hide on web */}
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
      
      {/* Debug information section */}
      {showDebugInfo && !isWeb && (
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
              })
            )}
          </View>
        </View>
      )}
    </>
  );
};

export default DebugPanel; 