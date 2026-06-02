import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [temperature, setTemperature] = useState(30.0);
  const [humidity, setHumidity] = useState(68);
  const [spoilageRisk, setSpoilageRisk] = useState(2);
  const { t } = useTranslation();

  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate randomly between 29.5 and 31.5
      setTemperature(parseFloat((Math.random() * (31.5 - 29.5) + 29.5).toFixed(1)));
      // Fluctuate randomly between 65 and 72
      setHumidity(Math.floor(Math.random() * (72 - 65 + 1)) + 65);
      // Alternate between 1, 2, and 3
      setSpoilageRisk(Math.floor(Math.random() * 3) + 1);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const isSpoilageDetected = spoilageRisk >= 10; // Keeping the conditional logic intact in case risk spikes

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        
        {/* ── Signature Green Header ── */}
        <View className="bg-green-500 pt-8 pb-6 px-6 rounded-b-3xl shadow-md">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-white text-2xl font-bold">Hello, {user?.displayName?.split(' ')[0] || 'Farmer'}</Text>
            <TouchableOpacity 
              className="bg-green-600 p-2 rounded-full" 
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text className="text-green-100 mt-1 font-medium">🟢 Gateway Online • All Sensors Active</Text>
        </View>

        {/* ── IoT Telemetry Cards (Hero Section) ── */}
        <View className="px-4 mt-6 flex-row flex-wrap justify-between">
          
          {/* Card 1 (Temperature) */}
          <View className="w-[48%] bg-white rounded-2xl p-5 mb-4 shadow-sm border border-slate-100 flex-col">
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
          <View className="w-[48%] bg-white rounded-2xl p-5 mb-4 shadow-sm border border-slate-100 flex-col">
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
          <View className="w-full bg-white rounded-2xl p-5 mb-6 shadow-sm border border-slate-100 flex-col">
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

        {/* ── Section 1: Active Crop Distribution ── */}
        <View className="px-4 mt-2">
          <Text className="text-xl font-bold text-slate-800 mb-3 mt-6">{t('Active Crops')}</Text>
          
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="bg-red-50 p-3 rounded-full mr-3">
                <Ionicons name="nutrition" size={24} color="#ef4444" />
              </View>
              <View>
                <Text className="text-lg font-bold text-slate-800">{t('Apples')}</Text>
                <Text className="text-slate-500 text-sm">1.2 {t('Acres')}</Text>
              </View>
            </View>
            <Text className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full text-xs">80% {t('Ready')}</Text>
          </View>

          <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="bg-yellow-50 p-3 rounded-full mr-3">
                <Ionicons name="leaf" size={24} color="#eab308" />
              </View>
              <View>
                <Text className="text-lg font-bold text-slate-800">{t('Corn')}</Text>
                <Text className="text-slate-500 text-sm">3.5 {t('Acres')}</Text>
              </View>
            </View>
            <Text className="text-orange-600 font-bold bg-orange-100 px-3 py-1 rounded-full text-xs">40% {t('Ready')}</Text>
          </View>
        </View>

        {/* ── Section 2: Agronomy Advisory Timeline ── */}
        <View className="px-4 mt-2">
          <Text className="text-xl font-bold text-slate-800 mb-3 mt-6">{t('Smart Agronomy')}</Text>
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
            
            {/* Timeline Item 1 */}
            <View className="flex-row mb-6 relative">
              <View className="items-center mr-4">
                <View className="w-4 h-4 rounded-full bg-slate-300 z-10" />
                <View className="w-0.5 bg-slate-200 absolute top-4 bottom-[-24px]" />
              </View>
              <View className="flex-1 pb-2">
                <Text className="text-slate-400 font-bold text-base">{t('Pre-Planting')}</Text>
                <Text className="text-slate-400 text-sm mt-1">{t('Completed: Soil tested and fertilized.')}</Text>
              </View>
            </View>

            {/* Timeline Item 2 (Active) */}
            <View className="flex-row mb-6 relative">
              <View className="items-center mr-4">
                <View className="w-4 h-4 rounded-full bg-green-500 z-10" />
                <View className="w-0.5 bg-slate-200 absolute top-4 bottom-[-24px]" />
              </View>
              <View className="flex-1 pb-2">
                <Text className="text-slate-800 font-bold text-base">{t('Seedlings (Active)')}</Text>
                <Text className="text-slate-500 text-sm mt-1">{t('Humidity is optimal. Continue light irrigation cycle.')}</Text>
              </View>
            </View>

            {/* Timeline Item 3 */}
            <View className="flex-row relative">
              <View className="items-center mr-4">
                <View className="w-4 h-4 rounded-full bg-slate-300 z-10" />
              </View>
              <View className="flex-1 pb-2">
                <Text className="text-slate-400 font-bold text-base">{t('Knee High')}</Text>
                <Text className="text-slate-400 text-sm mt-1">{t('Upcoming phase: Requires nitrogen boost.')}</Text>
              </View>
            </View>
            
          </View>
        </View>

        {/* ── Conditional Action: Exhaust Fans ── */}
        {isSpoilageDetected && (
          <TouchableOpacity 
            className="mx-4 bg-red-500 border-[1.5px] border-red-600 rounded-full py-4 items-center mb-6 shadow-sm shadow-red-500/30 flex-row justify-center"
            onPress={() => alert('Exhaust command sent to hardware!')}
          >
            <Ionicons name="warning" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white text-base font-bold">ACTIVATE EXHAUST FANS</Text>
          </TouchableOpacity>
        )}

        {/* ── Quick Action Buttons (Floating Pills) ── */}
        <View className="px-4">
          <Text className="text-slate-500 font-bold mb-3 ml-2 text-xs uppercase tracking-wider">{t('Quick Actions')}</Text>
          
          <TouchableOpacity 
            className="bg-white border-[1.5px] border-green-500 rounded-full py-4 px-6 shadow-sm flex-row items-center justify-center mb-4" 
            onPress={() => navigation.navigate('CropUpload')}
          >
            <Ionicons name="add" size={22} color="#16a34a" style={{ marginRight: 6 }} />
            <Text className="text-green-600 font-bold text-base">{t('Add New Crop')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-white border-[1.5px] border-green-500 rounded-full py-4 px-6 shadow-sm flex-row items-center justify-center mb-4" 
            onPress={() => navigation.navigate('Inbox')}
          >
            <Ionicons name="list" size={22} color="#16a34a" style={{ marginRight: 6 }} />
            <Text className="text-green-600 font-bold text-base">{t('View Markets')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity 
          className="mt-6 mx-4 bg-red-50 border border-red-100 py-3 rounded-full items-center flex-row justify-center" 
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
          <Text className="text-red-500 text-sm font-bold">{t('Logout')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
