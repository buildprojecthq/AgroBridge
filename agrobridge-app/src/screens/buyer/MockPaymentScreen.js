import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useTranslation } from 'react-i18next';

export default function MockPaymentScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { orderId, amount, cropId, quantityPurchased } = route.params;
  const [status, setStatus] = useState('idle'); // idle, processing, success, error

  const handlePayment = async () => {
    setStatus('processing');
    
    // Simulate network delay for realistic feel
    setTimeout(async () => {
      try {
        // Mock successful payment: Update order status to escrow_locked directly
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'escrow_locked' })
          .eq('id', orderId);

        if (orderError) throw orderError;
        
        // Deduct inventory securely using RPC (bypasses RLS so buyer can deduct farmer's crop)
        if (cropId && cropId !== '00000000-0000-0000-0000-000000000000') {
          await supabase.rpc('decrement_crop_quantity', {
            crop_id_param: cropId,
            qty_to_deduct: 99999999 // Forces quantity to 0 so it disappears from the marketplace
          });
        }
        
        setStatus('success');
        
        // Wait 2 seconds on success screen then redirect to Inbox
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { screen: 'Inbox' } }],
          });
        }, 2000);
        
      } catch (err) {
        console.error('Mock Payment Error:', err);
        setStatus('error');
        Alert.alert('Payment Failed', err.message);
      }
    }, 2500);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center px-6">
      <View className="items-center mb-10">
        <View className="bg-emerald-100 p-4 rounded-full mb-4">
          <Ionicons name="shield-checkmark" size={48} color="#10b981" />
        </View>
        <Text className="text-2xl font-bold text-slate-800 text-center">AgroBridge Secure Pay</Text>
        <Text className="text-slate-500 text-center mt-2">Mock Payment Gateway</Text>
      </View>

      <View className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-slate-600 font-medium">Order ID</Text>
          <Text className="text-slate-800 font-bold">{orderId.substring(0, 8).toUpperCase()}</Text>
        </View>
        <View className="flex-row justify-between items-center border-t border-slate-100 pt-6">
          <Text className="text-slate-600 font-medium text-lg">Total Amount</Text>
          <Text className="text-emerald-600 font-bold text-2xl">₹{amount.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {status === 'idle' || status === 'error' ? (
        <TouchableOpacity 
          className="bg-emerald-600 py-4 rounded-2xl items-center shadow-lg shadow-emerald-900/30"
          onPress={handlePayment}
        >
          <Text className="text-white font-bold text-lg">Pay ₹{amount.toLocaleString('en-IN')}</Text>
        </TouchableOpacity>
      ) : null}

      {status === 'processing' && (
        <View className="items-center py-4">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-emerald-700 font-medium mt-4">Processing Payment securely...</Text>
        </View>
      )}

      {status === 'success' && (
        <View className="items-center py-4">
          <View className="bg-green-100 rounded-full p-2 mb-3">
            <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
          </View>
          <Text className="text-green-700 font-bold text-xl">Payment Successful!</Text>
          <Text className="text-green-600 mt-2">Funds are safely locked in Escrow.</Text>
          <Text className="text-slate-400 mt-4">Redirecting to Inbox...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
