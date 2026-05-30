// agrobridge-app/src/navigation/FarmerStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/farmer/DashboardScreen';
import CropUploadScreen from '../screens/farmer/CropUploadScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createStackNavigator();

export default function FarmerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FarmerHome" component={DashboardScreen} />
      <Stack.Screen name="CropUpload" component={CropUploadScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
