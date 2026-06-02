import React, { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function BuyerDashboard({ navigation }) {
  const { logout } = useAuth();
  const [sortBy, setSortBy] = useState('distance'); // 'distance' or 'price'

  const mockListings = [
    { id: '1', farm: 'Hosur Farms', distance: '15 km away', price: '₹260 - ₹280', available: '500 kg', trend: 'up' },
    { id: '2', farm: 'Doddaballapur Estates', distance: '32 km away', price: '₹250 - ₹275', available: '1200 kg', trend: 'down' },
    { id: '3', farm: 'Kolar Fresh Co.', distance: '65 km away', price: '₹265 - ₹285', available: '800 kg', trend: 'up' },
    { id: '4', farm: 'Mysuru AgriHub', distance: '110 km away', price: '₹240 - ₹260', available: '3000 kg', trend: 'down' },
  ];

  // Sort the mock listings based on the selected toggle
  const sortedListings = [...mockListings].sort((a, b) => {
    if (sortBy === 'price') {
      // Extract the base price number from strings like '₹260 - ₹280'
      const priceA = parseInt(a.price.replace(/[^0-9]/g, '').substring(0, 3), 10);
      const priceB = parseInt(b.price.replace(/[^0-9]/g, '').substring(0, 3), 10);
      return priceA - priceB;
    }
    // Default: Sort by distance
    const distA = parseInt(a.distance.replace(/[^0-9]/g, ''), 10);
    const distB = parseInt(b.distance.replace(/[^0-9]/g, ''), 10);
    return distA - distB;
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      
      {/* ── Top Header ── */}
      <View className="bg-green-500 pt-6 pb-6 px-6 rounded-b-3xl shadow-md z-10 flex-row justify-between items-center">
        <View>
          <Text className="text-white text-2xl font-bold">Corn Market</Text>
          <Text className="text-green-100 font-medium">Showing markets near Bengaluru</Text>
        </View>
        <TouchableOpacity 
          className="bg-green-600 p-2 rounded-full" 
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Arbitrage Sorter (The Toggle) ── */}
      <View className="flex-row mx-4 mt-6 bg-white rounded-full p-1 border border-slate-200 shadow-sm">
        <TouchableOpacity 
          className="flex-1 py-3 items-center rounded-full"
          style={{ 
            backgroundColor: sortBy === 'distance' ? '#22c55e' : 'transparent',
            elevation: sortBy === 'distance' ? 2 : 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: sortBy === 'distance' ? 0.05 : 0,
            shadowRadius: 2
          }}
          onPress={() => setSortBy('distance')}
        >
          <Text className={`font-bold ${sortBy === 'distance' ? 'text-white' : 'text-slate-500'}`}>Sort by distance</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="flex-1 py-3 items-center rounded-full"
          style={{ 
            backgroundColor: sortBy === 'price' ? '#22c55e' : 'transparent',
            elevation: sortBy === 'price' ? 2 : 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: sortBy === 'price' ? 0.05 : 0,
            shadowRadius: 2
          }}
          onPress={() => setSortBy('price')}
        >
          <Text className={`font-bold ${sortBy === 'price' ? 'text-white' : 'text-slate-500'}`}>Sort by price</Text>
        </TouchableOpacity>
      </View>

      {/* ── The Marketplace Feed ── */}
      <ScrollView className="flex-1 px-4 pt-4 pb-20" showsVerticalScrollIndicator={false}>
        
        {sortedListings.map((listing) => (
          <TouchableOpacity 
            key={listing.id} 
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-slate-100"
            onPress={() => navigation.navigate('CommodityDetail')}
          >
            {/* Top Row (Location & Distance) */}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-slate-800">{listing.farm}</Text>
              <Text className="text-slate-400 text-sm font-medium">{listing.distance}</Text>
            </View>

            {/* Pricing Row */}
            <View className="flex-row items-center mb-1">
              <Text className="text-slate-500 text-sm">Price: </Text>
              <Text className="text-slate-800 font-bold text-base">{listing.price} / kg</Text>
              <Ionicons 
                name={listing.trend === 'up' ? 'arrow-up' : 'arrow-down'} 
                size={14} 
                color={listing.trend === 'up' ? '#ef4444' : '#16a34a'} 
                style={{ marginLeft: 6 }} 
              />
            </View>

            {/* Quantity Row */}
            <Text className="text-slate-500 text-sm mb-4">Available: {listing.available}</Text>

            {/* The IoT Trust Badge */}
            <View className="bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 self-start flex-row items-center">
              <Ionicons name="shield-checkmark" size={14} color="#15803d" />
              <Text className="text-emerald-700 text-xs font-bold ml-1">Verified Fresh (IoT Monitored)</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── Logout Button ── */}
        <TouchableOpacity 
          className="mt-4 mb-10 bg-red-50 border border-red-100 py-3 rounded-full items-center flex-row justify-center" 
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
          <Text className="text-red-500 text-sm font-bold">Logout</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}
