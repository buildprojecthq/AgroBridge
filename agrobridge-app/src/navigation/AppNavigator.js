// agrobridge-app/src/navigation/AppNavigator.js
import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import Toast from 'react-native-toast-message';
import { scheduleLocalNotification, registerForPushNotificationsAsync } from '../utils/notifications';
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

  // 1) Ask for Notification Permissions globally on app launch
  React.useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) console.log('Push token acquired:', token);
    });
  }, []);

  // 2) Hide splash screen when ready
  React.useEffect(() => {
    if (!loading && languageChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading, languageChecked]);

  // 3) Global Notification Listeners for authenticated users
  React.useEffect(() => {
    if (!user) return;
    
    const userId = user.id || user.uid;

    const messagesChannel = supabase
      .channel('global:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (payload.new && payload.new.sender_id !== userId) {
          const isFarmer = userRole === 'FARMER' || userRole === 'GUEST_FARMER';
          const title = '💬 New Message';
          const body = isFarmer ? 'A buyer wants to negotiate the price.' : 'The farmer has replied to your negotiation.';
          
          Toast.show({
            type: 'info',
            text1: title,
            text2: body,
            position: 'top',
            topOffset: 60,
            visibilityTime: 4000,
          });
          scheduleLocalNotification(title, body);
        }
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('global:orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        if (payload.new) {
          if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
            const title = '💰 Payment Released';
            const body = 'Your funds have been released from Escrow.';
            Toast.show({
              type: 'success',
              text1: title,
              text2: body,
              position: 'top',
              topOffset: 60,
              visibilityTime: 5000,
            });
            scheduleLocalNotification(title, body);
          } else if (payload.new.status === 'shipped' && payload.old.status !== 'shipped') {
            const title = '🚚 Order Dispatched';
            const body = 'Your order is on the way!';
            Toast.show({
              type: 'success',
              text1: title,
              text2: body,
              position: 'top',
              topOffset: 60,
              visibilityTime: 5000,
            });
            scheduleLocalNotification(title, body);
          }
        }
      })
      .subscribe();

    // 3) Global Notification Listeners for authenticated users
    let lastSpoilageAlertTime = 0;
    let isSpoilageAlertActive = false;

    // Listen to storage telemetry for Spoilage / Gas alerts (Threshold: 800)
    const telemetryAlertChannel = supabase
      .channel('global:storage_telemetry_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_telemetry' }, payload => {
        if (!payload.new) return;
        
        const gasLevel = payload.new.gas_level ?? 0;
        const status = payload.new.status ?? '';
        const isCritical = gasLevel >= 800 || status === 'CRITICAL_SPOILAGE_DETECTED';
        const now = Date.now();

        if (isCritical) {
          // Send notification if not alerted recently (5-minute cooldown) or on first spike
          if (!isSpoilageAlertActive || (now - lastSpoilageAlertTime > 5 * 60 * 1000)) {
            lastSpoilageAlertTime = now;
            isSpoilageAlertActive = true;

            const title = '🚨 Critical Spoilage Alert!';
            const body = `Warehouse gas level reached ${gasLevel} PPM (Safe < 800). Auto-exhaust fan triggered!`;

            Toast.show({
              type: 'error',
              text1: title,
              text2: body,
              position: 'top',
              topOffset: 60,
              visibilityTime: 6000,
            });

            scheduleLocalNotification(title, body, {
              type: 'spoilage_alert',
              deviceId: payload.new.device_id,
              gasLevel: gasLevel
            });
          }
        } else {
          // Reset alert state when gas drops back below threshold (< 750)
          if (gasLevel < 750) {
            isSpoilageAlertActive = false;
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(telemetryAlertChannel);
    };
  }, [user, userRole]);

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
