// agrobridge-app/src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('FARMER'); // Default selection
  const [registering, setRegistering] = useState(false);
  const { setUserRole } = useAuth();

  const handleRegister = async () => {
    // 1. Basic Form Validation
    if (!name || !email || !phone || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setRegistering(true);
    try {
      // 2. Create the user credential in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 3. Construct the clean role-based data payload
      const userProfile = {
        uid: firebaseUser.uid,
        name: name,
        email: email,
        phone: phone,
        role: role,
        createdAt: Math.floor(Date.now() / 1000)
      };

      // 4. Securely write the user profile to Cloud Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), userProfile);

      // 5. Update the global context state so AppNavigator routes them instantly
      setUserRole(role);

    } catch (error) {
      console.error(error);
      Alert.alert("Registration Failed", error.message);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join the AgroBridge Marketplace</Text>

      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Password (Min 6 chars)" value={password} onChangeText={setPassword} secureTextEntry />

      {/* --- ROLE SELECTION DROPDOWN INTERFACE --- */}
      <Text style={styles.label}>Select Your Role:</Text>
      <View style={styles.roleContainer}>
        <TouchableOpacity style={[styles.roleButton, role === 'FARMER' && styles.activeRole]} onPress={() => setRole('FARMER')}>
          <Text style={[styles.roleText, role === 'FARMER' && styles.activeRoleText]}>Farmer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.roleButton, role === 'BUYER' && styles.activeRole]} onPress={() => setRole('BUYER')}>
          <Text style={[styles.roleText, role === 'BUYER' && styles.activeRoleText]}>Buyer / Company</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleRegister} disabled={registering}>
        {registering ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Register</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Already have an account? Login here</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9f9f9' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, fontSize: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 8 },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  roleButton: { flex: 1, padding: 14, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#ddd' },
  activeRole: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  roleText: { fontSize: 16, color: '#555', fontWeight: '500' },
  activeRoleText: { color: '#fff', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#2E7D32', fontSize: 14, fontWeight: '500' }
});