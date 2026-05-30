import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // The IoT telemetry is now explicitly tied to the logged-in farmer's profile using their UID.
  const DEVICE_ID = user.uid;

  useEffect(() => {
    // Set up the real-time listener to the IoT data
    const docRef = doc(db, 'storage_telemetry', DEVICE_ID);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setTelemetry(docSnap.data());
      } else {
        console.log("No telemetry data found for this unit.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#029a43" />
        <Text className="mt-4 text-gray-600 font-medium" style={{ fontFamily: 'NotoSans_500Medium' }}>Syncing with Storage Unit...</Text>
      </View>
    );
  }

  // Determine dynamic styles based on the gas sensor status
  const isSpoilageDetected = telemetry?.status === 'CRITICAL_SPOILAGE_DETECTED';
  const statusColor = isSpoilageDetected ? '#ef4444' : '#10b981'; // Tailwind red-500 or emerald-500
  const statusBg = isSpoilageDetected ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200';

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-16 pb-6 bg-white rounded-b-3xl shadow-sm shadow-black/5">
        <View>
          <Text className="text-gray-500 text-sm font-semibold mb-1" style={{ fontFamily: 'NotoSans_600SemiBold' }}>{t('Welcome back,')}</Text>
          <Text className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'NotoSans_800ExtraBold' }}>{t('Dashboard')}</Text>
        </View>
        <TouchableOpacity 
          className="bg-gray-100 p-3 rounded-full" 
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={24} color="#4b5563" />
        </TouchableOpacity>
      </View>

      <View className="px-6 mt-6">
        {/* Status Card */}
        <View className={`p-6 rounded-3xl border-2 mb-6 items-center shadow-sm ${statusBg}`}>
          <Text className="text-gray-500 text-sm font-bold mb-2 uppercase tracking-wider" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('Unit Status')}</Text>
          <Text className="text-lg font-extrabold text-center" style={{ color: statusColor, fontFamily: 'NotoSans_800ExtraBold' }}>
            {isSpoilageDetected ? "⚠️ CRITICAL SPOILAGE DETECTED" : "✅ ALL SYSTEMS NORMAL"}
          </Text>
          <Text className="text-gray-400 text-xs mt-2" style={{ fontFamily: 'NotoSans_400Regular' }}>Device ID: {DEVICE_ID.substring(0, 8)}...</Text>
        </View>

        {/* Telemetry Grid */}
        <View className="flex-row flex-wrap justify-between mb-2">
          <View className="w-[48%] bg-white p-5 rounded-3xl mb-4 items-center shadow-sm shadow-black/5 border border-gray-100">
            <View className="bg-orange-50 p-3 rounded-full mb-3">
              <Ionicons name="thermometer" size={24} color="#f97316" />
            </View>
            <Text className="text-gray-500 text-xs font-bold mb-1" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('Temperature')}</Text>
            <Text className="text-2xl font-extrabold text-gray-800" style={{ fontFamily: 'NotoSans_800ExtraBold' }}>{telemetry?.currentTemperature || '--'}°C</Text>
          </View>

          <View className="w-[48%] bg-white p-5 rounded-3xl mb-4 items-center shadow-sm shadow-black/5 border border-gray-100">
            <View className="bg-blue-50 p-3 rounded-full mb-3">
              <Ionicons name="water" size={24} color="#3b82f6" />
            </View>
            <Text className="text-gray-500 text-xs font-bold mb-1" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('Humidity')}</Text>
            <Text className="text-2xl font-extrabold text-gray-800" style={{ fontFamily: 'NotoSans_800ExtraBold' }}>{telemetry?.currentHumidity || '--'}%</Text>
          </View>

          <View className="w-[100%] bg-white p-5 rounded-3xl mb-4 items-center shadow-sm shadow-black/5 border border-gray-100">
            <View className="bg-purple-50 p-3 rounded-full mb-3">
              <Ionicons name="cloud" size={24} color="#a855f7" />
            </View>
            <Text className="text-gray-500 text-xs font-bold mb-1" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('Gas Level (VOC)')}</Text>
            <Text className="text-2xl font-extrabold text-gray-800" style={{ fontFamily: 'NotoSans_800ExtraBold' }}>{telemetry?.gasLevel || '--'} ppm</Text>
          </View>
        </View>

        {/* Conditional UI: Only show the exhaust fan button if spoilage is detected */}
        {isSpoilageDetected && (
          <TouchableOpacity 
            className="bg-red-500 p-5 rounded-2xl items-center mb-6 shadow-md shadow-red-500/30 flex-row justify-center"
            onPress={() => alert('Exhaust command sent to hardware!')}
          >
            <Ionicons name="warning" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white text-base font-extrabold" style={{ fontFamily: 'NotoSans_800ExtraBold' }}>ACTIVATE EXHAUST FANS</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <TouchableOpacity 
          className="bg-white border border-gray-200 p-5 rounded-2xl items-center mb-4 shadow-sm shadow-black/5 flex-row justify-center" 
          onPress={() => navigation.navigate('Inbox')}
        >
          <Ionicons name="mail" size={20} color="#4b5563" style={{ marginRight: 8 }} />
          <Text className="text-gray-700 text-base font-bold" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('View Inbox')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="bg-[#029a43] p-5 rounded-2xl items-center mb-8 shadow-sm shadow-black/20 flex-row justify-center" 
          onPress={() => navigation.navigate('CropUpload')}
        >
          <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text className="text-white text-base font-bold" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('List New Crop')}</Text>
        </TouchableOpacity>

        {/* Logout Button at the bottom */}
        <TouchableOpacity 
          className="bg-red-50 border border-red-100 p-4 rounded-xl items-center flex-row justify-center" 
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 6 }} />
          <Text className="text-red-500 text-sm font-bold" style={{ fontFamily: 'NotoSans_700Bold' }}>{t('Logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
