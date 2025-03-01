import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { styles } from '../styles';
import { TemperatureData } from '../hooks/useTemperature';

interface TemperatureDisplayProps {
  data?: TemperatureData;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lowTemp: string;
  highTemp: string;
  isTemperatureInRange: () => boolean;
}

const TemperatureDisplay: React.FC<TemperatureDisplayProps> = ({
  data,
  isLoading,
  isError,
  error,
  lowTemp,
  highTemp,
  isTemperatureInRange,
}) => {
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.message}>Loading temperature data...</Text>
      </View>
    );
  }

  if (isError) {
    return <Text style={styles.errorMessage}>Error: {error?.message || 'Failed to fetch temperature'}</Text>;
  }

  if (!data) {
    return <Text style={styles.message}>No temperature data available</Text>;
  }

  return (
    <View style={styles.temperatureContainer}>
      <Text style={[
        styles.temperature, 
        isTemperatureInRange() ? styles.tempInRange : styles.tempOutOfRange
      ]}>
        {data.temperature}°C
      </Text>
      <Text style={styles.description}>Current Outside Temperature</Text>
      {data.lastUpdated && (
        <Text style={styles.lastUpdated}>
          Last updated: {formatDateTime(data.lastUpdated)}
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
  );
};

export default TemperatureDisplay; 