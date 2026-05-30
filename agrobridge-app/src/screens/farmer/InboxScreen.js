// agrobridge-app/src/screens/farmer/InboxScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function InboxScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For the prototype, we find conversations by querying messages where the farmer is the receiver.
    // In a production app, a separate 'conversations' collection is better for performance.
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where("receiverId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = new Map();
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Keep the latest message for each conversation
        if (!convos.has(data.conversationId) || convos.get(data.conversationId).createdAt < data.createdAt) {
          convos.set(data.conversationId, {
            id: data.conversationId,
            cropId: data.cropId,
            buyerId: data.senderId,
            latestText: data.text,
            createdAt: data.createdAt
          });
        }
      });
      // Sort by descending createdAt (newest first)
      setConversations(Array.from(convos.values()).sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const renderConversation = ({ item }) => (
    <TouchableOpacity 
      style={styles.conversationCard}
      onPress={() => navigation.navigate('Chat', {
        cropId: item.cropId,
        cropName: "Crop Inquiry", // Generic fallback name
        targetUserId: item.buyerId,
        targetUserName: `Buyer ${item.buyerId.substring(0, 5)}`
      })}
    >
      <View style={styles.cardContent}>
        <Text style={styles.buyerName}>Buyer {item.buyerId.substring(0, 5)}...</Text>
        <Text style={styles.latestText} numberOfLines={1}>{item.latestText}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbox</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No messages yet.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { marginRight: 15, padding: 5 },
  backButtonText: { color: '#2E7D32', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  listContainer: { padding: 16 },
  conversationCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardContent: { flexDirection: 'column' },
  buyerName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  latestText: { fontSize: 14, color: '#666' },
  emptyText: { fontSize: 16, color: '#666', fontStyle: 'italic' }
});
