import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleLocalNotification } from '../utils/notifications';
import { useTranslation } from 'react-i18next';

export default function ChatScreen({ route, navigation }) {
  const { user, userRole } = useAuth();
  const { t } = useTranslation();
  const { escrowId } = route.params;

  const [escrow, setEscrow] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  const [otherId, setOtherId] = useState(null);
  
  // Negotiation State
  const [isProposing, setIsProposing] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');

  useEffect(() => {
    if (!escrowId) return;
    const userId = user?.id || user?.uid;

    const fetchOrderAndMessages = async () => {
      // Fetch Escrow (Order)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, crops(name, farmer_id, price_per_kg)')
        .eq('id', escrowId)
        .single();
        
      if (orderData) {
        setEscrow({
          id: orderData.id,
          status: orderData.status,
          agreedPrice: orderData.total_price,
          cropName: orderData.crops?.name || 'Crop'
        });
        
        const targetOtherId = userRole === 'BUYER' ? orderData.crops?.farmer_id : orderData.buyer_id;
        setOtherId(targetOtherId);

        // Fetch Messages
        if (targetOtherId) {
          const { data: msgData } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetOtherId}),and(sender_id.eq.${targetOtherId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });
            
          if (msgData) {
            setMessages(msgData.map(m => ({
              id: m.id,
              senderId: m.sender_id,
              text: m.content
            })));
          }
        }
      }
      setLoading(false);
    };

    fetchOrderAndMessages();

    // Listen to Messages
    const channel = supabase
      .channel(`chat_${escrowId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (payload.new.sender_id !== userId) {
          let body = 'You have a new message';
          if (payload.new.content.includes('"type":"OFFER"')) body = 'You received a new price offer!';
          scheduleLocalNotification('AgroBridge Chat', body);
        }
        fetchOrderAndMessages();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${escrowId}` }, payload => {
        if (payload.new.status !== payload.old.status) {
          scheduleLocalNotification('Escrow Update', `The escrow status was updated to: ${payload.new.status}`);
        }
        fetchOrderAndMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [escrowId]);

  const sendMessage = async () => {
    if (inputText.trim() === '' || !otherId) return;
    const textToSend = inputText.trim();
    setInputText('');
    const userId = user?.id || user?.uid;
    try {
      await supabase.from('messages').insert([{
        sender_id: userId,
        receiver_id: otherId,
        content: textToSend
      }]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const sendOffer = async () => {
    if (!offerPrice || isNaN(offerPrice) || !otherId) return;
    const userId = user?.id || user?.uid;
    const offerPayload = JSON.stringify({ type: 'OFFER', price: parseFloat(offerPrice) });
    try {
      await supabase.from('messages').insert([{
        sender_id: userId,
        receiver_id: otherId,
        content: offerPayload
      }]);
      setIsProposing(false);
      setOfferPrice('');
    } catch (error) {
      console.error("Error sending offer:", error);
    }
  };

  const acceptOffer = async (newPrice) => {
    try {
      // Update Escrow total_price
      await supabase.from('orders').update({ total_price: newPrice }).eq('id', escrowId);
      
      // Send confirmation message
      const userId = user?.id || user?.uid;
      await supabase.from('messages').insert([{
        sender_id: userId,
        receiver_id: otherId,
        content: `✅ I have accepted the offer of ₹${newPrice}. The escrow amount has been updated.`
      }]);
    } catch (error) {
      console.error("Error accepting offer:", error);
    }
  };

  const rejectOffer = async () => {
    try {
      const userId = user?.id || user?.uid;
      await supabase.from('messages').insert([{
        sender_id: userId,
        receiver_id: otherId,
        content: `❌ I have rejected the offer.`
      }]);
    } catch (error) {
      console.error("Error rejecting offer:", error);
    }
  };

  const updateEscrowStatus = async (newStatus) => {
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', escrowId);
        // Optionally add a system message
      if (otherId) {
        const userId = user?.id || user?.uid;
        await supabase.from('messages').insert([{
          sender_id: userId,
          receiver_id: otherId,
          content: `Escrow status updated to: ${newStatus}`
        }]);
      }
    } catch (e) {
      console.error("Error updating escrow:", e);
    }
  };

  if (!escrow) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  // Determine Dynamic Header UI based on Escrow Status
  let statusColor = "bg-amber-500";
  let statusText = t("Escrow Initiated");
  if (escrow.status === "FUNDS_LOCKED") {
    statusColor = "bg-blue-500";
    statusText = t("Payment Secured");
  } else if (escrow.status === "COMPLETED") {
    statusColor = "bg-green-500";
    statusText = t("Delivery Confirmed");
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <View className="bg-white pb-4 rounded-b-3xl shadow-sm border-b border-slate-200 z-10">
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#334155" />
          </TouchableOpacity>
          <View className={`px-3 py-1 rounded-full ${statusColor}`}>
            <Text className="text-white font-bold text-xs">{statusText}</Text>
          </View>
          <View className="w-8" />
        </View>

        <View className="px-6 mt-2">
          <Text className="text-slate-800 font-bold text-2xl mb-1">₹{escrow.agreedPrice}</Text>
          <Text className="text-slate-500 font-medium mb-4">{t('Negotiating:')} {t(escrow.cropName)}</Text>

          {userRole === 'BUYER' && escrow.status === 'AWAITING_PAYMENT' && (
            <TouchableOpacity 
              className="bg-green-600 py-3 rounded-xl items-center flex-row justify-center"
              onPress={() => updateEscrowStatus('FUNDS_LOCKED')}
            >
              <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">{t('Secure Payment via Escrow')}</Text>
            </TouchableOpacity>
          )}

          {userRole === 'FARMER' && escrow.status === 'FUNDS_LOCKED' && (
            <TouchableOpacity 
              className="bg-blue-600 py-3 rounded-xl items-center flex-row justify-center"
              onPress={() => updateEscrowStatus('COMPLETED')}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">{t('Confirm Delivery & Release Funds')}</Text>
            </TouchableOpacity>
          )}

          {escrow.status === 'COMPLETED' && (
            <View className="bg-slate-100 py-3 rounded-xl items-center">
              <Text className="text-slate-600 font-bold">{t('Transaction Successfully Closed')}</Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              if (item.senderId === 'SYSTEM') {
                return (
                  <View className="items-center my-3">
                    <Text className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full overflow-hidden">
                      {item.text}
                    </Text>
                  </View>
                );
              }

              const isMyMessage = item.senderId === (user?.id || user?.uid);
              
              // Check if message is a JSON offer
              let isOffer = false;
              let offerData = null;
              try {
                if (item.text.startsWith('{')) {
                  const parsed = JSON.parse(item.text);
                  if (parsed.type === 'OFFER') {
                    isOffer = true;
                    offerData = parsed;
                  }
                }
              } catch(e) {}

              if (isOffer) {
                return (
                  <View className={`w-[80%] p-4 rounded-2xl mb-3 ${isMyMessage ? 'self-end bg-emerald-50 border border-emerald-200' : 'self-start bg-amber-50 border border-amber-200 shadow-sm'}`}>
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="pricetag" size={14} color={isMyMessage ? '#059669' : '#d97706'} style={{ marginRight: 6 }} />
                      <Text className="text-slate-500 text-xs font-bold font-['PlusJakartaSans_700Bold']">
                        {isMyMessage ? t('You made an offer') : t('Received an offer')}
                      </Text>
                    </View>
                    <Text className="text-slate-800 text-2xl font-bold mb-3 font-['PlusJakartaSans_800ExtraBold']">₹{offerData.price}</Text>
                    
                    {!isMyMessage && escrow.status === 'AWAITING_PAYMENT' && (
                      <View className="flex-row">
                        <TouchableOpacity className="flex-1 bg-emerald-600 py-2.5 rounded-xl items-center mr-2 shadow-sm" onPress={() => acceptOffer(offerData.price)}>
                          <Text className="text-white font-bold font-['PlusJakartaSans_700Bold']">{t('Accept')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-1 bg-white border border-slate-300 py-2.5 rounded-xl items-center shadow-sm" onPress={rejectOffer}>
                          <Text className="text-slate-600 font-bold font-['PlusJakartaSans_700Bold']">{t('Reject')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }

              return (
                <View className={`max-w-[80%] p-3.5 rounded-2xl mb-3 ${
                  isMyMessage 
                    ? 'self-end bg-emerald-600 rounded-br-sm shadow-sm' 
                    : 'self-start bg-white border border-slate-200 rounded-bl-sm shadow-sm'
                }`}>
                  <Text className={`text-base font-['PlusJakartaSans_500Medium'] ${isMyMessage ? 'text-white' : 'text-slate-800'}`}>
                    {item.text}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {escrow.status !== 'COMPLETED' && (
          <View>
            {isProposing ? (
              <View className="px-4 py-4 bg-white border-t border-slate-100 flex-row items-center shadow-lg">
                <Text className="text-slate-800 font-bold mr-2 text-xl">₹</Text>
                <TextInput
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-lg mr-3"
                  placeholder={t('Enter offer price')}
                  keyboardType="numeric"
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setIsProposing(false)} className="p-3 bg-slate-100 rounded-xl mr-2">
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={sendOffer} className="p-3 px-5 bg-emerald-600 rounded-xl shadow-sm">
                  <Text className="text-white font-bold font-['PlusJakartaSans_700Bold']">{t('Send')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row p-3 bg-white border-t border-slate-100 items-center px-4">
                {escrow.status === 'AWAITING_PAYMENT' && (
                  <TouchableOpacity onPress={() => setIsProposing(true)} className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 items-center justify-center mr-3 shadow-sm">
                    <Ionicons name="pricetag" size={20} color="#d97706" />
                  </TouchableOpacity>
                )}
                <TextInput
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-3 text-slate-800 max-h-24 mr-3 font-['PlusJakartaSans_500Medium']"
                  placeholder={t('Type a message...')}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
                <TouchableOpacity 
                  className="bg-emerald-600 w-12 h-12 rounded-full items-center justify-center shadow-sm"
                  onPress={sendMessage}
                >
                  <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
