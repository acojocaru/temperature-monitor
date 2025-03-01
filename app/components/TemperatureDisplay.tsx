import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { styles } from '../styles';

interface TemperatureDisplayProps {
  temperature: number | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  lowTemp: string;
  highTemp: string;
  isTemperatureInRange: () => boolean;
}

const TemperatureDisplay: React.FC<TemperatureDisplayProps> = ({
  temperature,
  loading,
  error,
  lastUpdated,
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

  if (loading) {
    return <Text style={styles.message}>Loading...</Text>;
  }

  if (error) {
    return <Text style={styles.errorMessage}>Error: {error}</Text>;
  }

  if (temperature === null) {
    return null;
  }

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
};

export default TemperatureDisplay; 