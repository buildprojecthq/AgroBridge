// agrobridge-app/src/navigation/AppNavigator.js
import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
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
import MockPaymentScreen from '../screens/buyer/MockPaymentScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import MainTabNavigator from './MainTabNavigator';

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

  // Show a minimal loading state for deep link transitions and auth state changes to prevent black screens
  if (loading || !languageChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const linking = {
    prefixes: [Linking.createURL('/')],
    config: {
      screens: {
        MainTabs: {
          screens: {
            Inbox: 'Inbox'
          }
        }
      }
    }
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user === null ? (
          // 1. AUTHENTICATION FLOW (User is not logged in)
          <>
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // 2. AUTHENTICATED FLOW (Unified Bottom Tabs for all users)
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="CropUpload" component={CropUploadScreen} />
            <Stack.Screen name="Inbox" component={InboxScreen} />
            <Stack.Screen name="CommodityDetail" component={CommodityDetailScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="MockPayment" component={MockPaymentScreen} />
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
