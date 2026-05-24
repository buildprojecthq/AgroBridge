// agrobridge-app/src/screens/buyer/MarketplaceScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function MarketplaceScreen({ navigation }) {
  const { logout } = useAuth();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Create a query to only fetch crops that are currently 'AVAILABLE'
    const cropsRef = collection(db, 'crops');
    const q = query(cropsRef, where("status", "==", "AVAILABLE"));

    // 2. Set up the real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const inventory = [];
      querySnapshot.forEach((doc) => {
        inventory.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setCrops(inventory);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching marketplace data: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Design the UI card for each crop item
  const renderCropItem = ({ item }) => (
    <View style={styles.cropCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.cropImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cropTitle}>{item.cropType}</Text>
        <Text style={styles.farmerName}>Sold by: Farmer {item.farmerId.substring(0, 5)}...</Text>

        <View style={styles.detailsRow}>
          <Text style={styles.priceText}>₹{item.pricePerKg} / Kg</Text>
          <Text style={styles.quantityText}>{item.quantityKg} Kg available</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.chatButton} 
            onPress={() => navigation.navigate('Chat', {
              cropId: item.id,
              cropName: item.cropType,
              targetUserId: item.farmerId,
              targetUserName: `Farmer ${item.farmerId.substring(0, 5)}`
            })}
          >
            <Text style={styles.chatButtonText}> Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.buyButton} 
            onPress={() => navigation.navigate('Checkout', {
              cropId: item.id,
              cropType: item.cropType,
              pricePerKg: item.pricePerKg,
              quantityKg: item.quantityKg,
              farmerId: item.farmerId
            })}
          >
            <Text style={styles.buyButtonText}> Buy Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>B2B Marketplace</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={{ marginTop: 10 }}>Loading Inventory...</Text>
        </View>
      ) : crops.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No crops available right now.</Text>
        </View>
      ) : (
        <FlatList
          data={crops}
          keyExtractor={(item) => item.id}
          renderItem={renderCropItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutButton: { padding: 8, backgroundColor: '#eee', borderRadius: 6 },
  logoutText: { color: '#333', fontWeight: 'bold' },
  listContainer: { padding: 16 },
  cropCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cropImage: { width: '100%', height: 150, backgroundColor: '#e0e0e0' },
  cardContent: { padding: 16 },
  cropTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  farmerName: { fontSize: 14, color: '#666', marginBottom: 12 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  priceText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  quantityText: { fontSize: 16, color: '#555' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chatButton: { flex: 1, backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, alignItems: 'center', marginRight: 8 },
  chatButtonText: { color: '#1976D2', fontWeight: 'bold', fontSize: 16 },
  buyButton: { flex: 1, backgroundColor: '#FF9800', padding: 12, borderRadius: 8, alignItems: 'center', marginLeft: 8 },
  buyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { fontSize: 16, color: '#666', fontStyle: 'italic' }
});