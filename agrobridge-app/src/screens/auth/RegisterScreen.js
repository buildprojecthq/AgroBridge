// agrobridge-app/src/screens/auth/RegisterScreen.js
import React, { useState, useEffect } from 'react';
import {
  Text, TextInput, View, TouchableOpacity, ActivityIndicator,
  ImageBackground, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { doc, setDoc, getDoc } from '@react-native-firebase/firestore';
import { useTranslation } from 'react-i18next';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('FARMER');
  const [registering, setRegistering] = useState(false);
  const [errors, setErrors] = useState({});
  const { t } = useTranslation();
  const { setUserRole } = useAuth();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '108853026140-2m2pshn6krpp7bnld031a0bb0krcm6ht.apps.googleusercontent.com',
    });
  }, []);

  const handleRegister = async () => {
    setErrors({});
    let newErrors = {};

    if (!name) newErrors.name = 'Full Name is required.';
    else if (name.trim().length < 5 || name.trim().length > 20)
      newErrors.name = 'Full Name must be between 5 and 20 characters.';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) newErrors.email = 'Email Address is required.';
    else if (!emailRegex.test(email.trim())) newErrors.email = 'Please enter a valid email address.';

    if (!phone) newErrors.phone = 'Phone Number is required.';
    else if (phone.trim().length !== 10) newErrors.phone = 'Please enter exactly 10 digits.';

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!password) newErrors.password = 'Password is required.';
    else if (!passwordRegex.test(password))
      newErrors.password = 'Must contain uppercase, lowercase, number, and symbol.';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setRegistering(true);
    try {
      const fullPhone = `+91${phone.trim()}`;
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;
      if (!firebaseUser?.uid) throw new Error('Failed to create user correctly.');

      const userProfile = {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: email.trim(),
        phone: fullPhone,
        role,
        createdAt: Math.floor(Date.now() / 1000),
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      setUserRole(role);
    } catch (error) {
      console.error(error);
      switch (error.code) {
        case 'auth/email-already-in-use':
          setErrors({ general: 'An account with this email address already exists.' });
          break;
        case 'auth/invalid-email':
          setErrors({ email: 'The email address is badly formatted.' });
          break;
        case 'auth/network-request-failed':
          setErrors({ general: 'Network error. Please check your internet connection.' });
          break;
        default:
          setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setRegistering(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const { idToken } = await GoogleSignin.signIn();
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      const firebaseUser = userCredential.user;
      if (!firebaseUser?.uid) throw new Error('Failed to authenticate user correctly.');

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists) {
        await setDoc(userDocRef, {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Google User',
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '',
          role,
          createdAt: Math.floor(Date.now() / 1000),
        });
      }
      setUserRole(role);
    } catch (error) {
      console.error(error);
      setErrors({ general: error.message });
    } finally {
      setRegistering(false);
    }
  };

  // ── Reusable carved-glass input style ──────────────────────────────────────
  const inputContainerStyle = {
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  };
  const inputTextStyle = { flex: 1, fontSize: 16, color: '#fff', fontFamily: 'NotoSans_400Regular' };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      {/* ── Full-screen background ── */}
      <ImageBackground
        source={require('../../../assets/register-bg.avif')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {/* Scrim overlay */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} />

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', paddingTop: 100, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* Typography — floats above the sheet */}
          <View style={{ paddingHorizontal: 32, paddingBottom: 28 }}>
            <Text
              style={{
                fontSize: 36, fontWeight: 'bold', color: '#ffffff',
                letterSpacing: -0.5, marginBottom: 8,
                fontFamily: 'NotoSans_800ExtraBold',
                textShadowColor: 'rgba(0,0,0,0.6)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}
            >
              {t('Create Account')}
            </Text>
            <Text
              style={{
                fontSize: 18, color: '#d1d5db',
                fontFamily: 'NotoSans_500Medium',
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {t('Join the AgroBridge Marketplace')}
            </Text>
          </View>

          {/* ── Glass Card ── */}
          <View style={{ marginHorizontal: 8, marginTop: 16 }}>
          {/* The Mold */}
          <View style={{ borderRadius: 24, overflow: 'hidden' }}>
            {/* L1 — Deep Refraction */}
            <BlurView
              intensity={90}
              tint="dark"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* L2 — Liquid Gloss */}
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* L3 — Thick Glass Edge */}
            <View
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: 24, borderWidth: 1,
                borderTopWidth: 1.5, borderLeftWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.20)',
              }}
            />

            {/* L4 — Content (Inner view grows naturally, main screen scrolls) */}
            <View style={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 32 }}>

              <View style={{ gap: 16 }}>
                {/* Full Name */}
                <View>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 12, marginLeft: 16, fontFamily: 'NotoSans_700Bold' }}>
                    {t('Full Name')}
                  </Text>
                  <TextInput
                    style={[inputContainerStyle, inputTextStyle]}
                    placeholder={t('Enter your name')}
                    placeholderTextColor="#6b7280"
                    value={name}
                    onChangeText={(val) => { setName(val); setErrors(p => ({ ...p, name: '' })); }}
                  />
                  {errors.name ? <Text style={{ color: '#f87171', fontSize: 12, fontWeight: 'bold', marginTop: 6, marginLeft: 4, fontFamily: 'NotoSans_600SemiBold' }}>{errors.name}</Text> : null}
                </View>

                {/* Email */}
                <View>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 12, marginLeft: 16, fontFamily: 'NotoSans_700Bold' }}>
                    {t('Email Address')}
                  </Text>
                  <TextInput
                    style={[inputContainerStyle, inputTextStyle]}
                    placeholder={t('Enter your email')}
                    placeholderTextColor="#6b7280"
                    value={email}
                    onChangeText={(val) => { setEmail(val); setErrors(p => ({ ...p, email: '' })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email ? <Text style={{ color: '#f87171', fontSize: 12, fontWeight: 'bold', marginTop: 6, marginLeft: 4, fontFamily: 'NotoSans_600SemiBold' }}>{errors.email}</Text> : null}
                </View>

                {/* Phone */}
                <View>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 12, marginLeft: 16, fontFamily: 'NotoSans_700Bold' }}>
                    {t('Phone Number')}
                  </Text>
                  <View style={{ ...inputContainerStyle, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8, fontFamily: 'NotoSans_700Bold' }}>+91</Text>
                    <TextInput
                      style={inputTextStyle}
                      placeholder="1234567890"
                      placeholderTextColor="#6b7280"
                      value={phone}
                      onChangeText={(val) => { setPhone(val); setErrors(p => ({ ...p, phone: '' })); }}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                  {errors.phone ? <Text style={{ color: '#f87171', fontSize: 12, fontWeight: 'bold', marginTop: 6, marginLeft: 4, fontFamily: 'NotoSans_600SemiBold' }}>{errors.phone}</Text> : null}
                </View>

                {/* Password */}
                <View>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 12, marginLeft: 16, fontFamily: 'NotoSans_700Bold' }}>
                    {t('Password')}
                  </Text>
                  <View style={{ ...inputContainerStyle, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      style={inputTextStyle}
                      placeholder={t('Password')}
                      placeholderTextColor="#6b7280"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(val) => { setPassword(val); setErrors(p => ({ ...p, password: '' })); }}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={{ color: '#f87171', fontSize: 12, fontWeight: 'bold', marginTop: 6, marginLeft: 4, fontFamily: 'NotoSans_600SemiBold' }}>{errors.password}</Text> : null}
                </View>

                {/* Role selector */}
                <View>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 12, marginLeft: 16, fontFamily: 'NotoSans_700Bold' }}>
                    Select Your Role
                  </Text>
                  <View style={{ flexDirection: 'row' }}>
                    {['FARMER', 'BUYER'].map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setRole(r)}
                        style={{
                          flex: 1,
                          height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                          marginHorizontal: 4,
                          backgroundColor: role === r ? 'rgba(22,101,52,0.70)' : 'rgba(0,0,0,0.30)',
                          borderWidth: 1,
                          borderColor: role === r ? '#22c55e' : 'rgba(255,255,255,0.10)',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: role === r ? '#fff' : '#9ca3af', fontFamily: 'NotoSans_700Bold' }}>
                          {r === 'FARMER' ? 'Farmer' : 'Buyer / Company'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {errors.general ? (
                  <Text style={{ color: '#f87171', fontSize: 14, fontWeight: 'bold', textAlign: 'center', fontFamily: 'NotoSans_600SemiBold' }}>
                    {errors.general}
                  </Text>
                ) : null}

                {/* Register button */}
                <TouchableOpacity
                  style={{
                    height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8,
                    backgroundColor: '#16a34a',
                    borderWidth: 1, borderColor: 'rgba(74,222,128,0.30)',
                    shadowColor: '#14532d', shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
                  }}
                  onPress={handleRegister}
                  disabled={registering}
                >
                  {registering
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: 'NotoSans_700Bold' }}>Register</Text>
                  }
                </TouchableOpacity>

                {/* Google register */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', height: 56, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                  }}
                  onPress={handleGoogleSignIn}
                  disabled={registering}
                >
                  <Svg width="20" height="20" viewBox="0 0 24 24">
                    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.3-4.74 3.3-8.09z" fill="#4285F4" />
                    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </Svg>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8, fontFamily: 'NotoSans_700Bold' }}>
                    {t('Register with Google')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 8, alignItems: 'center' }} onPress={() => navigation.navigate('Login')}>
                  <Text style={{ color: '#9ca3af', fontSize: 15, fontFamily: 'NotoSans_600SemiBold' }}>
                    {t('Already have an account?')}{' '}
                    <Text style={{ color: '#fff', fontFamily: 'NotoSans_800ExtraBold' }}>{t('Login here')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}
