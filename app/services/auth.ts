import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Storage keys
const TOKEN_STORAGE_KEY = 'viessmann_api_token';
const REFRESH_TOKEN_KEY = 'viessmann_refresh_token';
const TOKEN_EXPIRY_KEY = 'viessmann_token_expiry';
const CODE_VERIFIER_KEY = 'viessmann_code_verifier';

// OAuth configuration
const CLIENT_ID = ''; // Replace with your actual client ID
const REDIRECT_URI = __DEV__ 
  ? 'http://localhost:8081'
  : 'temperaturenotifier://';

// Generate a random string for code verifier
const generateCodeVerifier = (): string => {
  // Code verifier should be between 43-128 characters
  // Using 64 characters for a good balance
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(64);
  
  // Use crypto.getRandomValues for better randomness
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < 43; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
};

// Generate code challenge from verifier using SHA-256 and base64url encoding
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  // 1. Create a SHA-256 hash of the code verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  // 2. Base64url encode the hash
  return base64UrlEncode(digest);
};

// Base64Url encode without using Buffer
const base64UrlEncode = (arrayBuffer: ArrayBuffer): string => {
  // Convert ArrayBuffer to Base64
  const bytes = new Uint8Array(arrayBuffer);
  let base64 = '';
  const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;
  
  let a, b, c, d;
  let chunk;
  
  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    
    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12;   // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6;      // 4032     = (2^6 - 1) << 6
    d = chunk & 63;               // 63       = 2^6 - 1
    
    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }
  
  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    chunk = bytes[mainLength];
    
    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
    
    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4;   // 3   = 2^2 - 1
    
    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    
    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4;   // 1008  = (2^6 - 1) << 4
    
    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2;     // 15    = 2^4 - 1
    
    base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }
  
  // Convert to base64url format
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Start the OAuth flow
export const startAuthentication = async (): Promise<void> => {
  try {
    console.log("Starting authentication process");
    
    // Generate and store code verifier
    const codeVerifier = generateCodeVerifier();
    await AsyncStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
    console.log("Generated code verifier:", codeVerifier.substring(0, 10) + "...");
    
    // Generate code challenge
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    console.log("Generated code challenge:", codeChallenge.substring(0, 10) + "...");
    
    // Construct authorization URL
    const authUrl = `https://iam.viessmann.com/idp/v3/authorize?` +
      `client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent('IoT User offline_access')}` +
      `&response_type=code` +
      `&code_challenge_method=S256` +
      `&code_challenge=${codeChallenge}`;
    
    console.log("Auth URL:", authUrl);
    console.log("Redirect URI:", REDIRECT_URI);
    
    if (__DEV__) {
      // Development mode handling
      console.log("Opening auth in development mode");
      
      // For web platform in development, we need a different approach
      if (Platform.OS === 'web') {
        console.log("Running on web platform, using window.open");
        
        // For web, we'll use window.open and poll for changes
        const authWindow = window.open(authUrl, '_blank');
        
        if (!authWindow) {
          throw new Error('Failed to open authentication window. Please allow popups for this site.');
        }
        
        // Poll for redirect
        return new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            try {
              // Check if we can access the window location
              if (authWindow.closed) {
                clearInterval(checkInterval);
                reject(new Error('Authentication window was closed'));
                return;
              }
              
              // Try to access the current URL (may throw if cross-origin)
              const currentUrl = authWindow.location.href;
              console.log("Current auth window URL:", currentUrl);
              
              // Check if we're back at our redirect URI
              if (currentUrl.startsWith(REDIRECT_URI)) {
                clearInterval(checkInterval);
                authWindow.close();
                
                // Parse the URL to get the code
                const url = new URL(currentUrl);
                const code = url.searchParams.get('code');
                
                if (code) {
                  console.log("Got authorization code:", code.substring(0, 5) + "...");
                  // Store the code verifier again to ensure it's the same one used for the request
                  AsyncStorage.setItem(CODE_VERIFIER_KEY, codeVerifier).then(() => {
                    exchangeCodeForTokens(code, codeVerifier)
                      .then(resolve)
                      .catch(reject);
                  });
                } else {
                  reject(new Error('No code found in redirect URL'));
                }
              }
            } catch (e) {
              // Ignore cross-origin errors during polling
              // console.log("Polling error (likely cross-origin):", e);
            }
          }, 500);
          
          // Set a timeout to prevent infinite polling
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!authWindow.closed) {
              authWindow.close();
            }
            reject(new Error('Authentication timed out after 5 minutes'));
          }, 5 * 60 * 1000);
        });
      } else {
        // Native platforms
        const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
        console.log("WebBrowser result:", JSON.stringify(result));
        
        // Check if we got a successful result
        if (result.type === 'success' && result.url) {
          console.log("Got successful redirect:", result.url);
          
          // Parse the URL to get the code
          const url = new URL(result.url);
          const code = url.searchParams.get('code');
          
          if (code) {
            console.log("Got authorization code:", code.substring(0, 5) + "...");
            await exchangeCodeForTokens(code, codeVerifier);
            return;
          } else {
            console.error("No code found in redirect URL:", result.url);
            throw new Error('No code found in redirect URL');
          }
        } else {
          console.error("WebBrowser did not return success:", result.type);
          throw new Error(`Authentication failed: ${result.type}`);
        }
      }
    } else {
      // Production mode handling with deep linking
      return new Promise((resolve, reject) => {
        // Set up URL listener
        const subscription = Linking.addEventListener('url', async (event) => {
          try {
            // Handle the redirect URL
            const { url } = event;
            console.log("Got redirect URL:", url);
            
            if (url.includes('code=')) {
              // Extract the authorization code from URL
              const code = url.split('code=')[1].split('&')[0];
              
              if (code) {
                // Exchange code for tokens
                await exchangeCodeForTokens(code, codeVerifier);
                
                // Remove the event listener
                subscription.remove();
                
                resolve();
              } else {
                reject(new Error('No code found in redirect URL'));
              }
            }
          } catch (error) {
            subscription.remove();
            reject(error);
          }
        });
        
        // Open browser for authentication
        WebBrowser.openAuthSessionAsync(
          authUrl,
          REDIRECT_URI
        ).catch(error => {
          subscription.remove();
          reject(error);
        });
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

// Exchange authorization code for tokens
const exchangeCodeForTokens = async (code: string, codeVerifier: string): Promise<void> => {
  try {
    console.log("Exchanging code for tokens");
    console.log("Code:", code.substring(0, 5) + "...");
    console.log("Code verifier:", codeVerifier.substring(0, 10) + "...");
    
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
      code: code,
    });
    
    console.log("Token request params:", params.toString());
    
    const response = await fetch('https://iam.viessmann.com/idp/v3/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    const responseText = await response.text();
    console.log("Token response status:", response.status);
    console.log("Token response body:", responseText);
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}\n\nThe response body from ${response.url} is:\n${responseText}`);
    }
    
    // Parse the JSON response
    const data = JSON.parse(responseText);
    
    if (!data.access_token) {
      throw new Error(`No access token in response: ${responseText}`);
    }
    
    console.log("Received access token:", data.access_token.substring(0, 10) + "...");
    if (data.refresh_token) {
      console.log("Received refresh token:", data.refresh_token.substring(0, 10) + "...");
    }
    
    // Calculate token expiry time (current time + expires_in seconds)
    const expiryTime = Date.now() + (data.expires_in * 1000);
    
    // Store tokens and expiry
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    if (data.refresh_token) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    }
    await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    console.log("Tokens stored successfully");
    
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

// Refresh the access token using refresh token
export const refreshAccessToken = async (): Promise<string> => {
  try {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch('https://iam.viessmann.com/idp/v3/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Calculate new expiry time
    const expiryTime = Date.now() + (data.expires_in * 1000);
    
    // Store new tokens and expiry
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    if (data.refresh_token) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    }
    await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

// Get a valid access token (refreshes if needed)
export const getValidAccessToken = async (): Promise<string> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    const expiryTimeStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiryTimeStr) {
      throw new Error('No token available');
    }
    
    const expiryTime = parseInt(expiryTimeStr, 10);
    const currentTime = Date.now();
    
    // If token is expired or about to expire in the next 5 minutes
    if (currentTime >= expiryTime - 5 * 60 * 1000) {
      return await refreshAccessToken();
    }
    
    return token;
  } catch (error) {
    console.error('Error getting valid token:', error);
    throw error;
  }
};

// Clear all authentication data
export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);
    await AsyncStorage.removeItem(CODE_VERIFIER_KEY);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}; 