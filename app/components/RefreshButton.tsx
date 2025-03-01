import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles';

interface RefreshButtonProps {
  onPress: () => void;
  loading: boolean;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ onPress, loading }) => {
  return (
    <TouchableOpacity 
      style={styles.refreshButton}
      onPress={onPress}
      disabled={loading}
    >
      <Text style={styles.buttonText}>Refresh</Text>
    </TouchableOpacity>
  );
};

export default RefreshButton; 