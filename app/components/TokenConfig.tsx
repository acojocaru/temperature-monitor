import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

interface TokenConfigProps {
  token: string;
  showTokenInput: boolean;
  setToken: (token: string) => void;
  setShowTokenInput: (show: boolean) => void;
  saveToken: () => void;
  clearToken: () => void;
}

export const TokenConfig: React.FC<TokenConfigProps> = ({
  token,
  showTokenInput,
  setToken,
  setShowTokenInput,
  saveToken,
  clearToken
}) => {
  if (!token && !showTokenInput) {
    return (
      <TouchableOpacity 
        style={styles.configButton}
        onPress={() => setShowTokenInput(true)}
      >
        <Text style={styles.buttonText}>Configure API Token</Text>
      </TouchableOpacity>
    );
  }

  if (showTokenInput) {
    return (
      <View style={styles.tokenContainer}>
        <TextInput
          style={styles.tokenInput}
          placeholder="Enter your Viessmann API token"
          value={token}
          onChangeText={setToken}
          secureTextEntry={true}
        />
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveToken}
        >
          <Text style={styles.buttonText}>Save Token</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (token && !showTokenInput) {
    return (
      <View style={styles.tokenButtonsContainer}>
        <TouchableOpacity 
          style={styles.configButton}
          onPress={() => setShowTokenInput(true)}
        >
          <Text style={styles.buttonText}>Change API Token</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={clearToken}
        >
          <Text style={styles.buttonText}>Clear Token</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}; 