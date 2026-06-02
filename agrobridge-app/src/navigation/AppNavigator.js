// agrobridge-app/src/navigation/AppNavigator.js
import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/farmer/DashboardScreen';
import CropUploadScreen from '../screens/farmer/CropUploadScreen';
import InboxScreen from '../screens/farmer/InboxScreen';
import BuyerDashboard from '../screens/buyer/BuyerDashboard';
import CommodityDetailScreen from '../screens/buyer/CommodityDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import CheckoutScreen from '../screens/buyer/CheckoutScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';

import * as SplashScreen from 'expo-splash-screen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, userRole, loading, language, languageChecked } = useAuth();

  React.useEffect(() => {
    if (!loading && languageChecked) {
      // Hide the native splash screen only once auth and language are fully resolved
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading, languageChecked]);

  // Optionally keep a minimal fade/loading state for deep link transitions, but skip the flash
  if (loading || !languageChecked) {
    return null; // Don't show ActivityIndicator, let the native splash screen hold it
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={!language ? "LanguageSelection" : "Login"}>
        {user === null ? (
          // 1. AUTHENTICATION FLOW (User is not logged in)
          <>
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : userRole === 'FARMER' ? (
          // 2. FARMER FLOW (Authenticated as Farmer)
          <>
            <Stack.Screen name="FarmerHome" component={DashboardScreen} />
            <Stack.Screen name="CropUpload" component={CropUploadScreen} />
            <Stack.Screen name="Inbox" component={InboxScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
          </>
        ) : userRole === 'BUYER' ? (
          // 3. BUYER FLOW (Authenticated as Buyer)
          <>
            <Stack.Screen name="BuyerHome" component={BuyerDashboard} />
            <Stack.Screen name="CommodityDetail" component={CommodityDetailScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
          </>
        ) : (
          // 4. FALLBACK (Authenticated but Firestore registration profile hasn't loaded or role is missing)
          <Stack.Screen name="Register" component={RegisterScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
