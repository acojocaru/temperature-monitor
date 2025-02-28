import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

interface TemperatureRangeConfigProps {
  token: string;
  showRangeInput: boolean;
  lowTemp: string;
  highTemp: string;
  setShowRangeInput: (show: boolean) => void;
  setLowTemp: (temp: string) => void;
  setHighTemp: (temp: string) => void;
  saveTemperatureRange: () => void;
}

export const TemperatureRangeConfig: React.FC<TemperatureRangeConfigProps> = ({
  token,
  showRangeInput,
  lowTemp,
  highTemp,
  setShowRangeInput,
  setLowTemp,
  setHighTemp,
  saveTemperatureRange
}) => {
  if (token && !showRangeInput) {
    return (
      <TouchableOpacity 
        style={styles.configButton}
        onPress={() => setShowRangeInput(true)}
      >
        <Text style={styles.buttonText}>Configure Temperature Range</Text>
      </TouchableOpacity>
    );
  }

  if (showRangeInput) {
    return (
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
    );
  }

  return null;
}; 