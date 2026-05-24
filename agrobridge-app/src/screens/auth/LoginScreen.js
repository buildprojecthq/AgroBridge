// agrobridge-app/src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoggingIn(true);
    try {
      // Authenticate the user. 
      // Note: We don't need to manually route the user after this.
      // The AuthContext is listening for this event and will route them automatically based on their role!
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      Alert.alert("Login Failed", "Invalid email or password. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Login to AgroBridge</Text>

      <TextInput
        style={styles.input}
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleLogin} disabled={loggingIn}>
        {loggingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Login</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>Don't have an account? Register here</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9f9f9' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, fontSize: 16 },
  submitButton: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#2E7D32', fontSize: 14, fontWeight: '500' }
});