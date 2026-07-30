// agrobridge-app/App.js
import './global.css';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import './src/i18n'; // Import i18n configuration
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { 
  useFonts, 
  PlusJakartaSans_400Regular, 
  PlusJakartaSans_500Medium, 
  PlusJakartaSans_600SemiBold, 
  PlusJakartaSans_700Bold, 
  PlusJakartaSans_800ExtraBold 
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { registerForPushNotificationsAsync } from './src/utils/notifications';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  let [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Force Immersive Fullscreen Mode on Android and Setup Notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      console.log('App initialization push token:', token);
    });

    if (Platform.OS === 'android') {
      const configureNavBar = async () => {
        try {
          if (NavigationBar && typeof NavigationBar.setVisibilityAsync === 'function') {
            await NavigationBar.setVisibilityAsync("hidden");
            await NavigationBar.setBehaviorAsync("overlay-swipe");
          }
        } catch (e) {
          // It is common for this to fail during hot-reloads if the activity is temporarily unavailable
          // We can safely ignore this specific error
          if (!String(e).includes("The current activity is no longer available")) {
            console.warn("Navigation bar config error:", e);
          }
        }
      };
      // Add a tiny delay to ensure the native activity is fully attached after splash screen
      setTimeout(configureNavBar, 100);
    }
  }, []);

  if (!fontsLoaded) {
    return null; // Don't show ActivityIndicator, let the native splash screen hold it
  }

  return (
    <SafeAreaProvider>
      <StatusBar hidden={true} style="light" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}