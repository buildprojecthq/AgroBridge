// agrobridge-app/src/screens/farmer/CropUploadScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function CropUploadScreen({ navigation }) {
  const { user } = useAuth();

  const [cropType, setCropType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleListCrop = async () => {
    // 1. Validate inputs
    if (!cropType || !quantity || !price) {
      Alert.alert("Error", "Please fill out all fields.");
      return;
    }

    const parsedQuantity = parseFloat(quantity);
    const parsedPrice = parseFloat(price);

    if (isNaN(parsedQuantity) || isNaN(parsedPrice)) {
      Alert.alert("Error", "Quantity and Price must be valid numbers.");
      return;
    }

    setUploading(true);
    try {
      // 2. Structure the data for the marketplace
      const cropData = {
        farmerId: user.uid,
        cropType: cropType.trim(),
        quantityKg: parsedQuantity,
        pricePerKg: parsedPrice,
        status: 'AVAILABLE',
        // Temporary dummy image until Firebase Storage is unlocked
        imageUrl: 'https://via.placeholder.com/300?text=Crop+Image',
        listedAt: serverTimestamp() // Let Firebase handle the exact server time
      };

      // 3. Write to the 'crops' collection in Firestore
      // Using addDoc automatically generates a unique Document ID
      await addDoc(collection(db, 'crops'), cropData);

      Alert.alert("Success!", `${cropType} has been listed on the marketplace.`);

      // 4. Reset form and navigate back to Dashboard
      setCropType('');
      setQuantity('');
      setPrice('');
      navigation.goBack();

    } catch (error) {
      console.error("Error listing crop:", error);
      Alert.alert("Upload Failed", "Could not list your crop. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>List New Crop</Text>
      <Text style={styles.subtitle}>Add your produce to the B2B Marketplace</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Crop Name (e.g., Red Onions)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter crop type"
          value={cropType}
          onChangeText={setCropType}
        />

        <Text style={styles.label}>Available Quantity (in Kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 500"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Price per Kg (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 25.50"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        {/* Placeholder for future Image Picker button */}
        <TouchableOpacity style={styles.imageButton} disabled={true}>
          <Text style={styles.imageButtonText}>📷 Add Photo (Coming Soon)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleListCrop} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Publish to Marketplace</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2E7D32', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fafafa', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, fontSize: 16 },
  imageButton: { backgroundColor: '#e0e0e0', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: '#999' },
  imageButtonText: { color: '#555', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});