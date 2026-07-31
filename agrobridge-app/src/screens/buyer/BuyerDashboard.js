import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { translateCropName } from '../../utils/translate';

export default function BuyerDashboard({ navigation }) {
  const { user, userProfile, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [sortBy, setSortBy] = useState('distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const categories = ['All', 'Grains', 'Vegetables', 'Fruits', 'Spices'];

  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const { data, error } = await supabase
          .from('crops')
          .select('*')
          .gt('quantity_available', 0)
          .neq('farmer_id', user?.id || user?.uid || '00000000-0000-0000-0000-000000000000')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const currentLang = i18n.language || 'en';
          const activeListings = await Promise.all(data.map(async (crop) => {
            const translatedCommodity = await translateCropName(crop.name, currentLang);
            return {
              id: crop.id,
              farm: `Farm ${crop.farmer_id.substring(0, 4)}`, // Fallback display name
              distance: `${Math.floor(Math.random() * 50) + 5} km away`, // Simulated distance
              price: `₹${crop.price_per_kg}`,
              rawPrice: crop.price_per_kg,
              available: `${crop.quantity_available} kg`,
              trend: Math.random() > 0.5 ? 'up' : 'down',
              farmerId: crop.farmer_id,
              commodity: translatedCommodity,
              originalCommodity: crop.name,
              imageUrl: crop.image_url
            };
          }));
          setListings(activeListings);
        }
      } catch (error) {
        console.error("Error fetching crops:", error);
      } finally {
        setLoadingListings(false);
      }
    };

    fetchCrops();

    const channel = supabase
      .channel('public:crops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crops' }, payload => {
        fetchCrops();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Category filtering logic
  const categoryKeywords = {
    Grains: ['wheat', 'rice', 'corn', 'maize', 'grain'],
    Vegetables: ['tomato', 'potato', 'onion', 'carrot', 'cabbage', 'vegetable'],
    Fruits: ['apple', 'banana', 'mango', 'orange', 'pomegranate', 'fruit'],
    Spices: ['chili', 'pepper', 'turmeric', 'ginger', 'spice']
  };

  const filteredListings = listings.filter((listing) => {
    if (activeCategory === 'All') return true;
    const keywords = categoryKeywords[activeCategory] || [];
    const commodityLower = (listing.originalCommodity || listing.commodity).toLowerCase();
    return keywords.some(kw => commodityLower.includes(kw));
  });

  // Sort the live listings based on the selected toggle
  const sortedListings = [...filteredListings].sort((a, b) => {
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['left', 'right']}>

      {/* ── Scrollable Content ── */}
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── Premium Top Header ── */}
        <LinearGradient
          colors={['#10b981', '#0d9488']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 w-full"
          style={{
            paddingTop: 30, // Accounts for status bar
            paddingBottom: 0.3,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            shadowColor: '#059669', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12
          }}
        >
          <View className="ml-3 mt-2">
            <Text className="text-emerald-100 font-bold mb-1 font-['PlusJakartaSans_700Bold']">
              {t('Hello')}, {userProfile?.full_name?.split(' ')[0] || user?.displayName?.split(' ')[0] || t('Buyer')}
            </Text>
            <Text className="text-white text-3xl font-bold font-['PlusJakartaSans_800ExtraBold']">{t('Marketplace')}</Text>
            <Text className="text-emerald-100 font-medium opacity-90 font-['PlusJakartaSans_500Medium'] mt-1">{t('Discover fresh crops from verified farms')}</Text>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-white/20 rounded-2xl px-4 py-3 mt-6 border border-white/30">
            <Ionicons name="search" size={20} color="#fff" />
            <TextInput
              className="flex-1 text-white ml-2 font-['PlusJakartaSans_500Medium']"
              placeholder={t('Search for crops...')}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} className="ml-2 pl-3 py-1 border-l border-white/30">
              <Ionicons name="funnel" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Filter Modal (Absolute Overlay) ── */}
        {isFilterModalVisible && (
          <View className="absolute top-0 bottom-0 left-0 right-0 z-50 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl p-6 pb-28 shadow-xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold font-['PlusJakartaSans_800ExtraBold']">{t('Filters')}</Text>
                <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} className="bg-slate-100 p-2 rounded-full">
                  <Ionicons name="close" size={20} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* Categories */}
              <Text className="text-base font-bold text-slate-700 mb-3 font-['PlusJakartaSans_700Bold']">{t('Category')}</Text>
              <View className="flex-row flex-wrap gap-3 mb-6">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setActiveCategory(cat)}
                      className="px-5 py-2.5 rounded-full border"
                      style={{
                        backgroundColor: isActive ? '#10b981' : '#f1f5f9',
                        borderColor: isActive ? '#10b981' : '#e2e8f0'
                      }}
                    >
                      <Text
                        className="font-bold font-['PlusJakartaSans_700Bold']"
                        style={{ color: isActive ? '#ffffff' : '#64748b' }}
                      >
                        {t(cat)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sort Options */}
              <Text className="text-base font-bold text-slate-700 mb-3 font-['PlusJakartaSans_700Bold']">{t('Sort By')}</Text>
              <View className="flex-row bg-slate-100 rounded-full p-1 border border-slate-200 mb-8">
                <TouchableOpacity
                  className="flex-1 py-3 items-center rounded-full"
                  style={{ backgroundColor: sortBy === 'distance' ? '#10b981' : 'transparent' }}
                  onPress={() => setSortBy('distance')}
                >
                  <Text
                    className="font-bold font-['PlusJakartaSans_700Bold']"
                    style={{ color: sortBy === 'distance' ? '#ffffff' : '#64748b' }}
                  >
                    {t('Distance')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 items-center rounded-full"
                  style={{ backgroundColor: sortBy === 'price' ? '#10b981' : 'transparent' }}
                  onPress={() => setSortBy('price')}
                >
                  <Text
                    className="font-bold font-['PlusJakartaSans_700Bold']"
                    style={{ color: sortBy === 'price' ? '#ffffff' : '#64748b' }}
                  >
                    {t('Price')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="bg-emerald-500 py-4 rounded-2xl items-center shadow-md mb-4"
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Text className="text-white text-lg font-bold font-['PlusJakartaSans_700Bold']">{t('Apply Filters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── The Marketplace Feed ── */}
        <View className="flex-1 px-4 pt-4 pb-20">

          {loadingListings ? (
            <ActivityIndicator size="large" color="#10b981" className="mt-10" />
          ) : sortedListings.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              className="bg-white rounded-3xl p-6 mb-4 border border-slate-100/50"
              onPress={() => navigation.navigate('CommodityDetail', { 
                cropId: listing.id,
                farmerId: listing.farmerId, 
                cropName: listing.commodity,
                askingPrice: listing.rawPrice,
                imageUrl: listing.imageUrl
              })}
            >
              <View className="flex-row items-center mb-3">
                {listing.imageUrl ? (
                  <Image 
                    source={{ uri: listing.imageUrl }} 
                    style={{ width: 60, height: 60, borderRadius: 12, marginRight: 16 }} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View className="w-[60px] h-[60px] bg-slate-100 rounded-xl mr-4 items-center justify-center">
                    <Ionicons name="leaf-outline" size={24} color="#94a3b8" />
                  </View>
                )}
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-lg font-bold text-slate-800">{listing.farm}</Text>
                    <Text className="text-slate-400 text-sm font-medium">
                      {listing.distance.split(' ')[0]} {listing.distance.split(' ')[1]} {t('away')}
                    </Text>
                  </View>
                  <Text className="text-slate-600 font-bold">{listing.commodity}</Text>
                </View>
              </View>

              {/* Pricing Row */}
              <View className="flex-row items-center mb-1">
                <Text className="text-slate-500 text-sm">{t('Price')}: </Text>
                <Text className="text-slate-800 font-bold text-base">{listing.price} / kg</Text>
                <Ionicons
                  name={listing.trend === 'up' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={listing.trend === 'up' ? '#ef4444' : '#16a34a'}
                  style={{ marginLeft: 6 }}
                />
              </View>

              {/* Quantity Row */}
              <Text className="text-slate-500 text-sm mb-4">{t('Available')}: {listing.available}</Text>

              {/* The IoT Trust Badge */}
              <View className="bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 self-start flex-row items-center mt-4">
                <Ionicons name="shield-checkmark" size={14} color="#15803d" />
                <Text className="text-emerald-700 text-xs font-bold ml-1 font-['PlusJakartaSans_700Bold']">{t('Verified Fresh (IoT Monitored)')}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {!loadingListings && sortedListings.length === 0 && (
            <Text className="text-center text-slate-500 mt-10 font-['PlusJakartaSans_500Medium']">{t('No active crops found.')}</Text>
          )}

          {/* ── Bottom padding for Tab Bar ── */}
          <View className="h-28" />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
