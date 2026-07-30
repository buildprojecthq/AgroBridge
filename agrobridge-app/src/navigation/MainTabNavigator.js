import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

// Screens
import BuyerDashboard from '../screens/buyer/BuyerDashboard';
import DashboardScreen from '../screens/farmer/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import InboxScreen from '../screens/farmer/InboxScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  
  const isBuyer = userRole === 'BUYER' || userRole === 'GUEST_BUYER';
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#10b981', // Emerald 500
        tabBarInactiveTintColor: '#94a3b8', // Slate 400
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 11,
          marginBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          elevation: 10, 
          backgroundColor: '#ffffff',
          borderRadius: 32,
          height: 64,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          shadowColor: '#10b981', 
          shadowOffset: { width: 0, height: 10 }, 
          shadowOpacity: 0.15, 
          shadowRadius: 20
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Marketplace') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'My Farm') {
            iconName = focused ? 'leaf' : 'leaf-outline';
          } else if (route.name === 'Inbox') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} style={{ marginTop: 4 }} />;
        },
      })}
    >
      {!isBuyer && (
        <Tab.Screen 
          name="My Farm" 
          component={DashboardScreen} 
          options={{ tabBarLabel: t('My Farm') }}
        />
      )}
      <Tab.Screen 
        name="Marketplace" 
        component={BuyerDashboard} 
        options={{ tabBarLabel: t('Marketplace') }}
      />
      <Tab.Screen 
        name="Inbox" 
        component={InboxScreen} 
        options={{ tabBarLabel: isBuyer ? t('Orders & Chats') : t('Sales & Chats') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: t('Profile') }}
      />
    </Tab.Navigator>
  );
}
