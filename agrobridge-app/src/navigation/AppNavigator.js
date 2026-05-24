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
import MarketplaceScreen from '../screens/buyer/MarketplaceScreen';
import ChatScreen from '../screens/ChatScreen';
import CheckoutScreen from '../screens/buyer/CheckoutScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, userRole, loading } = useAuth();

  // Show a premium loading spinner while Firebase checks the user's session and database role
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user === null ? (
          // 1. AUTHENTICATION FLOW (User is not logged in)
          <>
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
          </>
        ) : userRole === 'BUYER' ? (
          // 3. BUYER FLOW (Authenticated as Buyer)
          <>
            <Stack.Screen name="BuyerHome" component={MarketplaceScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
          </>
        ) : (
          // 4. FALLBACK (Authenticated but Firestore registration profile hasn't loaded or role is missing)
          <Stack.Screen name="Register" component={RegisterScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}