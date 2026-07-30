import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen({ navigation }) {
  const { user, userRole, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <ScrollView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-16 pb-6 bg-white rounded-b-3xl shadow-sm shadow-black/5">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{t('My Profile')}</Text>
      </View>

      <View className="px-6 py-8 items-center">
        <View className="bg-gray-200 w-24 h-24 rounded-full items-center justify-center mb-4">
          <Ionicons name="person" size={48} color="#9ca3af" />
        </View>
        <Text className="text-xl font-bold text-gray-800" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{user?.displayName || "AgroBridge User"}</Text>
        <Text className="text-gray-500 mb-6" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>{user?.email || user?.phoneNumber || "No contact info"}</Text>

        <View className="w-full bg-white rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 mb-6">
          <Text className="text-gray-400 text-xs font-bold uppercase mb-4" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Account Details')}</Text>
          
          <View className="flex-row items-center justify-between mb-4 border-b border-gray-100 pb-4">
            <Text className="text-gray-600 font-medium" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>{t('Role')}</Text>
            <View className="bg-[#029a43]/10 px-3 py-1 rounded-full">
              <Text className="text-[#029a43] font-bold text-xs" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{userRole}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-gray-600 font-medium" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>{t('User ID')}</Text>
            <Text className="text-gray-400 text-xs font-mono">{user?.uid?.substring(0, 10)}...</Text>
          </View>
        </View>

        <TouchableOpacity 
          className="w-full bg-[#029a43] py-4 rounded-xl items-center flex-row justify-center shadow-sm mb-4" 
          onPress={() => alert('Edit profile coming soon!')}
        >
          <Ionicons name="pencil" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text className="text-white font-bold" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Edit Profile')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="w-full bg-white border border-gray-200 py-4 rounded-xl items-center flex-row justify-center shadow-sm mb-4" 
          onPress={() => navigation.navigate('LanguageSelection', { fromProfile: true })}
        >
          <Ionicons name="language" size={18} color="#4b5563" style={{ marginRight: 8 }} />
          <Text className="text-gray-700 font-bold" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Change Language')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="w-full bg-red-50 border border-red-100 py-4 rounded-xl items-center flex-row justify-center" 
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 6 }} />
          <Text className="text-red-500 font-bold" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
