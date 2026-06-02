// agrobridge-app/App.js
import './global.css';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import './src/i18n'; // Import i18n configuration
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { 
  useFonts, 
  NotoSans_400Regular, 
  NotoSans_500Medium, 
  NotoSans_600SemiBold, 
  NotoSans_700Bold, 
  NotoSans_800ExtraBold 
} from '@expo-google-fonts/noto-sans';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  let [fontsLoaded] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
    NotoSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null; // Don't show ActivityIndicator, let the native splash screen hold it
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}