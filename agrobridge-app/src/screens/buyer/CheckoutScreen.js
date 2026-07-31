import React, { useState } from 'react';
import { Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, Modal } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function CheckoutScreen({ route, navigation }) {
  const { user, userProfile } = useAuth();
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
  
  const [shippingAddress, setShippingAddress] = useState(userProfile?.address || '70 Washington Square South, New York, NY 10012, United States');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [instructionsModalVisible, setInstructionsModalVisible] = useState(false);
  const [tempInstructions, setTempInstructions] = useState('');

  React.useEffect(() => {
    if (userProfile?.address) {
      setShippingAddress(userProfile.address);
    }
  }, [userProfile]);

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

      // 2. Navigate to Mock Payment Screen
      navigation.navigate('MockPayment', {
        orderId: newOrderId,
        amount: totalAmount,
        cropId: cropId === 'mock-id' ? '00000000-0000-0000-0000-000000000000' : cropId,
        quantityPurchased: quantity
      });
    } catch (error) {
      console.error("Checkout Error:", error);
      Alert.alert(t("Transaction Failed"), error.message || String(error));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      {/* ── Sticky Back Button ── */}
      <TouchableOpacity 
        className="absolute top-12 left-5 p-2 bg-slate-100 rounded-full z-50 shadow-sm border border-slate-200" 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color="#334155" />
      </TouchableOpacity>

      <ScrollView className="flex-1 px-5 pt-16 pb-32" showsVerticalScrollIndicator={false}>
        
        {/* Item Card */}
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="bg-red-50 w-12 h-12 rounded-full items-center justify-center mr-3 overflow-hidden">
              <Text style={{ fontSize: 24 }}>🍅</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-medium text-slate-800">{t(cropType)}</Text>
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
          <Text className="text-slate-600 text-sm font-bold">{t('Shipping Address')}</Text>
        </View>
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
          <TextInput
            className="text-slate-600 text-sm leading-5"
            multiline
            value={shippingAddress}
            onChangeText={setShippingAddress}
            placeholder={t('Enter your full address')}
          />
        </View>

        {/* Add Delivery Instructions */}
        <TouchableOpacity 
          className="bg-white rounded-xl py-4 px-4 border border-slate-100 mb-10 shadow-sm"
          onPress={() => {
            setTempInstructions(deliveryInstructions);
            setInstructionsModalVisible(true);
          }}
        >
          {deliveryInstructions ? (
            <Text className="text-slate-600 text-sm font-medium">{deliveryInstructions}</Text>
          ) : (
            <Text className="text-green-700 font-bold text-sm">{t('Add Delivery Instructions')}</Text>
          )}
        </TouchableOpacity>
        
        {/* Instructions Modal */}
        <Modal
          visible={instructionsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInstructionsModalVisible(false)}
        >
          <View className="flex-1 bg-black/40 justify-center items-center px-6">
            <View className="bg-white w-full rounded-3xl p-6 shadow-xl">
              <Text className="text-lg font-bold text-slate-800 mb-4">{t('Delivery Instructions')}</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 h-32"
                multiline
                textAlignVertical="top"
                placeholder={t('E.g. Leave at the front gate')}
                value={tempInstructions}
                onChangeText={setTempInstructions}
              />
              <View className="flex-row justify-end mt-4">
                <TouchableOpacity 
                  className="px-4 py-2 mr-2"
                  onPress={() => setInstructionsModalVisible(false)}
                >
                  <Text className="text-slate-500 font-bold">{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="bg-green-600 px-6 py-2 rounded-xl"
                  onPress={() => {
                    setDeliveryInstructions(tempInstructions);
                    setInstructionsModalVisible(false);
                  }}
                >
                  <Text className="text-white font-bold">{t('Save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
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
