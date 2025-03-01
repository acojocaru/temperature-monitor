import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { TemperatureData } from '../hooks/useTemperature';
import { useSettingsStore } from '../stores/settingsStore';
import { useTemperatureStore } from '../stores/temperatureStore';

interface TemperatureDisplayProps {
  temperatureData?: TemperatureData;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

const TemperatureDisplay = ({
  temperatureData,
  isLoading,
  isError,
  error,
  refetch
}: TemperatureDisplayProps) => {
  // Get values from stores
  const { minTemperature, maxTemperature } = useSettingsStore();
  const { currentTemperature, previousTemperature } = useTemperatureStore();
  
  const isTemperatureInRange = () => {
    if (currentTemperature === null) return false;
    return currentTemperature >= minTemperature && currentTemperature <= maxTemperature;
  };
  
  const getTemperatureChangeText = () => {
    if (currentTemperature === null || previousTemperature === null) {
      return 'No previous data';
    }
    
    const diff = currentTemperature - previousTemperature;
    if (diff === 0) return 'No change';
    
    const direction = diff > 0 ? 'up' : 'down';
    return `${Math.abs(diff).toFixed(1)}°C ${direction}`;
  };
  
  const formatDate = (date?: Date) => {
    if (!date) return 'Unknown';
    return date.toLocaleString();
  };
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading temperature data...</Text>
      </View>
    );
  }
  
  if (isError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading temperature data</Text>
        <Text style={styles.errorDetails}>{error?.message || 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={[
        styles.temperatureCard,
        isTemperatureInRange() ? styles.inRangeCard : styles.outOfRangeCard
      ]}>
        <Text style={styles.temperatureValue}>
          {currentTemperature !== null ? `${currentTemperature.toFixed(1)}°C` : 'N/A'}
        </Text>
        
        <Text style={styles.temperatureStatus}>
          {currentTemperature !== null ? (
            isTemperatureInRange() 
              ? '✓ Within desired range' 
              : '⚠️ Outside desired range'
          ) : 'No data'}
        </Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Range:</Text>
            <Text style={styles.detailValue}>
              {minTemperature.toFixed(1)}°C - {maxTemperature.toFixed(1)}°C
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Change:</Text>
            <Text style={styles.detailValue}>{getTemperatureChangeText()}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Updated:</Text>
            <Text style={styles.detailValue}>{formatDate(temperatureData?.lastUpdated)}</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.refreshButton} onPress={refetch}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  temperatureCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inRangeCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
  },
  outOfRangeCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#F44336',
  },
  temperatureValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  temperatureStatus: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555',
  },
  detailsContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default TemperatureDisplay; 