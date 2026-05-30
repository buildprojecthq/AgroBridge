// agrobridge-app/src/navigation/BuyerStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MarketplaceScreen from '../screens/buyer/MarketplaceScreen';
import CheckoutScreen from '../screens/buyer/CheckoutScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createStackNavigator();

export default function BuyerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BuyerHome" component={MarketplaceScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
