// agrobridge-app/src/components/SensorCard.js
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SensorCard({ label, value, unit }) {
  return (
    <View style={styles.dataCard}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value ? `${value}${unit}` : '--'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dataCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  dataLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  dataValue: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32' },
});
