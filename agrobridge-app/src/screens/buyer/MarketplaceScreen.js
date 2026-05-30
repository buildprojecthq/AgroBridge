import React, { useState, useEffect } from 'react';
import { Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function MarketplaceScreen({ navigation }) {
  const { logout } = useAuth();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    // 1. Create a query to only fetch crops that are currently 'AVAILABLE'
    const cropsRef = collection(db, 'crops');
    const q = query(cropsRef, where("status", "==", "AVAILABLE"));

    // 2. Set up the real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const inventory = [];
      querySnapshot.forEach((doc) => {
        inventory.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setCrops(inventory);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching marketplace data: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Design the UI card for each crop item
  const renderCropItem = ({ item }) => (
    <View className="bg-white rounded-3xl mb-5 overflow-hidden shadow-sm shadow-black/10 border border-gray-100">
      <Image source={{ uri: item.imageUrl }} className="w-full h-40 bg-gray-200" />
      <View className="p-5">
        <Text className="text-xl font-bold text-gray-800 mb-1" style={{ fontFamily: 'NotoSans_800ExtraBold' }}>{item.cropType}</Text>
        <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'NotoSans_500Medium' }}>{t('Sold by')}: Farmer {item.farmerId.substring(0, 5)}...</Text>

        <View className="flex-row justify-between mb-4 pb-4 border-b border-gray-100">
          <Text className="text-lg font-bold text-[#029a43]" style={{ fontFamily: 'NotoSans_700Bold' }}>₹{item.pricePerKg} / Kg</Text>
          <Text className="text-base text-gray-600" style={{ fontFamily: 'NotoSans_600SemiBold' }}>{item.quantityKg} Kg {t('available')}</Text>
        </View>

        <View className="flex-row justify-between space-x-3">
          <TouchableOpacity 
            className="flex-1 bg-blue-50 py-3 rounded-xl items-center flex-row justify-center border border-blue-100" 
            onPress={() => navigation.navigate('Chat', {
              cropId: item.id,
              cropName: item.cropType,
              targetUserId: item.farmerId,
              targetUserName: `Farmer ${item.farmerId.substring(0, 5)}`
            })}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
            <Text className="text-blue-600 font-bold" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('Chat')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-1 bg-orange-500 py-3 rounded-xl items-center flex-row justify-center shadow-sm shadow-orange-500/30" 
            onPress={() => navigation.navigate('Checkout', {
              cropId: item.id,
              cropType: item.cropType,
              pricePerKg: item.pricePerKg,
              quantityKg: item.quantityKg,
              farmerId: item.farmerId
            })}
          >
            <Ionicons name="cart-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text className="text-white font-bold" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('Buy Now')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-16 pb-6 bg-white rounded-b-3xl shadow-sm shadow-black/5 z-10">
        <View>
          <Text className="text-gray-500 text-sm font-semibold mb-1" style={{ fontFamily: 'NotoSans_600SemiBold' }}>{t('Marketplace')}</Text>
          <Text className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'NotoSans_800ExtraBold' }}>{t('Buy Crops')}</Text>
        </View>
        <TouchableOpacity 
          className="bg-gray-100 p-3 rounded-full" 
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={24} color="#4b5563" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#029a43" />
          <Text className="mt-4 text-gray-600 font-medium" style={{ fontFamily: 'NotoSans_500Medium' }}>Loading Inventory...</Text>
        </View>
      ) : crops.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="leaf-outline" size={48} color="#d1d5db" className="mb-4" />
          <Text className="text-gray-500 text-center font-medium mb-8" style={{ fontFamily: 'NotoSans_500Medium' }}>No crops available right now. Please check back later.</Text>
          <TouchableOpacity 
            className="bg-red-50 border border-red-100 p-4 rounded-xl items-center flex-row justify-center w-full" 
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 6 }} />
            <Text className="text-red-500 text-sm font-bold" style={{ fontFamily: 'NotoSans_700Bold' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={crops}
          keyExtractor={(item) => item.id}
          renderItem={renderCropItem}
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity 
              className="bg-red-50 border border-red-100 p-4 rounded-xl items-center flex-row justify-center mt-4 mb-8" 
              onPress={logout}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 6 }} />
              <Text className="text-red-500 text-sm font-bold" style={{ fontFamily: 'NotoSans_700Bold' }}>Logout</Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}
