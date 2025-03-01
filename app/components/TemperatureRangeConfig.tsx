import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

interface TemperatureRangeConfigProps {
  lowTemp: string;
  highTemp: string;
  setLowTemp: (value: string) => void;
  setHighTemp: (value: string) => void;
  saveTemperatureRange: () => void;
  showRangeInput: boolean;
  setShowRangeInput: (show: boolean) => void;
}

const TemperatureRangeConfig: React.FC<TemperatureRangeConfigProps> = ({
  lowTemp,
  highTemp,
  setLowTemp,
  setHighTemp,
  saveTemperatureRange,
  showRangeInput,
  setShowRangeInput,
}) => {
  if (!showRangeInput) {
    return (
      <TouchableOpacity 
        style={styles.configButton}
        onPress={() => setShowRangeInput(true)}
      >
        <Text style={styles.buttonText}>Configure Temperature Range</Text>
      </TouchableOpacity>
    );
  }

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
};

export default TemperatureRangeConfig; 