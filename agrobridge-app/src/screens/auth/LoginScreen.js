// agrobridge-app/src/screens/auth/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  Text, TextInput, View, TouchableOpacity, ActivityIndicator,
  ImageBackground, Dimensions, KeyboardAvoidingView, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { auth } from '../../config/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Svg, { Path } from 'react-native-svg';
import { signInWithPhoneNumber, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { t } = useTranslation();
  const { bypassLogin } = useAuth();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '108853026140-2m2pshn6krpp7bnld031a0bb0krcm6ht.apps.googleusercontent.com',
    });
  }, []);

  const handleSendOTP = async () => {
    setErrorMsg('');
    if (phone.trim().length !== 10) {
      setErrorMsg('Please enter exactly 10 digits for your phone number.');
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `+91${phone.trim()}`;
      const confirmation = await signInWithPhoneNumber(auth, fullPhone);
      setConfirm(confirmation);
    } catch (error) {
      console.error(error);
      switch (error.code) {
        case 'auth/too-many-requests':
          setErrorMsg('Too many requests to this number. Please try again later.');
          break;
        case 'auth/invalid-phone-number':
          setErrorMsg('The phone number entered is invalid.');
          break;
        case 'auth/network-request-failed':
          setErrorMsg('Network error. Please check your internet connection.');
          break;
        default:
          setErrorMsg('Could not send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    if (!otp || otp.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await confirm.confirm(otp);
    } catch (error) {
      console.error(error);
      switch (error.code) {
        case 'auth/invalid-verification-code':
          setErrorMsg('The code you entered is incorrect. Please try again.');
          break;
        case 'auth/code-expired':
          setErrorMsg('This code has expired. Please go back and request a new one.');
          setConfirm(null);
          break;
        case 'auth/network-request-failed':
          setErrorMsg('Network error. Please check your internet connection.');
          break;
        default:
          setErrorMsg('Invalid OTP code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const { idToken } = await GoogleSignin.signIn();
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, googleCredential);
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      {/* ── Full-screen background ── */}
      <ImageBackground
        source={require('../../../assets/login-bg.avif')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {/* Scrim overlay */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />

        {/* ── Language pill (top-right, no grid) ── */}
        <TouchableOpacity
          onPress={() => navigation.navigate('LanguageSelection')}
          style={{
            position: 'absolute',
            top: 56,
            right: 24,
            zIndex: 30,
            backgroundColor: 'rgba(0,0,0,0.30)',
            padding: 12,
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
          }}
        >
          <Ionicons name="language" size={20} color="#fff" />
        </TouchableOpacity>

        {/* ── Flex-start column: typography and glass sheet are moved to the top ── */}
        <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: 100 }}>

          {/* Typography — floats above the sheet */}
          <View style={{ paddingHorizontal: 32, paddingBottom: 28 }}>
            <Text
              style={{
                fontSize: 36,
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: -0.5,
                marginBottom: 8,
                fontFamily: 'NotoSans_800ExtraBold',
                textShadowColor: 'rgba(0,0,0,0.6)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}
            >
              {t('Welcome!')}
            </Text>
            <Text
              style={{
                fontSize: 18,
                color: '#d1d5db',
                fontFamily: 'NotoSans_500Medium',
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {t('Login to AgroBridge')}
            </Text>
          </View>

          {/* ── Glass Card ── */}
          <View style={{ marginHorizontal: 8, marginTop: 16 }}>
          {/* The Mold — fully rounded, overflow hidden clips all layers */}
          <View
            style={{
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
            {/* L1 — Deep Refraction */}
            <BlurView
              intensity={90}
              tint="dark"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* L2 — Liquid Gloss (diagonal sweep) */}
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* L3 — Thick glass edge highlight */}
            <View
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: 24,
                borderWidth: 1,
                borderTopWidth: 1.5,
                borderLeftWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.20)',
              }}
            />

            {/* L4 — Content */}
            <View style={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 32 }}>

              <View style={{ gap: 16 }}>
                {!confirm ? (
                  <View>
                    {/* Phone input */}
                    <Text
                      style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 12, marginLeft: 16, fontFamily: 'NotoSans_700Bold' }}
                    >
                      {t('Phone Number')}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.40)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
                        borderRadius: 16, height: 64, paddingHorizontal: 16,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8, fontFamily: 'NotoSans_700Bold' }}>
                        +91
                      </Text>
                      <TextInput
                        style={{ flex: 1, fontSize: 16, color: '#fff', fontFamily: 'NotoSans_400Regular' }}
                        placeholder="1234567890"
                        placeholderTextColor="#6b7280"
                        value={phone}
                        onChangeText={(val) => { setPhone(val); setErrorMsg(''); }}
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                    </View>

                    {errorMsg ? (
                      <Text style={{ color: '#f87171', fontSize: 12, fontWeight: 'bold', marginTop: 8, marginLeft: 4, fontFamily: 'NotoSans_600SemiBold' }}>
                        {errorMsg}
                      </Text>
                    ) : null}

                    {/* Send OTP */}
                    <TouchableOpacity
                      style={{
                        height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16,
                        backgroundColor: '#16a34a',
                        borderWidth: 1, borderColor: 'rgba(74,222,128,0.30)',
                        shadowColor: '#14532d', shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
                      }}
                      onPress={handleSendOTP}
                      disabled={loading}
                    >
                      {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: 'NotoSans_700Bold' }}>{t('Send OTP')}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {/* OTP input */}
                    <Text
                      style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 12, marginLeft: 16, fontFamily: 'NotoSans_700Bold' }}
                    >
                      {t('Enter OTP Code')}
                    </Text>
                    <TextInput
                      style={{
                        height: 56, paddingHorizontal: 16, borderRadius: 16,
                        fontSize: 16, color: '#fff', textAlign: 'center', letterSpacing: 10,
                        backgroundColor: 'rgba(0,0,0,0.40)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
                        fontFamily: 'NotoSans_700Bold',
                      }}
                      placeholder="── ── ──"
                      placeholderTextColor="#6b7280"
                      value={otp}
                      onChangeText={(val) => { setOtp(val); setErrorMsg(''); }}
                      keyboardType="number-pad"
                      maxLength={6}
                    />

                    {errorMsg ? (
                      <Text style={{ color: '#f87171', fontSize: 12, fontWeight: 'bold', marginTop: 8, marginLeft: 4, fontFamily: 'NotoSans_600SemiBold' }}>
                        {errorMsg}
                      </Text>
                    ) : null}

                    {/* Verify & Login */}
                    <TouchableOpacity
                      style={{
                        height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16,
                        backgroundColor: '#16a34a',
                        borderWidth: 1, borderColor: 'rgba(74,222,128,0.30)',
                        shadowColor: '#14532d', shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
                      }}
                      onPress={handleVerifyOTP}
                      disabled={loading}
                    >
                      {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: 'NotoSans_700Bold' }}>{t('Verify & Login')}</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setConfirm(null)}>
                      <Text style={{ color: '#9ca3af', fontFamily: 'NotoSans_600SemiBold' }}>{t('Change Phone Number')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Google Sign-In */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', height: 56, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                  }}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Svg width="20" height="20" viewBox="0 0 24 24">
                    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.3-4.74 3.3-8.09z" fill="#4285F4" />
                    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </Svg>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8, fontFamily: 'NotoSans_700Bold' }}>
                    {t('Login with Google')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 8, alignItems: 'center' }} onPress={() => navigation.navigate('Register')}>
                  <Text style={{ color: '#9ca3af', fontSize: 15, fontFamily: 'NotoSans_600SemiBold' }}>
                    {t("Don't have an account?")}{' '}
                    <Text style={{ color: '#fff', fontFamily: 'NotoSans_800ExtraBold' }}>{t('Register here')}</Text>
                  </Text>
                </TouchableOpacity>

                {__DEV__ && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                    <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 11, marginBottom: 12, fontFamily: 'NotoSans_700Bold' }}>
                      DEVELOPMENT ONLY
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                      <TouchableOpacity
                        style={{ backgroundColor: '#1e3a8a', borderWidth: 1, borderColor: '#1d4ed8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginHorizontal: 4 }}
                        onPress={() => bypassLogin('FARMER')}
                      >
                        <Text style={{ color: '#bfdbfe', fontSize: 12, fontWeight: 'bold', fontFamily: 'NotoSans_700Bold' }}>Bypass (Farmer)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: '#581c87', borderWidth: 1, borderColor: '#7e22ce', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginHorizontal: 4 }}
                        onPress={() => bypassLogin('BUYER')}
                      >
                        <Text style={{ color: '#e9d5ff', fontSize: 12, fontWeight: 'bold', fontFamily: 'NotoSans_700Bold' }}>Bypass (Buyer)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
