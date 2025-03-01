import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles';

interface AuthenticationSectionProps {
  isAuthenticated: boolean;
  handleLogin: () => void;
  handleLogout: () => void;
}

const AuthenticationSection: React.FC<AuthenticationSectionProps> = ({
  isAuthenticated,
  handleLogin,
  handleLogout,
}) => {
  if (!isAuthenticated) {
    return (
      <TouchableOpacity 
        style={styles.configButton}
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>Login with Viessmann Account</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.clearButton}
      onPress={handleLogout}
    >
      <Text style={styles.buttonText}>Logout</Text>
    </TouchableOpacity>
  );
};

export default AuthenticationSection; 