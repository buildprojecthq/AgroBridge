import React, { useState } from 'react';
import { Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Switch } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function CheckoutScreen({ route, navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // Default values to prevent crash if accessed directly from details page
  const cropId = route?.params?.cropId || 'mock-id';
  const cropType = route?.params?.cropType || 'Pomegranate';
  const pricePerKg = route?.params?.pricePerKg || 100;
  const initialQty = route?.params?.quantityKg || 1;
  const farmerId = route?.params?.farmerId || 'mock-farmer';

  const [quantity, setQuantity] = useState(initialQty);
  const [escrowEnabled, setEscrowEnabled] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Dynamic invoice calculations matching mockup
  const basePrice = pricePerKg * quantity;
  const freight = 40;
  const gst = 18;
  const discount = 20;
  const totalAmount = basePrice + freight + gst - discount;

  const handlePayment = async () => {
    setProcessing(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      // 1. Insert order as pending_payment first
      const userId = user?.id || user?.uid;
      let newOrderId = 'mock-order-id';

      if (userId) {
        const { data: orderData, error: insertError } = await supabase.from('orders').insert([{
          buyer_id: userId,
          crop_id: cropId === 'mock-id' ? '00000000-0000-0000-0000-000000000000' : cropId,
          quantity: quantity,
          total_price: totalAmount,
          status: 'pending_payment'
        }]).select('id').single();

        if (insertError) throw insertError;
        if (orderData) newOrderId = orderData.id;
      }

      // 2. Call the Edge Function to generate the Cashfree Checkout URL
      const { data, error } = await supabase.functions.invoke('cashfree-integration', {
        body: {
          action: 'createEscrowPayment',
          data: {
            amount: totalAmount,
            cropId: cropId === 'mock-id' ? '00000000-0000-0000-0000-000000000000' : cropId,
            orderId: newOrderId,
            returnUrl: Linking.createURL('Inbox')
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error || !data?.url) {
        throw error || new Error('Failed to generate Cashfree checkout URL');
      }

      // 3. Open the Secure Cashfree Checkout page in the mobile browser
      Linking.openURL(data.url);

      Alert.alert(
        t("Redirecting to Cashfree UPI"),
        t(`Please complete your UPI or card payment. Once done, you will return to the Inbox.`),
        [{ text: t("OK"), onPress: () => navigation.navigate('BuyerHome') }]
      );
    } catch (error) {
      console.error("Checkout Error:", error);
      Alert.alert(t("Transaction Failed"), t("Could not connect to Cashfree. Ensure your Edge Function is deployed."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1 px-5 pt-4 pb-32" showsVerticalScrollIndicator={false}>
        
        {/* Item Card */}
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="bg-red-50 w-12 h-12 rounded-full items-center justify-center mr-3 overflow-hidden">
              <Text style={{ fontSize: 24 }}>🍅</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-medium text-slate-800">{t(cropType)}</Text>
              <TouchableOpacity className="mt-1">
                <Text className="text-green-700 text-xs font-semibold underline">{t('Add more items')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View className="items-end">
            <Text className="text-lg font-bold text-green-700 mb-2">₹{basePrice.toLocaleString('en-IN')}</Text>
            <View className="bg-green-700 rounded-full flex-row items-center px-1 py-1">
              <TouchableOpacity 
                className="w-6 h-6 items-center justify-center"
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text className="text-white font-bold">-</Text>
              </TouchableOpacity>
              <Text className="text-white font-bold px-2 text-sm">{quantity}</Text>
              <TouchableOpacity 
                className="w-6 h-6 items-center justify-center"
                onPress={() => setQuantity(quantity + 1)}
              >
                <Text className="text-white font-bold">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Apply Coupon */}
        <TouchableOpacity className="bg-white rounded-xl py-4 px-4 border border-slate-100 mb-6 shadow-sm flex-row items-center justify-between">
          <Text className="text-green-700 font-bold text-sm">{t('Apply Coupon')}</Text>
        </TouchableOpacity>

        {/* Invoice */}
        <Text className="text-slate-600 text-sm mb-2">{t('Invoice')}</Text>
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between mb-3">
            <Text className="text-slate-600 text-sm">{t('Original Price')}</Text>
            <Text className="text-slate-600 text-sm">₹{basePrice.toLocaleString('en-IN')}</Text>
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-slate-600 text-sm">{t('Delivery')}</Text>
            <Text className="text-red-500 text-sm">+{freight}</Text>
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-slate-600 text-sm">{t('GST')}</Text>
            <Text className="text-red-500 text-sm">+{gst}</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-slate-600 text-sm">{t('Discount')}</Text>
            <Text className="text-slate-600 text-sm">₹{discount}</Text>
          </View>
          <View className="flex-row justify-between items-center mt-1 pt-3 border-t border-slate-50">
            <Text className="text-green-700 font-bold text-xl">{t('Total')}</Text>
            <Text className="text-green-700 font-bold text-xl">₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Shipping Details */}
        <View className="flex-row justify-between items-center mb-2 mt-2">
          <Text className="text-slate-600 text-sm">{t('Shipping Details')}</Text>
          <TouchableOpacity>
            <Text className="text-slate-500 text-sm">{t('Edit')}</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-800 font-medium text-base">Michael Miller</Text>
            <View className="flex-row items-center">
              <Text className="text-green-700 text-xs font-semibold mr-1">{t('Home')}</Text>
              <Ionicons name="chevron-down" size={14} color="#15803d" />
            </View>
          </View>
          <Text className="text-slate-500 text-sm leading-5 mb-3">
            70 Washington Square South, New York, NY 10012, United States
          </Text>
          <Text className="text-slate-500 text-sm">+91 12345 67890</Text>
        </View>

        {/* Add Delivery Instructions */}
        <TouchableOpacity className="bg-white rounded-xl py-4 px-4 border border-slate-100 mb-10 shadow-sm">
          <Text className="text-green-700 font-bold text-sm">{t('Add Delivery Instructions')}</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sticky Payment Footer */}
      <View className="absolute bottom-6 left-5 right-5">
        <TouchableOpacity 
          className="bg-green-700 rounded-full py-4 items-center shadow-lg shadow-green-900/30"
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-bold text-base">{t('Proceed to Checkout')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
