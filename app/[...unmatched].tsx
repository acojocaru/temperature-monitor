import { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getValidAccessToken, exchangeCodeForTokens } from './services/auth';

// Storage keys
const CODE_VERIFIER_KEY = 'viessmann_code_verifier';

export default function UnmatchedRoute() {
  const params = useLocalSearchParams();
  
  useEffect(() => {
    // Handle the OAuth redirect
    const handleOAuthRedirect = async () => {
      try {
        // If we have a code parameter, this is likely an OAuth redirect
        if (params.code) {
          // Get the code verifier from storage
          const codeVerifier = await AsyncStorage.getItem(CODE_VERIFIER_KEY);
          if (!codeVerifier) {
            router.replace('/');
            return;
          }
          
          // Exchange the code for tokens
          try {
            await exchangeCodeForTokens(params.code as string, codeVerifier);
            await getValidAccessToken();
          } catch (error) {
            console.error('Error exchanging code for tokens:', error);
          }
          
          // Redirect to the home screen
          router.replace('/');
        }
      } catch (e) {
        console.error('Error in unmatched route handler:', e);
        router.replace('/');
      }
    };
    
    handleOAuthRedirect();
  }, [params]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redirecting...</Text>
      <Text style={styles.subtitle}>Please wait while we process your login</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
}); 