import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <Text style={styles.title}>{title}</Text>
  );
};

export default Header; 