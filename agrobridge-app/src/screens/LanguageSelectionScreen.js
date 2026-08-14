// agrobridge-app/src/screens/LanguageSelectionScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ImageBackground, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { id: 'te', name: 'Telugu', native: 'తెలుగు' },
  { id: 'mr', name: 'Marathi', native: 'मराठी' },
  { id: 'ml', name: 'Malayalam', native: 'മലയാളം' },
];

export default function LanguageSelectionScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useAuth();
  const [selected, setSelected] = useState(language || 'en');

  // If we came from the Profile page, we can show a back button
  const isFromProfile = route.params?.fromProfile || false;

  const handleContinue = async () => {
    try {
      // Update context and persistent storage first so the new screen mounts with correct language
      await setLanguage(selected);

      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Failed to select language', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ── Full-screen background ── */}
      <ImageBackground
        source={require('../../assets/lang-bg.jpg')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {/* Scrim overlay */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />

        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            {/* Back button (from Profile) */}
            {isFromProfile && (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginTop: Platform.OS === 'android' ? 40 : 16, marginBottom: 8, alignSelf: 'flex-start', padding: 8 }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Header */}
            <View style={{ marginTop: isFromProfile ? 0 : (Platform.OS === 'android' ? 60 : 40) }}>
              <Text
                style={{
                  fontSize: 36,
                  color: '#ffffff',
                  letterSpacing: -0.5,
                  marginBottom: 8,
                  fontFamily: 'PlusJakartaSans_800ExtraBold',
                  textShadowColor: 'rgba(0,0,0,0.6)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 8,
                }}
              >
                {t('Select Language')}
              </Text>
              <Text
                style={{
                  color: '#d1d5db',
                  fontSize: 18,
                  marginBottom: 32,
                  fontFamily: 'PlusJakartaSans_500Medium',
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
              >
                {t('Choose your preferred language for AgroBridge.')}
              </Text>
            </View>

            {/* Language Cards */}
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
                const isSelected = selected === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setSelected(item.id)}
                    activeOpacity={0.75}
                    style={{
                      marginBottom: 12,
                      borderRadius: 16,
                      overflow: 'hidden', // Clips the BlurView and gradient
                    }}
                  >
                    {/* Glassmorphism Layers (Adjust these for the 'foggy' effect) */}
                    <BlurView
                      intensity={120} // Increase for more blur (0-100+)
                      tint="light"    // Try 'light', 'dark', or 'default'
                      style={StyleSheet.absoluteFillObject}
                    />
                    <LinearGradient
                      // Adjust the alpha values (0.15, 0.05) to make it more or less "milky"
                      colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.02)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />

                    {/* Thick glass edge highlight */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderTopWidth: 1.5,
                        borderLeftWidth: 1.5,
                        borderColor: isSelected ? '#22c55e' : 'rgba(255,255,255,0.30)',
                      }}
                    />

                    <View
                      style={[
                        {
                          paddingVertical: 20,
                          paddingHorizontal: 20,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderRadius: 16,
                        },
                        isSelected
                          ? {
                            backgroundColor: 'rgba(22, 101, 52, 0.40)', // Brighter green tint for selected
                          }
                          : {
                            backgroundColor: 'rgba(255,255,255,0.30)', // Much more translucent unselected state
                          },
                      ]}
                    >
                      <View>
                        <Text
                          style={{
                            color: '#ffffff',
                            fontSize: 18,
                            fontFamily: 'PlusJakartaSans_700Bold',
                          }}
                        >
                          {item.native}
                        </Text>
                        <Text
                          style={{
                            color: '#ffffff', // Changed from #9ca3af to match other text
                            fontSize: 13,
                            marginTop: 2,
                            fontFamily: 'PlusJakartaSans_500Medium',
                            opacity: 0.9, // Slight opacity to still differentiate it slightly
                          }}
                        >
                          {item.name}
                        </Text>
                      </View>

                      {isSelected && (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#22c55e',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#22c55e',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 8,
                          }}
                        >
                          <Ionicons name="checkmark" size={16} color="#000" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Sticky Continue Button (Matches Login Screen) */}
          <View style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 }}>
            <TouchableOpacity
              onPress={handleContinue}
              activeOpacity={0.85}
              style={{
                height: 56,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#16a34a',
                borderWidth: 1,
                borderColor: 'rgba(74,222,128,0.30)',
                shadowColor: '#14532d',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.6,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 18,
                  fontFamily: 'PlusJakartaSans_700Bold',
                }}
              >
                {t('Continue')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}
