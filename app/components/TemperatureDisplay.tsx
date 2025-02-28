import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles';

interface TemperatureDisplayProps {
  temperature: number | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  lowTemp: string;
  highTemp: string;
  isTemperatureInRange: () => boolean;
  formatDateTime: (date: Date) => string;
}

export const TemperatureDisplay: React.FC<TemperatureDisplayProps> = ({
  temperature,
  loading,
  error,
  lastUpdated,
  lowTemp,
  highTemp,
  isTemperatureInRange,
  formatDateTime
}) => {
  if (loading) {
    return <Text style={styles.message}>Loading temperature data...</Text>;
  }

  if (error) {
    return <Text style={styles.errorMessage}>Error: {error}</Text>;
  }

  if (temperature !== null) {
    return (
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
    );
  }

  return null;
}; 