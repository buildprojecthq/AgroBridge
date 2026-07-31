import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { getLatestMandiPrice } from '../../utils/mandiPriceFetcher';

export default function DashboardScreen({ navigation }) {
  const { user, userProfile, logout } = useAuth();
  const [temperature, setTemperature] = useState(30.0);
  const [humidity, setHumidity] = useState(68);
  const [spoilageRisk, setSpoilageRisk] = useState(2);
  const [hasHardware, setHasHardware] = useState(false);
  const [hardwareDeviceId, setHardwareDeviceId] = useState(null);
  const [linkDeviceIdInput, setLinkDeviceIdInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [hardwareRefreshTrigger, setHardwareRefreshTrigger] = useState(0);
  const { t } = useTranslation();

  // Bottom Sheet State
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [cropForm, setCropForm] = useState({ commodity: '', state: 'Karnataka', market: '', weight: '', askingPrice: '', image: null });
  const [mandiData, setMandiData] = useState(null);
  const [isFetchingMandi, setIsFetchingMandi] = useState(false);
  const [availableCommodities, setAvailableCommodities] = useState(['Corn', 'Tomato', 'Wheat', 'Rice', 'Onion']);
  const [cropSearchQuery, setCropSearchQuery] = useState('');

  // Active Crops State
  const [activeCrops, setActiveCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(true);

  // Price Update State
  const [isUpdateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [newAskingPrice, setNewAskingPrice] = useState('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Earnings State
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEscrow, setPendingEscrow] = useState(0);

  useEffect(() => {
    const userId = user?.id || user?.uid;
    if (!userId) return;

    const fetchData = async () => {
      try {
        // Fetch Active Crops
        const { data: cropsData, error: cropsError } = await supabase
          .from('crops')
          .select('*')
          .eq('farmer_id', userId)
          .order('created_at', { ascending: false });

        if (cropsError) throw cropsError;
        if (cropsData) {
          setActiveCrops(cropsData.map(c => {
            let parsedState = 'Karnataka';
            let parsedMarket = 'Unknown';
            if (c.description && c.description.includes('Market:')) {
              const parts = c.description.split(', ');
              parsedState = parts[0]?.replace('State: ', '') || 'Karnataka';
              parsedMarket = parts[1]?.replace('Market: ', '') || 'Unknown';
            }
            return {
              id: c.id,
              commodity: c.name,
              askingPrice: c.price_per_kg,
              weight: `${c.quantity_available} kg`,
              state: parsedState,
              market: parsedMarket
            };
          }));
        }

        // Fetch Earnings from Orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total_price, status, crops!inner(farmer_id)')
          .eq('crops.farmer_id', userId);

        if (ordersError) throw ordersError;
        
        let earned = 0;
        let pending = 0;
        if (ordersData) {
          ordersData.forEach(order => {
            if (order.status === 'completed') earned += order.total_price;
            if (order.status === 'escrow_locked') pending += order.total_price;
          });
        }
        setTotalEarnings(earned);
        setPendingEscrow(pending);
 
        // Fetch Unique Commodities for Dropdown
        const { data: mandiPrices, error: mandiPricesError } = await supabase
          .from('mandi_prices')
          .select('commodity');

        if (!mandiPricesError && mandiPrices) {
          const unique = Array.from(new Set(mandiPrices.map(p => p.commodity))).sort();
          if (unique.length > 0) {
            setAvailableCommodities(unique);
          }
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingCrops(false);
      }
    };

    fetchData();

    const cropsChannel = supabase
      .channel('public:crops_farmer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crops', filter: `farmer_id=eq.${userId}` }, () => {
        fetchData();
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('public:orders_farmer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // Simple re-fetch on any order change, in production use specific filters
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(cropsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [user]);

  const handleOpenUpdateModal = async (crop) => {
    setSelectedCrop(crop);
    setNewAskingPrice(crop.askingPrice ? crop.askingPrice.toString() : '');
    setMandiData(null);
    setUpdateModalVisible(true);
    setIsFetchingMandi(true);
    
    // Fetch live govt price data
    const data = await getLatestMandiPrice(crop.state, crop.market, crop.commodity);
    setMandiData(data);
    setIsFetchingMandi(false);
  };

  const handleSaveUpdatedPrice = async () => {
    if (!selectedCrop || !newAskingPrice) return;
    setIsUpdatingPrice(true);
    try {
      const { error } = await supabase
        .from('crops')
        .update({ price_per_kg: Number(newAskingPrice) })
        .eq('id', selectedCrop.id);
      
      if (error) throw error;
      setUpdateModalVisible(false);
    } catch (e) {
      console.error("Error updating price: ", e);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setCropForm({ ...cropForm, image: result.assets[0].uri });
    }
  };

  const handleNextStep = async () => {
    if (!cropForm.commodity || !cropForm.state || !cropForm.market || !cropForm.weight) return;
    setIsFetchingMandi(true);
    const data = await getLatestMandiPrice(cropForm.state, cropForm.market, cropForm.commodity);
    setMandiData(data);
    setIsFetchingMandi(false);
    setModalStep(2);
  };

  const handleSaveListing = async () => {
    try {
      const userId = user?.id || user?.uid;
      let imageUrl = null;

      if (cropForm.image) {
        const base64 = await FileSystem.readAsStringAsync(cropForm.image, { encoding: 'base64' });
        const filePath = `${userId}/${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('crop-images')
          .upload(filePath, decode(base64), { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('crop-images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('crops').insert([{
        farmer_id: userId,
        name: cropForm.commodity,
        price_per_kg: Number(cropForm.askingPrice),
        quantity_available: Number(cropForm.weight.replace(/[^0-9.]/g, '') || 0),
        description: `State: ${cropForm.state}, Market: ${cropForm.market}`,
        image_url: imageUrl
      }]);
      
      if (error) throw error;

      setModalVisible(false);
      setModalStep(1);
      setCropForm({ commodity: '', state: 'Karnataka', market: '', weight: '', askingPrice: '', image: null });
      setMandiData(null);
      setCropSearchQuery('');
    } catch (e) {
      console.error("Error saving listing: ", e);
      Alert.alert("Error Saving Listing", e.message || String(e));
    }
  };

  useEffect(() => {
    const userId = user?.id || user?.uid;
    if (!userId) return;

    let telemetryChannel;

    // 1. Check if user has hardware and fetch initial telemetry
    const initHardware = async () => {
      try {
        const { data: hardware, error: hwError } = await supabase
          .from('hardware_installations')
          .select('device_id')
          .eq('farmer_id', userId)
          .maybeSingle();

        if (hardware && hardware.device_id) {
          setHasHardware(true);
          setHardwareDeviceId(hardware.device_id);

          // Fetch telemetry for this specific device
          const { data, error } = await supabase
            .from('storage_telemetry')
            .select('*')
            .eq('device_id', hardware.device_id)
            .order('last_updated', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (data) {
            setTemperature(data.current_temperature);
            setHumidity(data.current_humidity);
            const riskPercentage = Math.min(Math.round((data.gas_level / 500) * 100), 100);
            setSpoilageRisk(riskPercentage);
          }

          // Subscribe to real-time telemetry updates for this device
          telemetryChannel = supabase
            .channel(`telemetry_${hardware.device_id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_telemetry', filter: `device_id=eq.${hardware.device_id}` }, payload => {
              console.log("🔥 REALTIME PAYLOAD RECEIVED:", payload);
              if (payload.new && payload.new.current_temperature !== undefined) {
                setTemperature(payload.new.current_temperature);
                setHumidity(payload.new.current_humidity);
                setSpoilageRisk(Math.min(Math.round((payload.new.gas_level / 500) * 100), 100));
              }
            })
            .subscribe();
        } else {
          setHasHardware(false);
          setHardwareDeviceId(null);
        }
      } catch (err) {
        console.error("Failed to initialize hardware logic", err);
      }
    };
    initHardware();

    return () => {
      if (telemetryChannel) {
        supabase.removeChannel(telemetryChannel);
      }
    };
  }, [user, hardwareRefreshTrigger]);

  const handleLinkDevice = async () => {
    if (!linkDeviceIdInput.trim()) return;
    setIsLinking(true);
    try {
      const userId = user?.id || user?.uid;
      const { error } = await supabase.from('hardware_installations').upsert({
        farmer_id: userId,
        device_id: linkDeviceIdInput.trim()
      }, { onConflict: 'farmer_id' });
      if (error) throw error;
      
      Alert.alert(t('Success'), t('Hardware linked successfully.'));
      setLinkDeviceIdInput('');
      setHardwareRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.error(e);
      Alert.alert(t('Error'), t('Failed to link device.'));
    } finally {
      setIsLinking(false);
    }
  };

  const isSpoilageDetected = spoilageRisk >= 60; // Flag as dangerous if risk >= 60%

  return (
    <>
      <SafeAreaView className="flex-1 bg-slate-50" edges={['left', 'right']}>
        
        {/* ── Signature Green Header (Premium UX, Fixed at Top) ── */}
        <LinearGradient 
          colors={['#10b981', '#0d9488']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 z-10 w-full"
          style={{ 
            paddingTop: 20, 
            paddingBottom: 30, 
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            shadowColor: '#059669', 
            shadowOffset: { width: 0, height: 16 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 20, 
            elevation: 12 
          }}
        >
          <View className="ml-3 mt-6">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-white text-3xl font-bold font-['PlusJakartaSans_800ExtraBold']">
                {t('Hello')}, {userProfile?.full_name?.split(' ')[0] || user?.displayName?.split(' ')[0] || t('Farmer')}
              </Text>
            </View>
            <Text className="text-emerald-100 mt-1 font-semibold opacity-90 text-sm font-['PlusJakartaSans_600SemiBold'] pr-4 flex-wrap leading-5">
              {hasHardware ? `🟢 ${t('Gateway Online')} • ${t('All Sensors Active')}` : `⚪ ${t('System Offline')} • ${t('No Hardware')}`}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
          <View className="px-4 mt-6">
            {hasHardware ? (
              <View className="flex-row flex-wrap justify-between">
                {/* Card 1 (Temperature) */}
                <View 
                  className="w-[48%] bg-white rounded-3xl p-5 mb-4 border border-slate-100/50 flex-col"
                  style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 20, elevation: 3 }}
                >
                  <View className="flex-row items-center mb-3">
                    <View className="bg-orange-50 p-2 rounded-full">
                      <Ionicons name="thermometer" size={20} color="#ea580c" />
                    </View>
                    <Text className="text-slate-500 font-bold ml-2 text-xs">{t('Temp')}</Text>
                  </View>
                  <Text className="text-3xl text-slate-800 font-bold">
                    {temperature}
                    <Text className="text-slate-500 text-lg">°C</Text>
                  </Text>
                </View>

                {/* Card 2 (Humidity) */}
                <View 
                  className="w-[48%] bg-white rounded-3xl p-5 mb-4 border border-slate-100/50 flex-col"
                  style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 20, elevation: 3 }}
                >
                  <View className="flex-row items-center mb-3">
                    <View className="bg-blue-50 p-2 rounded-full">
                      <Ionicons name="water" size={20} color="#3b82f6" />
                    </View>
                    <Text className="text-slate-500 font-bold ml-2 text-xs">{t('Humidity')}</Text>
                  </View>
                  <Text className="text-3xl text-slate-800 font-bold">
                    {humidity}
                    <Text className="text-slate-500 text-lg">%</Text>
                  </Text>
                </View>

                {/* Card 3 (Gas/Spoilage Risk) */}
                <View 
                  className="w-full bg-white rounded-3xl p-5 mb-6 border border-slate-100/50 flex-col"
                  style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 20, elevation: 3 }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="bg-emerald-50 p-2 rounded-full">
                        <Ionicons name="cloud" size={20} color="#10b981" />
                      </View>
                      <Text className="text-slate-500 font-bold ml-2 text-sm">{t('Gas / Spoilage Risk')}</Text>
                    </View>
                    <Text className="text-slate-800 font-bold text-lg">{spoilageRisk} <Text className="text-slate-500 text-xs">%</Text></Text>
                  </View>
                  
                  {/* Green-to-Red Gradient Progress Bar */}
                  <View className="h-2 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <LinearGradient
                      colors={['#10b981', '#f59e0b', '#ef4444']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ height: '100%', width: `${spoilageRisk * 10}%`, borderRadius: 9999 }}
                    />
                  </View>
                  {isSpoilageDetected && (
                    <Text className="text-red-500 text-xs font-bold mt-2 text-right">⚠️ CRITICAL LEVELS</Text>
                  )}
                </View>
              </View>
            ) : (
              <View className="bg-slate-100 rounded-3xl p-6 mb-6 border border-slate-200 border-dashed">
                <View className="items-center mb-4">
                  <Ionicons name="hardware-chip-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
                  <Text className="text-slate-800 font-bold text-lg mb-2 text-center font-['PlusJakartaSans_700Bold']">{t('Not yet setup hardware')}</Text>
                  <Text className="text-slate-500 text-center font-['PlusJakartaSans_500Medium']">{t('Enter your Gateway ID to view real-time metrics.')}</Text>
                </View>
                
                <View className="flex-row items-center">
                  <TextInput 
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mr-2"
                    placeholder={t('e.g. demo-device-001')}
                    value={linkDeviceIdInput}
                    onChangeText={setLinkDeviceIdInput}
                  />
                  <TouchableOpacity 
                    className="bg-green-600 px-5 py-3.5 rounded-xl items-center justify-center shadow-sm shadow-green-500/20"
                    onPress={handleLinkDevice}
                    disabled={isLinking || !linkDeviceIdInput.trim()}
                    style={{ opacity: (!linkDeviceIdInput.trim() || isLinking) ? 0.5 : 1 }}
                  >
                    {isLinking ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold">{t('Link')}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── New: Farmer Earnings Dashboard ── */}
          <View className="px-4 mt-2">
            <Text className="text-xl font-bold text-slate-800 mb-4">{t('Financial Overview')}</Text>
            
            <View className="flex-row justify-between">
              {/* Total Earnings */}
              <View 
                className="w-[48%] bg-green-700 rounded-3xl p-5 border border-green-600 flex-col"
                style={{ shadowColor: '#15803d', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 }}
              >
                <View className="flex-row items-center mb-2">
                  <Ionicons name="wallet-outline" size={20} color="#dcfce7" />
                  <Text className="text-green-100 font-medium ml-2 text-xs">{t('Total Earnings')}</Text>
                </View>
                <Text className="text-2xl text-white font-bold mt-1">₹{totalEarnings.toLocaleString('en-IN')}</Text>
                <Text className="text-green-200 text-xs mt-2">{t('Available to withdraw')}</Text>
              </View>

              {/* Pending Escrow */}
              <View 
                className="w-[48%] bg-white rounded-3xl p-5 border border-slate-200 flex-col"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 15, elevation: 3 }}
              >
                <View className="flex-row items-center mb-2">
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
                  <Text className="text-slate-500 font-medium ml-2 text-xs">{t('In Escrow')}</Text>
                </View>
                <Text className="text-2xl text-slate-800 font-bold mt-1">₹{pendingEscrow.toLocaleString('en-IN')}</Text>
                <Text className="text-amber-500 text-xs mt-2 font-medium">{t('Pending delivery')}</Text>
              </View>
            </View>
          </View>

          {/* ── Section 1: Active Crops ── */}
          <View className="px-4 mt-2">
            <View className="flex-row justify-between items-center mb-3 mt-6">
              <Text className="text-xl font-bold text-slate-800">{t('Active Crops')}</Text>
              <TouchableOpacity 
                className="bg-green-600 py-2 px-4 rounded-full flex-row items-center"
                style={{ shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                onPress={() => setModalVisible(true)}
              >
                <Text className="text-white font-bold text-sm">+ {t('Add Crop')}</Text>
              </TouchableOpacity>
            </View>
            
            {loadingCrops ? (
              <ActivityIndicator size="large" color="#10b981" className="mt-8" />
            ) : activeCrops.length > 0 ? (
              activeCrops.map((crop) => (
                <View key={crop.id} className="bg-white rounded-3xl p-5 mb-4 border border-slate-100 shadow-sm">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-lg font-bold text-slate-800 font-['PlusJakartaSans_800ExtraBold']">{crop.commodity}</Text>
                    <Text className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs">{crop.weight}</Text>
                  </View>
                  <Text className="text-slate-500 font-medium mb-4 text-sm">Asking Price: <Text className="text-slate-800 font-bold">₹{crop.askingPrice} / kg</Text></Text>
                  
                  <TouchableOpacity 
                    className="bg-slate-100 py-3 rounded-xl flex-row justify-center items-center"
                    onPress={() => handleOpenUpdateModal(crop)}
                  >
                    <Ionicons name="trending-up" size={18} color="#0f172a" style={{ marginRight: 6 }} />
                    <Text className="text-slate-800 font-bold text-sm">Update Today's Price</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View className="items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-3xl mt-2">
                <Text className="text-slate-400 font-medium font-['PlusJakartaSans_500Medium']">{t('No active crops found.')}</Text>
              </View>
            )}
          </View>

          {/* ── Conditional Action: Exhaust Fans ── */}
          {hasHardware && isSpoilageDetected && (
            <TouchableOpacity 
              className="mx-4 bg-red-500 border-[1.5px] border-red-600 rounded-full py-4 items-center mb-6 shadow-sm shadow-red-500/30 flex-row justify-center"
              onPress={() => alert('Exhaust command sent to hardware!')}
            >
              <Ionicons name="warning" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white text-base font-bold">ACTIVATE EXHAUST FANS</Text>
            </TouchableOpacity>
          )}

          {/* ── Bottom padding for Tab Bar ── */}
          <View className="h-24" />

        </ScrollView>

        {/* ── Custom Animated Bottom Sheet (Modal) ── */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <TouchableOpacity 
              style={{ flex: 1 }} 
              activeOpacity={1} 
              onPress={() => setModalVisible(false)} 
            />
            <MotiView
              from={{ translateY: 800 }}
              animate={{ translateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 90 }}
              className="bg-white rounded-t-[32px] px-6 pt-6 pb-10 shadow-lg max-h-[85%]"
            >
              {/* Sheet Handle */}
              <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {modalStep === 1 ? (() => {
                  const filteredCommodities = availableCommodities.filter(c =>
                    c.toLowerCase().includes(cropSearchQuery.toLowerCase()) ||
                    t(c).toLowerCase().includes(cropSearchQuery.toLowerCase())
                  );
                  return (
                    <View>
                      <Text className="text-2xl font-bold text-slate-800 mb-6">{t('Add Active Crop')}</Text>
                      
                      <Text className="text-slate-500 font-semibold mb-2">{t('Crop Name (Commodity)')}</Text>
                      <TextInput 
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-medium mb-3 text-sm"
                        placeholder={t('Search Crop...')}
                        value={cropSearchQuery}
                        onChangeText={(val) => setCropSearchQuery(val)}
                      />
                      <View className="mb-4">
                        {filteredCommodities.length > 0 ? (
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingVertical: 4 }}
                          >
                            {filteredCommodities.map((cropName) => {
                              const isSelected = cropForm.commodity === cropName;
                              return (
                                <TouchableOpacity
                                  key={cropName}
                                  onPress={() => setCropForm({ ...cropForm, commodity: cropName })}
                                  className={`px-4 py-2.5 rounded-xl border mr-2 ${
                                    isSelected 
                                      ? 'bg-green-600 border-green-600 shadow-sm shadow-green-500/20' 
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                                    {t(cropName)}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        ) : (
                          <Text className="text-slate-400 text-sm font-medium py-2">{t('No crops found')}</Text>
                        )}
                      </View>

                      <Text className="text-slate-500 font-semibold mb-2">{t('State')}</Text>
                      <TextInput 
                        className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 font-medium mb-4"
                        placeholder={t('e.g. Karnataka')}
                        value={cropForm.state}
                        editable={false}
                      />

                      <Text className="text-slate-500 font-semibold mb-2">{t('Market Location')}</Text>
                      <TextInput 
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium mb-4"
                        placeholder={t('e.g. Bengaluru')}
                        value={cropForm.market}
                        onChangeText={(val) => setCropForm({ ...cropForm, market: val })}
                      />

                      <Text className="text-slate-500 font-semibold mb-2">{t('Total Available Weight')}</Text>
                      <TextInput 
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium mb-4"
                        placeholder={t('e.g. 1500 kg')}
                        value={cropForm.weight}
                        onChangeText={(val) => setCropForm({ ...cropForm, weight: val })}
                      />
                      
                      <TouchableOpacity 
                        className="bg-slate-50 h-32 rounded-xl items-center justify-center mb-6 border border-slate-200 border-dashed overflow-hidden" 
                        onPress={pickImage}
                      >
                        {cropForm.image ? (
                          <Image source={{ uri: cropForm.image }} className="w-full h-full rounded-xl" resizeMode="cover" />
                        ) : (
                          <>
                            <Ionicons name="camera-outline" size={32} color="#64748b" />
                            <Text className="text-slate-500 font-medium mt-2">{t('Tap to Add Photo')}</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity 
                        className="bg-green-600 py-4 rounded-xl items-center flex-row justify-center"
                        onPress={handleNextStep}
                        disabled={isFetchingMandi || !cropForm.commodity || !cropForm.state || !cropForm.market || !cropForm.weight}
                        style={{ opacity: (!cropForm.commodity || !cropForm.state || !cropForm.market || !cropForm.weight) ? 0.5 : 1 }}
                      >
                        {isFetchingMandi ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">{t('Continue to Pricing')}</Text>}
                      </TouchableOpacity>
                    </View>
                  );
                })() : (
                  <View>
                    <Text className="text-2xl font-bold text-slate-800 mb-6">{t('Price Strategy')}</Text>
                    
                    <View className="flex-row justify-between mb-8">
                      {/* Left Box: Reference Card */}
                      <View className="w-[48%] bg-slate-100 rounded-2xl p-4 border border-slate-200">
                        <Text className="text-slate-500 font-semibold text-xs mb-2">{t('Govt. Mandi Price Today')}</Text>
                        {mandiData ? (
                          <Text className="text-slate-800 font-bold text-xl">₹{mandiData.modal_price} <Text className="text-sm">/ kg</Text></Text>
                        ) : (
                          <Text className="text-slate-400 font-medium text-sm">{t('Data unavailable')}</Text>
                        )}
                      </View>
                      
                      {/* Right Box: Action Card */}
                      <View 
                        className={`w-[48%] bg-white rounded-2xl p-4 border-2 ${
                          !cropForm.askingPrice ? 'border-slate-200' :
                          mandiData && Number(cropForm.askingPrice) <= mandiData.modal_price ? 'border-green-500' : 'border-amber-500'
                        }`}
                      >
                        <Text className="text-slate-500 font-semibold text-xs mb-2">{t('Your Asking Price')}</Text>
                        <View className="flex-row items-center">
                          <Text className="text-slate-800 font-bold text-xl mr-1">₹</Text>
                          <TextInput 
                            className="text-slate-800 font-bold text-xl flex-1"
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={cropForm.askingPrice}
                            onChangeText={(val) => setCropForm({ ...cropForm, askingPrice: val })}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Dynamic Feedback UX */}
                    {cropForm.askingPrice && mandiData && Number(cropForm.askingPrice) <= mandiData.modal_price && (
                      <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6 flex-row items-center">
                        <Text className="text-green-600 font-bold">{t('Highly Competitive ⚡')}</Text>
                      </View>
                    )}

                    {cropForm.askingPrice && mandiData && Number(cropForm.askingPrice) > mandiData.modal_price && (
                      <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
                        <Text className="text-amber-700 font-medium text-sm">
                          <Text className="font-bold">{t('Premium Price.')}</Text> {t('Buyers will see your real-time IoT freshness metrics to verify quality.')}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity 
                      className="bg-green-600 py-4 rounded-xl items-center"
                      onPress={handleSaveListing}
                      disabled={!cropForm.askingPrice}
                      style={{ opacity: !cropForm.askingPrice ? 0.5 : 1 }}
                    >
                      <Text className="text-white font-bold text-lg">{t('Save Crop Listing')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </MotiView>
          </KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>

      {/* ── Daily Price Update Modal ── */}
      <Modal
        visible={isUpdateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setUpdateModalVisible(false)} 
          />
          <MotiView
            from={{ translateY: 800 }}
            animate={{ translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 90 }}
            className="bg-white rounded-t-[32px] px-6 pt-6 pb-10 shadow-lg"
          >
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
            
            <Text className="text-2xl font-bold text-slate-800 mb-2 font-['PlusJakartaSans_800ExtraBold']">Update {selectedCrop?.commodity} Price</Text>
            <Text className="text-slate-500 mb-6 font-medium">Review the daily market benchmark and adjust your asking price to stay competitive.</Text>

            <View className="flex-row justify-between mb-8">
              {/* Left Box: Govt Mandi Card */}
              <View className="w-[48%] bg-slate-100 rounded-2xl p-4 border border-slate-200">
                <Text className="text-slate-500 font-semibold text-xs mb-2">Govt. Price Today</Text>
                {isFetchingMandi ? (
                  <ActivityIndicator size="small" color="#10b981" className="self-start mt-2" />
                ) : mandiData ? (
                  <Text className="text-slate-800 font-bold text-xl">₹{mandiData.modal_price} <Text className="text-sm">/ kg</Text></Text>
                ) : (
                  <Text className="text-slate-400 font-medium text-sm">Data unavailable</Text>
                )}
              </View>
              
              {/* Right Box: Action Card */}
              <View 
                className={`w-[48%] bg-white rounded-2xl p-4 border-2 ${
                  !newAskingPrice ? 'border-slate-200' :
                  mandiData && Number(newAskingPrice) <= mandiData.modal_price ? 'border-green-500' : 'border-amber-500'
                }`}
              >
                <Text className="text-slate-500 font-semibold text-xs mb-2">Your New Price</Text>
                <View className="flex-row items-center">
                  <Text className="text-slate-800 font-bold text-xl mr-1">₹</Text>
                  <TextInput 
                    className="text-slate-800 font-bold text-xl flex-1"
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={newAskingPrice}
                    onChangeText={setNewAskingPrice}
                    autoFocus
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity 
              className="bg-green-600 py-4 rounded-xl items-center flex-row justify-center"
              onPress={handleSaveUpdatedPrice}
              disabled={isUpdatingPrice || !newAskingPrice}
              style={{ opacity: (!newAskingPrice || isUpdatingPrice) ? 0.5 : 1 }}
            >
              {isUpdatingPrice ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white font-bold text-lg font-['PlusJakartaSans_700Bold']">Save Price</Text>}
            </TouchableOpacity>

          </MotiView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
