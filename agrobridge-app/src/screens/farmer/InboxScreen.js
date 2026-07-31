import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { scheduleLocalNotification } from '../../utils/notifications';
import { translateCropName } from '../../utils/translate';

export default function InboxScreen({ navigation }) {
  const { user, userRole } = useAuth();
  const { t, i18n } = useTranslation();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);

  const isBuyer = userRole === 'BUYER' || userRole === 'GUEST_BUYER';

  useEffect(() => {
    const userId = user?.id || user?.uid;
    if (!userId) return;



    const fetchOrders = async () => {
      try {
        let combinedData = [];
        
        if (isBuyer) {
          const { data, error } = await supabase.from('orders').select('*, crops(name, farmer_id)').eq('buyer_id', userId).order('created_at', { ascending: false });
          if (error) throw error;
          if (data) combinedData = data;
        } else {
          // Fetch Sales
          const { data: sales, error: err1 } = await supabase.from('orders').select('*, crops!inner(name, farmer_id)').eq('crops.farmer_id', userId).order('created_at', { ascending: false });
          if (err1) throw err1;
          
          // Fetch Purchases
          const { data: purchases, error: err2 } = await supabase.from('orders').select('*, crops(name, farmer_id)').eq('buyer_id', userId).order('created_at', { ascending: false });
          if (err2) throw err2;
          
          let allOrders = [...(sales || []), ...(purchases || [])];
          
          // Deduplicate in case a farmer buys their own crop (edge case)
          const uniqueMap = new Map();
          allOrders.forEach(item => uniqueMap.set(item.id, item));
          combinedData = Array.from(uniqueMap.values());
          
          combinedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        if (combinedData.length > 0) {
          const currentLang = i18n.language || 'en';
          const activeEscrows = await Promise.all(combinedData.map(async (order) => {
            const translatedCrop = await translateCropName(order.crops?.name || 'Crop', currentLang);
            return {
              id: order.id,
              status: order.status,
              agreedPrice: order.total_price,
              cropName: translatedCrop,
              buyerId: order.buyer_id
            };
          }));
          setEscrows(activeEscrows);
        } else {
          setEscrows([]);
        }
      } catch (error) {
        console.error("Supabase Error in InboxScreen:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    const channel = supabase
      .channel('public:orders_inbox')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        if (payload.new.status !== payload.old.status && (payload.new.buyer_id === userId || payload.new.farmer_id === userId)) {
          scheduleLocalNotification('Order Updated', `An order status changed to ${payload.new.status}`);
        }
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  const handleReleaseEscrow = async (orderId) => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;
      
      // Update local state to reflect change without waiting for realtime
      setEscrows(prev => prev.map(e => e.id === orderId ? { ...e, status: 'completed' } : e));
      alert(t("Success: Funds have been released to the farmer."));

    } catch (err) {
      console.error("Release Escrow Error:", err);
      alert(t("Error: Could not release funds. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const renderEscrowCard = ({ item }) => {
    let statusColor = "bg-amber-100 border-amber-300 text-amber-700";
    let statusText = t("Action Required: Check Chat");
    let iconName = "time-outline";
    let iconColor = "#d97706";

    if (item.status === "escrow_locked") {
      statusColor = "bg-blue-100 border-blue-300 text-blue-700";
      statusText = t("Payment Secured: Ready for Delivery");
      iconName = "lock-closed-outline";
      iconColor = "#2563eb";
    } else if (item.status === "completed") {
      statusColor = "bg-green-100 border-green-300 text-green-700";
      statusText = t("Completed: Funds Released");
      iconName = "checkmark-circle-outline";
      iconColor = "#16a34a";
    }

    return (
      <View 
        className="bg-white p-5 rounded-3xl mb-4 border border-slate-100"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
      >
        <TouchableOpacity onPress={() => navigation.navigate('Chat', { escrowId: item.id })}>
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="bg-emerald-100 p-2 rounded-xl mr-3">
                <Ionicons name="leaf" size={20} color="#10b981" />
              </View>
              <View>
                <Text className="text-slate-800 font-bold text-lg">{item.cropName}</Text>
                <Text className="text-slate-500 text-xs">Buyer ID: {item.buyerId.substring(0, 6).toUpperCase()}</Text>
              </View>
            </View>
            <Text className="text-emerald-600 font-bold text-lg">₹{item.agreedPrice}</Text>
          </View>

          <View className={`flex-row items-center px-3 py-2 rounded-xl border ${statusColor} mb-2`}>
            <Ionicons name={iconName} size={16} color={iconColor} style={{ marginRight: 6 }} />
            <Text className={`font-bold text-xs ${statusColor.split(' ').pop()}`}>
              {statusText}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Button for Buyer to Release Funds */}
        {(item.buyerId === (user?.id || user?.uid)) && item.status === "escrow_locked" && (
          <TouchableOpacity 
            className="mt-3 bg-emerald-600 py-3 rounded-xl items-center flex-row justify-center"
            onPress={() => handleReleaseEscrow(item.id)}
          >
            <Ionicons name="checkmark-done" size={18} color="white" style={{ marginRight: 6 }} />
            <Text className="text-white font-bold text-sm">{t("Confirm Delivery & Release Funds")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['left', 'right']}>
      {/* ── Premium Top Header ── */}
      <LinearGradient 
        colors={['#10b981', '#0d9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 w-full z-10"
        style={{
          paddingTop: 30, // Accounts for status bar
          paddingBottom: 24,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          shadowColor: '#059669', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12
        }}
      >
        <View className="flex-row items-center ml-3 mt-2">
          <View>
            <Text className="text-white text-3xl font-bold font-['PlusJakartaSans_800ExtraBold']">
              {isBuyer ? t("Inbox & Orders") : t("Inbox & Sales")}
            </Text>
            <Text className="text-emerald-100 font-medium opacity-90 font-['PlusJakartaSans_500Medium'] mt-1">
              {isBuyer ? t("Active Purchases & Chats") : t("Active Sales & Escrow Contracts")}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── List Area ── */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : escrows.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="mail-open-outline" size={64} color="#cbd5e1" className="mb-4" />
          <Text className="text-slate-500 font-medium text-center text-lg mt-4">
            {t("No active orders or messages yet.")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={escrows}
          keyExtractor={(item) => item.id}
          renderItem={renderEscrowCard}
          contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}
