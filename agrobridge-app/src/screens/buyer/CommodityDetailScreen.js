import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function CommodityDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { cropId, farmerId = 'UNKNOWN_FARMER', cropName = 'Crop', askingPrice = "250", imageUrl } = route.params || {};
  const getEmoji = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('tomato')) return '🍅';
    if (lower.includes('corn') || lower.includes('maize')) return '🌽';
    if (lower.includes('apple')) return '🍎';
    if (lower.includes('potato')) return '🥔';
    if (lower.includes('wheat') || lower.includes('grain')) return '🌾';
    if (lower.includes('carrot')) return '🥕';
    if (lower.includes('onion')) return '🧅';
    if (lower.includes('rice')) return '🍚';
    return '🌱';
  };

  // Mock locations for Geolocation & Logistics Mapping
  const buyerLocation = { latitude: 12.9716, longitude: 77.5946 }; // Bengaluru
  const farmerLocation = { latitude: 12.2958, longitude: 76.6394 }; // Mysuru

  const [loading, setLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [chartData, setChartData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
      { data: [0, 0, 0, 0, 0], color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`, strokeWidth: 3 },
      { data: [0, 0, 0, 0, 0], color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, strokeWidth: 3 }
    ]
  });

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const { data, error } = await supabase
          .from('mandi_prices')
          .select('*')
          .ilike('commodity', `%${cropName}%`)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          console.error("Error fetching price trend:", error);
          throw error; // Jump to catch to use fallback
        }

        if (data && data.length > 0) {
          // Format real data
          const formattedData = data.map((d, index) => {
            const date = new Date(d.created_at);
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            return {
              day_label: dayLabel,
              min_price: d.min_price,
              max_price: d.max_price,
              volume_kg: Math.floor(Math.random() * 500) + 100 // Mock volume since API doesn't provide it
            };
          });

          // Sort chronologically for the chart (oldest to newest)
          const chronologicalData = [...formattedData].reverse();
          const labels = chronologicalData.map(d => d.day_label);
          const maxPrices = chronologicalData.map(d => d.max_price);
          const minPrices = chronologicalData.map(d => d.min_price);
          
          setChartData({
            labels: labels,
            datasets: [
              { data: maxPrices, color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`, strokeWidth: 3 },
              { data: minPrices, color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, strokeWidth: 3 }
            ]
          });

          // Most recent first for the table
          setHistoricalData(formattedData);
        } else {
          // Fallback mechanism if crop is not in cron data
          generateFallbackData();
        }
      } catch (err) {
        console.error("Exception fetching trend data, using fallback:", err);
        generateFallbackData();
      } finally {
        setLoading(false);
      }
    };

    const generateFallbackData = () => {
      const basePriceNum = parseFloat(askingPrice) || 250;
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      const mockData = days.map((day) => {
        const fluctuation = 1 + (Math.random() * 0.15 - 0.075);
        const modalPrice = Math.round(basePriceNum * fluctuation);
        return {
          day_label: day,
          min_price: Math.round(modalPrice * 0.85),
          max_price: Math.round(modalPrice * 1.15),
          volume_kg: Math.floor(Math.random() * 500) + 100
        };
      });

      setChartData({
        labels: mockData.map(d => d.day_label),
        datasets: [
          { data: mockData.map(d => d.max_price), color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`, strokeWidth: 3 },
          { data: mockData.map(d => d.min_price), color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, strokeWidth: 3 }
        ]
      });

      // Reverse for the table (most recent first)
      setHistoricalData([...mockData].reverse());
    };

    fetchTrendData();
  }, [cropName]);

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    fillShadowGradient: '#10b981',
    fillShadowGradientOpacity: 0.15,
    color: (opacity = 1) => `rgba(0, 0, 0, 0.05)`, // very faint grey for grid
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    strokeWidth: 3,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#ffffff"
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['left', 'right']}>
      
      {/* ── Sticky Back Button ── */}
      <TouchableOpacity 
        className="absolute top-12 left-6 p-2 bg-black/20 rounded-full z-50" 
        onPress={() => navigation.goBack()}
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }}
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* ── Scrollable Content ── */}
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* ── Premium Hero Header (Scrolls with page) ── */}
        <LinearGradient 
          colors={['#10b981', '#0d9488']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 w-full"
          style={{ 
            paddingTop: 40, 
            paddingBottom: 30, 
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            shadowColor: '#059669', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 
          }}
        >
          {/* Centered Content */}
          {imageUrl ? (
            <View className="items-center mt-4">
              <Image 
                source={{ uri: imageUrl }} 
                style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 12, borderWidth: 4, borderColor: 'white' }} 
                resizeMode="cover" 
              />
              <Text className="text-white text-3xl font-bold font-['PlusJakartaSans_800ExtraBold'] text-center">
                {t(cropName)}
              </Text>
              <Text className="text-emerald-100 font-medium opacity-90 font-['PlusJakartaSans_500Medium'] mt-1 text-center">
                {t('Commodity Details & Pricing')}
              </Text>
            </View>
          ) : (
            <View className="items-center mt-4">
              <View className="flex-row items-center justify-center">
                <Text className="text-3xl mr-3">{getEmoji(cropName)}</Text>
                <Text className="text-white text-3xl font-bold font-['PlusJakartaSans_800ExtraBold'] text-center">
                  {t(cropName)}
                </Text>
              </View>
              <Text className="text-emerald-100 font-medium opacity-90 font-['PlusJakartaSans_500Medium'] mt-2 text-center">
                {t('Commodity Details & Pricing')}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View className="px-4 pt-6">
          {/* Historical Data Table */}
        <Text className="text-lg font-bold text-slate-800 mb-4">{t('Recent Pricing')}</Text>
        <View 
          className="bg-white rounded-3xl p-5 border border-slate-100/50"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 20, elevation: 3 }}
        >
          <View className="flex-row justify-between pb-2 border-b border-slate-200">
            <Text className="text-slate-500 font-bold w-1/3">{t('Date')}</Text>
            <Text className="text-slate-500 font-bold w-1/3 text-center">{t('Price')}</Text>
            <Text className="text-slate-500 font-bold w-1/3 text-right">{t('Volume')}</Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color="#10b981" className="py-4" />
          ) : historicalData && historicalData.length > 0 ? (
            historicalData.map((row, idx) => (
              <View key={idx} className="flex-row justify-between py-3 border-b border-slate-100">
                <Text className="text-slate-500 w-1/3">{row.day_label}</Text>
                <Text className="text-slate-800 font-bold w-1/3 text-center">₹{row.min_price} - ₹{row.max_price}</Text>
                <Text className="text-slate-500 w-1/3 text-right">{row.volume_kg} kg</Text>
              </View>
            ))
          ) : (
            <Text className="text-slate-500 py-4 text-center">{t('No data available')}</Text>
          )}
        </View>

        {/* ── The Price Trend Chart ── */}
        <Text className="text-lg font-bold text-slate-800 mt-8 mb-2">{t('Price Trend')}</Text>
        
        {/* The Legend */}
        <View className="flex-row items-center mb-4">
          <View className="flex-row items-center mr-6">
            <View className="w-3 h-3 rounded-full bg-green-600 mr-2" />
            <Text className="text-slate-600 font-medium">{t('Maximum price')}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            <Text className="text-slate-600 font-medium">{t('Minimum price')}</Text>
          </View>
        </View>

        <View 
          className="bg-white rounded-3xl py-4 border border-slate-100/50 mt-2 overflow-hidden items-center"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 20, elevation: 3 }}
        >
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 32} // fits within screen padding
            height={220}
            chartConfig={chartConfig}
            bezier
            withOuterLines={false}
            style={{
              borderRadius: 16,
              marginLeft: -10, // offset to hide left margin on the chart
            }}
          />
        </View>

        {/* ── Geolocation & Logistics Map ── */}
        <Text className="text-lg font-bold text-slate-800 mt-8 mb-4">{t('Farm Location & Logistics')}</Text>
        <View 
          className="bg-white rounded-3xl overflow-hidden border border-slate-100/50 mb-32 h-64 justify-center items-center relative"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 20, elevation: 3 }}
        >
          {/* Static Map Background Mock */}
          <LinearGradient 
            colors={['#e2e8f0', '#f1f5f9']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          
          <View className="flex-row items-center justify-between w-full px-12 z-10">
            {/* Farmer Location */}
            <View className="items-center">
              <View className="bg-emerald-500 p-3 rounded-full border-4 border-white shadow-md">
                <Ionicons name="leaf" size={24} color="white" />
              </View>
              <Text className="text-slate-700 font-bold mt-2 font-['PlusJakartaSans_700Bold']">{t('Farm')}</Text>
            </View>

            {/* Route Line */}
            <View className="flex-1 h-1 bg-emerald-300 mx-2 relative">
              <View className="absolute -top-3 left-1/2 -ml-3 bg-white rounded-full p-1 border border-emerald-200">
                <Ionicons name="car" size={16} color="#10b981" />
              </View>
            </View>

            {/* Buyer Location */}
            <View className="items-center">
              <View className="bg-blue-500 p-3 rounded-full border-4 border-white shadow-md">
                <Ionicons name="home" size={24} color="white" />
              </View>
              <Text className="text-slate-700 font-bold mt-2 font-['PlusJakartaSans_700Bold']">{t('You')}</Text>
            </View>
          </View>
          
          <View className="absolute bottom-4 left-4 right-4 bg-white/90 rounded-2xl p-3 flex-row items-center justify-between shadow-sm border border-slate-100">
            <View className="flex-row items-center">
              <Ionicons name="car-outline" size={20} color="#64748b" />
              <Text className="text-slate-600 font-bold ml-2 text-sm">{t('Est. Transit Distance')}</Text>
            </View>
            <Text className="text-slate-800 font-bold text-sm">143 km</Text>
          </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Action Button (Escrow Checkout) ── */}
      <View className="absolute bottom-0 left-0 right-0 w-full bg-white px-6 py-5 border-t border-slate-200 flex-row">
        <TouchableOpacity 
          className="flex-1 bg-white border-2 border-green-600 rounded-full py-4 items-center mr-2 shadow-sm flex-row justify-center"
          onPress={async () => {
             if (isChatLoading) return;
             setIsChatLoading(true);
             try {
                const userId = user?.id || user?.uid;
                const { data: existingOrder } = await supabase
                  .from('orders')
                  .select('id')
                  .eq('buyer_id', userId)
                  .eq('crop_id', cropId)
                  .eq('status', 'pending_payment')
                  .maybeSingle();

                if (existingOrder) {
                  navigation.navigate('Chat', { escrowId: existingOrder.id });
                } else {
                  const { data: newOrder, error } = await supabase
                    .from('orders')
                    .insert([{
                      buyer_id: userId,
                      crop_id: cropId,
                      quantity: 1,
                      total_price: parseFloat(askingPrice) || 250,
                      status: 'pending_payment'
                    }])
                    .select('id')
                    .single();
                  
                  if (error) throw error;
                  navigation.navigate('Chat', { escrowId: newOrder.id });
                }
             } catch (err) {
               console.error(err);
               alert("Failed to start chat.");
             } finally {
               setIsChatLoading(false);
             }
          }}
          disabled={isChatLoading}
        >
          {isChatLoading ? (
            <ActivityIndicator size="small" color="#16a34a" />
          ) : (
            <>
              <Ionicons name="chatbubbles" size={20} color="#16a34a" style={{ marginRight: 6 }} />
              <Text className="text-green-600 text-base font-bold font-['PlusJakartaSans_700Bold']">{t('Negotiate')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-1 bg-green-600 rounded-full py-4 items-center shadow-lg shadow-green-900/30 ml-2 justify-center"
          onPress={() => {
            navigation.navigate('Checkout', { 
              cropId: cropId,
              cropType: cropName,
              pricePerKg: parseFloat(askingPrice) || 250,
              quantityKg: 100,
              farmerId: farmerId 
            });
          }}
        >
          <Text className="text-white text-base font-bold font-['PlusJakartaSans_700Bold']">{t('Buy Now')}</Text>
        </TouchableOpacity>
      </View>
      
    </SafeAreaView>
  );
}
