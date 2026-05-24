// agrobridge-app/src/screens/farmer/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

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

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 10 }}>Syncing with Storage Unit...</Text>
      </View>
    );
  }

  // Determine dynamic styles based on the gas sensor status
  const isSpoilageDetected = telemetry?.status === 'CRITICAL_SPOILAGE_DETECTED';
  const statusColor = isSpoilageDetected ? '#D32F2F' : '#4CAF50'; // Red if bad, Green if good

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Storage Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statusCard, { borderColor: statusColor }]}>
        <Text style={styles.cardTitle}>Unit Status: {DEVICE_ID}</Text>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {isSpoilageDetected ? "⚠️ CRITICAL SPOILAGE DETECTED" : "✅ ALL SYSTEMS NORMAL"}
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.dataCard}>
          <Text style={styles.dataLabel}>Temperature</Text>
          <Text style={styles.dataValue}>{telemetry?.currentTemperature || '--'}°C</Text>
        </View>
        <View style={styles.dataCard}>
          <Text style={styles.dataLabel}>Humidity</Text>
          <Text style={styles.dataValue}>{telemetry?.currentHumidity || '--'}%</Text>
        </View>
        <View style={styles.dataCard}>
          <Text style={styles.dataLabel}>Gas Level (VOC)</Text>
          <Text style={styles.dataValue}>{telemetry?.gasLevel || '--'} ppm</Text>
        </View>
      </View>

      {/* Conditional UI: Only show the exhaust fan button if spoilage is detected */}
      {isSpoilageDetected && (
        <TouchableOpacity style={styles.emergencyButton} onPress={() => alert('Exhaust command sent to hardware!')}>
          <Text style={styles.emergencyButtonText}>ACTIVATE EXHAUST FANS</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={{ backgroundColor: '#FF9800', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 }} 
        onPress={() => navigation.navigate('Inbox')}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}> 📥 VIEW INBOX</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{ backgroundColor: '#1976D2', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 }} 
        onPress={() => navigation.navigate('CropUpload')}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}> LIST NEW CROP</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutButton: { padding: 8, backgroundColor: '#ddd', borderRadius: 6 },
  logoutText: { color: '#333', fontWeight: 'bold' },
  statusCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 2, marginBottom: 20, alignItems: 'center' },
  cardTitle: { fontSize: 16, color: '#666', marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dataCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  dataLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  dataValue: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32' },
  emergencyButton: { backgroundColor: '#D32F2F', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  emergencyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});