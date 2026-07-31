import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';

export default function ProfileScreen({ navigation }) {
  const { user, userRole, userProfile, logout } = useAuth();
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    address: ''
  });

  useEffect(() => {
    setForm({
      full_name: userProfile?.full_name || user?.displayName || '',
      phone_number: userProfile?.phone_number || user?.phoneNumber || '',
      address: userProfile?.address || ''
    });
  }, [userProfile, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({
        full_name: form.full_name,
        phone_number: form.phone_number,
        address: form.address
      }).eq('id', user.id || user.uid);

      if (error) throw error;
      
      // Update local state to reflect changes immediately
      if (userProfile) {
        userProfile.full_name = form.full_name;
        userProfile.phone_number = form.phone_number;
        userProfile.address = form.address;
      }
      
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

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

        {isEditing ? (
          <View className="w-full mb-6">
            <Text className="text-gray-500 font-bold mb-2 ml-1" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Full Name')}</Text>
            <TextInput 
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
              value={form.full_name}
              onChangeText={(val) => setForm({ ...form, full_name: val })}
              placeholder={t('Enter your full name')}
            />
            
            <Text className="text-gray-500 font-bold mb-2 ml-1" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Phone Number')}</Text>
            <TextInput 
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
              value={form.phone_number}
              onChangeText={(val) => setForm({ ...form, phone_number: val })}
              placeholder={t('Enter your phone number')}
              keyboardType="phone-pad"
            />
            
            <Text className="text-gray-500 font-bold mb-2 ml-1" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Address')}</Text>
            <TextInput 
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-800"
              value={form.address}
              onChangeText={(val) => setForm({ ...form, address: val })}
              placeholder={t('Enter your full address')}
              multiline
            />
            
            <View className="flex-row gap-4">
              <TouchableOpacity 
                className="flex-1 bg-gray-100 py-4 rounded-xl items-center" 
                onPress={() => {
                  setForm({
                    full_name: userProfile?.full_name || '',
                    phone_number: userProfile?.phone_number || '',
                    address: userProfile?.address || ''
                  });
                  setIsEditing(false);
                }}
              >
                <Text className="text-gray-600 font-bold" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-1 bg-[#029a43] py-4 rounded-xl items-center flex-row justify-center" 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text className="text-xl font-bold text-gray-800" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{form.full_name || "AgroBridge User"}</Text>
            <Text className="text-gray-500 mb-2" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>{form.phone_number || "No phone number"}</Text>
            <Text className="text-gray-400 mb-6 text-center px-4" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>{form.address || "No address added"}</Text>
          </>
        )}

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

        {!isEditing && (
          <TouchableOpacity 
            className="w-full bg-[#029a43] py-4 rounded-xl items-center flex-row justify-center shadow-sm mb-4" 
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="pencil" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white font-bold" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{t('Edit Profile')}</Text>
          </TouchableOpacity>
        )}

        {!isEditing && (
          <>
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
          </>
        )}
      </View>
    </ScrollView>
  );
}
