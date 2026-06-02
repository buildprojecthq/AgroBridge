import React, { useState } from 'react';
import { Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Switch } from 'react-native';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CheckoutScreen({ route, navigation }) {
  const { user } = useAuth();
  
  // Default values to prevent crash if accessed directly from details page
  const cropId = route?.params?.cropId || 'mock-id';
  const cropType = route?.params?.cropType || 'Premium Corn';
  const pricePerKg = route?.params?.pricePerKg || 260;
  const initialQty = route?.params?.quantityKg || 500;
  const farmerId = route?.params?.farmerId || 'mock-farmer';

  const [quantity, setQuantity] = useState(initialQty);
  const [escrowEnabled, setEscrowEnabled] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Dynamic invoice calculations
  const basePrice = pricePerKg * quantity;
  const freight = 4500;
  const gst = basePrice * 0.05;
  const totalAmount = basePrice + freight + gst;

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // Simulate Payment Gateway processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const orderData = {
        buyerId: user?.uid || 'anonymous',
        farmerId: farmerId,
        cropId: cropId,
        cropName: cropType,
        totalAmount: totalAmount,
        quantityKg: quantity,
        status: escrowEnabled ? 'IN_ESCROW' : 'PAYMENT_COMPLETED',
        createdAt: serverTimestamp()
      };
      
      // Only write to db if we have a real user to prevent crash in mock preview
      if (user?.uid) {
        await addDoc(collection(db, 'orders'), orderData);
        // Only update real crops
        if (cropId !== 'mock-id') {
          const cropRef = doc(db, 'crops', cropId);
          await updateDoc(cropRef, { status: 'SOLD_OUT' });
        }
      }

      Alert.alert(
        "Payment Successful! 🎉",
        `You have successfully secured ${quantity}Kg of ${cropType}.`,
        [{ text: "Back to Market", onPress: () => navigation.navigate('BuyerHome') }]
      );
    } catch (error) {
      console.error("Checkout Error:", error);
      Alert.alert("Transaction Failed", "Could not process your payment at this time.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      
      {/* ── Top Header ── */}
      <View className="bg-white pt-4 pb-4 px-6 border-b border-slate-200 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-slate-800 text-xl font-bold ml-4">Checkout</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6 pb-32" showsVerticalScrollIndicator={false}>
        
        {/* ── Item Summary & Quantity Stepper ── */}
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="bg-orange-50 w-12 h-12 rounded-xl items-center justify-center mr-3">
              <Text style={{ fontSize: 24 }}>🌽</Text>
            </View>
            <View>
              <Text className="text-lg font-bold text-slate-800">{cropType}</Text>
              <Text className="text-slate-500 text-sm">₹{pricePerKg} / kg</Text>
            </View>
          </View>
          
          <View className="bg-green-600 rounded-full flex-row items-center px-1 py-1">
            <TouchableOpacity 
              className="bg-green-700 w-8 h-8 rounded-full items-center justify-center"
              onPress={() => setQuantity(Math.max(100, quantity - 100))}
            >
              <Ionicons name="remove" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-white font-bold px-3">{quantity} kg</Text>
            <TouchableOpacity 
              className="bg-green-700 w-8 h-8 rounded-full items-center justify-center"
              onPress={() => setQuantity(quantity + 100)}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Invoice Breakdown ── */}
        <Text className="text-slate-800 font-bold mb-3 mt-4 text-lg">Invoice</Text>
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between mb-3">
            <Text className="text-slate-500">Base Price</Text>
            <Text className="text-slate-800 font-medium">₹{basePrice.toLocaleString('en-IN')}</Text>
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-slate-500">Freight/Delivery</Text>
            <Text className="text-slate-800 font-medium">₹{freight.toLocaleString('en-IN')}</Text>
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-slate-500">GST (5%)</Text>
            <Text className="text-slate-800 font-medium">₹{gst.toLocaleString('en-IN')}</Text>
          </View>
          <View className="border-b border-slate-200 my-2" />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-slate-800 font-bold text-lg">Total</Text>
            <Text className="text-green-600 font-bold text-xl">₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* ── The "IoT Escrow" Trust Feature ── */}
        <View className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 mb-6 relative overflow-hidden">
          {/* Decorative background icon */}
          <Ionicons name="shield" size={120} color="rgba(16, 185, 129, 0.05)" style={{ position: 'absolute', right: -20, bottom: -20 }} />
          
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={20} color="#166534" />
              <Text className="text-green-800 font-bold text-lg ml-2">AgroBridge Smart Escrow</Text>
            </View>
            <Switch 
              value={escrowEnabled} 
              onValueChange={setEscrowEnabled}
              trackColor={{ false: '#cbd5e1', true: '#22c55e' }}
              thumbColor={'#ffffff'}
            />
          </View>
          <Text className="text-green-700 text-sm mb-2 leading-relaxed">
            Funds are held securely in escrow. The farmer is only paid when the shipment arrives and our IoT hardware verifies the transit conditions remained stable.
          </Text>
        </View>
        
        {/* Extra bottom padding spacer so scroll clears absolute footer */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Sticky Payment Footer ── */}
      <View className="absolute bottom-0 w-full bg-white px-6 pt-4 pb-8 border-t border-slate-200 flex-row justify-between items-center">
        <View>
          <Text className="text-slate-500 text-sm font-medium">Total to pay</Text>
          <Text className="text-2xl font-bold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity 
          className="bg-green-600 rounded-full py-4 px-8 shadow-lg shadow-green-900/30 flex-row items-center"
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-lg">Pay Securely</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
