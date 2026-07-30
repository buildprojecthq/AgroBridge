import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { BlurView } from 'expo-blur';
import { View as MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

export default function GuestDashboardScreen({ navigation }) {
  const { logout } = useAuth();
  const { t } = useTranslation();

  return (
    <ImageBackground 
      source={require('../../assets/register-bg.jpg')} 
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      
      <SafeAreaView className="flex-1 px-6 justify-center" edges={['top', 'left', 'right', 'bottom']}>
        
        <MotiView 
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          className="items-center mb-10"
        >
          <View className="bg-emerald-500/20 p-4 rounded-full mb-4">
            <Ionicons name="leaf" size={48} color="#10b981" />
          </View>
          <Text className="text-white text-3xl font-bold font-['PlusJakartaSans_800ExtraBold'] text-center">
            {t('Welcome to AgroBridge')}
          </Text>
          <Text className="text-slate-300 text-base mt-2 text-center font-['PlusJakartaSans_500Medium'] px-4">
            {t('You are logged in as a Guest. Choose an experience below to explore the platform.')}
          </Text>
        </MotiView>

        <MotiView 
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 200 }}
          className="gap-5"
        >
          {/* Farmer Button */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('FarmerHome')}
            className="rounded-3xl overflow-hidden shadow-lg shadow-emerald-900/50"
          >
            <BlurView intensity={80} tint="dark" className="p-6 border border-emerald-500/30">
              <View className="flex-row items-center">
                <LinearGradient 
                  colors={['#10b981', '#059669']} 
                  className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                >
                  <Ionicons name="tractor" size={28} color="white" />
                </LinearGradient>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold font-['PlusJakartaSans_700Bold']">{t('Farmer Dashboard')}</Text>
                  <Text className="text-emerald-100 text-sm mt-1">{t('Manage crops and IoT devices')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#10b981" />
              </View>
            </BlurView>
          </TouchableOpacity>

          {/* Buyer Button */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('BuyerHome')}
            className="rounded-3xl overflow-hidden shadow-lg shadow-blue-900/50"
          >
            <BlurView intensity={80} tint="dark" className="p-6 border border-blue-500/30">
              <View className="flex-row items-center">
                <LinearGradient 
                  colors={['#3b82f6', '#2563eb']} 
                  className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                >
                  <Ionicons name="cart" size={28} color="white" />
                </LinearGradient>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold font-['PlusJakartaSans_700Bold']">{t('Buyer Marketplace')}</Text>
                  <Text className="text-blue-100 text-sm mt-1">{t('Browse and purchase crops')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
              </View>
            </BlurView>
          </TouchableOpacity>
        </MotiView>

        <TouchableOpacity 
          onPress={logout}
          className="mt-12 items-center flex-row justify-center"
        >
          <Ionicons name="log-out-outline" size={20} color="#94a3b8" />
          <Text className="text-slate-400 font-bold ml-2 font-['PlusJakartaSans_600SemiBold']">{t('Sign Out')}</Text>
        </TouchableOpacity>

      </SafeAreaView>
    </ImageBackground>
  );
}
