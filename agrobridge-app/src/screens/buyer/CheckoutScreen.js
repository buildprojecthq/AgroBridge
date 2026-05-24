// agrobridge-app/src/screens/buyer/CheckoutScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function CheckoutScreen({ route, navigation }) {
  const { user } = useAuth();
  // Receive the crop details passed from the Marketplace screen
  const { cropId, cropType, pricePerKg, quantityKg, farmerId } = route.params;

  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const totalAmount = pricePerKg * quantityKg;

  const handlePayment = async () => {
    if (!cardNumber || !expiry || !cvv) {
      Alert.alert("Error", "Please fill in all dummy card details.");
      return;
    }

    setProcessing(true);

    try {
      // 1. Simulate Stripe Network Delay (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Create the Order Document in Firestore
      const orderData = {
        buyerId: user.uid,
        farmerId: farmerId,
        cropId: cropId,
        cropName: cropType,
        totalAmount: totalAmount,
        quantityKg: quantityKg,
        status: 'PAYMENT_COMPLETED',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'orders'), orderData);

      // 3. Update the Crop Inventory Status so it disappears from the Marketplace
      const cropRef = doc(db, 'crops', cropId);
      await updateDoc(cropRef, {
        status: 'SOLD_OUT'
      });

      // 4. Success UI
      Alert.alert(
        "Payment Successful! 🎉",
        `You have successfully purchased ${quantityKg}Kg of ${cropType}.`,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Checkout</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        <View style={styles.row}>
          <Text style={styles.itemText}>{cropType} ({quantityKg} Kg)</Text>
          <Text style={styles.priceText}>₹{totalAmount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalText}>Total Amount</Text>
          <Text style={styles.totalAmountText}>₹{totalAmount}</Text>
        </View>
      </View>

      <View style={styles.paymentCard}>
        <Text style={styles.cardTitle}>Test Payment Details</Text>
        <Text style={styles.hintText}>Use dummy data (e.g., 4242 4242...)</Text>

        <TextInput
          style={styles.input}
          placeholder="Card Number"
          keyboardType="numeric"
          value={cardNumber}
          onChangeText={setCardNumber}
          maxLength={16}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            placeholder="MM/YY"
            keyboardType="numeric"
            value={expiry}
            onChangeText={setExpiry}
            maxLength={5}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="CVV"
            keyboardType="numeric"
            value={cvv}
            onChangeText={setCvv}
            maxLength={3}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.payButton, processing && styles.disabledButton]}
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay ₹{totalAmount}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { marginRight: 15, padding: 5 },
  backButtonText: { color: '#2E7D32', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  summaryCard: { backgroundColor: '#fff', padding: 20, margin: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemText: { fontSize: 16, color: '#555' },
  priceText: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  totalAmountText: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32' },
  paymentCard: { backgroundColor: '#fff', padding: 20, marginHorizontal: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  hintText: { fontSize: 12, color: '#888', marginBottom: 15 },
  input: { backgroundColor: '#f9f9f9', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, fontSize: 16 },
  payButton: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  disabledButton: { backgroundColor: '#A5D6A7' },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});