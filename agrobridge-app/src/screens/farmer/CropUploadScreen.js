// agrobridge-app/src/screens/farmer/CropUploadScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

export default function CropUploadScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [cropType, setCropType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Compress for faster upload
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleListCrop = async () => {
    // 1. Strict Form Validation
    if (!cropType || !quantity || !price) {
      Alert.alert("Missing Details", "Please fill out all fields before uploading.");
      return;
    }

    if (!image) {
      Alert.alert("Missing Photo", "Please add a photo of your crop so buyers can see it!");
      return;
    }

    const parsedQuantity = parseFloat(quantity);
    const parsedPrice = parseFloat(price);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert("Invalid Quantity", "Quantity must be a positive number.");
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Invalid Price", "Price must be a positive number.");
      return;
    }

    setUploading(true);
    try {
      const userId = user?.id || user?.uid;

      // 2. Upload Image to Supabase Storage
      const base64 = await FileSystem.readAsStringAsync(image, { encoding: 'base64' });
      const filePath = `${userId}/${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('crop-images')
        .upload(filePath, decode(base64), { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 3. Get Public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('crop-images')
        .getPublicUrl(filePath);
      
      const imageUrl = publicUrlData.publicUrl;

      // 4. Write to the 'crops' table in Supabase
      const { error: dbError } = await supabase.from('crops').insert([{
        farmer_id: userId,
        name: cropType.trim(),
        quantity_available: parsedQuantity,
        price_per_kg: parsedPrice,
        image_url: imageUrl
      }]);

      if (dbError) throw dbError;

      Toast.show({
        type: 'success',
        text1: 'Success!',
        text2: `${cropType} has been listed on the marketplace.`,
        position: 'bottom',
        bottomOffset: 100
      });

      // 5. Reset form and navigate back to Dashboard
      setCropType('');
      setQuantity('');
      setPrice('');
      setImage(null);
      navigation.goBack();

    } catch (error) {
      console.error("Error listing crop:", error);
      Alert.alert("Upload Failed", "Could not list your crop. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('List New Crop')}</Text>
      <Text style={styles.subtitle}>{t('Add your produce to the B2B Marketplace')}</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>{t('Crop Name (e.g., Red Onions)')}</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter crop type"
          value={cropType}
          onChangeText={setCropType}
        />

        <Text style={styles.label}>{t('Available Quantity (in Kg)')}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 500"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />

        <Text style={styles.label}>{t('Price per Kg (₹)')}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 25.50"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity style={styles.imageButton} onPress={pickImage} disabled={uploading}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color="#555" />
              <Text style={styles.imageButtonText}>{t('Tap to Add Photo')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleListCrop} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{t('Publish to Marketplace')}</Text>}
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
  imageButton: { backgroundColor: '#e0e0e0', height: 150, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: '#999', overflow: 'hidden' },
  imageButtonText: { color: '#555', fontWeight: 'bold', marginTop: 8 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  submitButton: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
