import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

const SettingsPanel = () => {
  const { minTemperature, maxTemperature, setMinTemperature, setMaxTemperature } = useSettingsStore();
  
  const [minTemp, setMinTemp] = useState(minTemperature.toString());
  const [maxTemp, setMaxTemp] = useState(maxTemperature.toString());
  
  // Update local state when store values change
  useEffect(() => {
    setMinTemp(minTemperature.toString());
    setMaxTemp(maxTemperature.toString());
  }, [minTemperature, maxTemperature]);

  const saveSettings = () => {
    const min = parseFloat(minTemp);
    const max = parseFloat(maxTemp);

    if (isNaN(min) || isNaN(max)) {
      Alert.alert('Error', 'Please enter valid numbers for temperature range');
      return;
    }

    if (min >= max) {
      Alert.alert('Error', 'Minimum temperature must be less than maximum temperature');
      return;
    }

    setMinTemperature(min);
    setMaxTemperature(max);
    
    Alert.alert('Success', 'Temperature range settings saved');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Temperature Range Settings</Text>
      
      <View style={styles.inputRow}>
        <Text style={styles.label}>Minimum Temperature (°C):</Text>
        <TextInput
          style={styles.input}
          value={minTemp}
          onChangeText={setMinTemp}
          keyboardType="numeric"
          placeholder="Min temperature"
        />
      </View>
      
      <View style={styles.inputRow}>
        <Text style={styles.label}>Maximum Temperature (°C):</Text>
        <TextInput
          style={styles.input}
          value={maxTemp}
          onChangeText={setMaxTemp}
          keyboardType="numeric"
          placeholder="Max temperature"
        />
      </View>
      
      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputRow: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default SettingsPanel; 