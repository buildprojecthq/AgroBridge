import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

export default function CommodityDetailScreen({ navigation }) {
  const chartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
      {
        data: [250, 300, 250, 250, 250],
        color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`, // green-600
        strokeWidth: 2
      },
      {
        data: [200, 220, 190, 190, 190],
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // red-500
        strokeWidth: 2
      }
    ]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, 0.05)`, // very faint grey for grid
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#ffffff"
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      
      {/* ── Header & Hero Section ── */}
      <View className="bg-green-500 pt-12 pb-16 px-6 rounded-b-[40px] shadow-md items-center relative z-10">
        <TouchableOpacity 
          className="absolute left-6 top-14 p-2" 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold mt-2">Corn</Text>
      </View>

      <View className="bg-white rounded-full p-6 shadow-lg border border-slate-100 -mt-12 self-center z-20">
        <Text style={{ fontSize: 48 }}>🌽</Text>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView className="flex-1 px-4 pt-6 bg-slate-50" showsVerticalScrollIndicator={false}>
        
        {/* Historical Data Table */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Recent Pricing</Text>
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <View className="flex-row justify-between pb-2 border-b border-slate-200">
            <Text className="text-slate-500 font-bold w-1/3">Date</Text>
            <Text className="text-slate-500 font-bold w-1/3 text-center">Price</Text>
            <Text className="text-slate-500 font-bold w-1/3 text-right">Volume</Text>
          </View>
          
          {[
            { date: '11 Oct', price: '₹260 - ₹280', vol: '10 kg' },
            { date: '10 Oct', price: '₹255 - ₹275', vol: '45 kg' },
            { date: '09 Oct', price: '₹240 - ₹260', vol: '120 kg' },
            { date: '08 Oct', price: '₹230 - ₹250', vol: '200 kg' }
          ].map((row, idx) => (
            <View key={idx} className="flex-row justify-between py-3 border-b border-slate-100">
              <Text className="text-slate-500 w-1/3">{row.date}</Text>
              <Text className="text-slate-800 font-bold w-1/3 text-center">{row.price}</Text>
              <Text className="text-slate-500 w-1/3 text-right">{row.vol}</Text>
            </View>
          ))}
        </View>

        {/* ── The Price Trend Chart ── */}
        <Text className="text-lg font-bold text-slate-800 mt-8 mb-2">Price Trend</Text>
        
        {/* The Legend */}
        <View className="flex-row items-center mb-4">
          <View className="flex-row items-center mr-6">
            <View className="w-3 h-3 rounded-full bg-green-600 mr-2" />
            <Text className="text-slate-600 font-medium">Maximum price</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            <Text className="text-slate-600 font-medium">Minimum price</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl py-4 shadow-sm border border-slate-100 mt-2 mb-32 overflow-hidden items-center">
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 32} // fits within screen padding
            height={220}
            chartConfig={chartConfig}
            bezier
            withOuterLines={false}
            style={{
              borderRadius: 16,
              marginLeft: -10, // offset to hide left margin on the chart
            }}
          />
        </View>

      </ScrollView>

      {/* ── Sticky Action Button (Escrow Checkout) ── */}
      <View className="absolute bottom-0 left-0 right-0 w-full bg-white px-6 py-5 border-t border-slate-200">
        <TouchableOpacity 
          className="bg-green-600 rounded-full py-4 items-center shadow-lg shadow-green-900/30"
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text className="text-white text-lg font-bold">Secure Checkout</Text>
        </TouchableOpacity>
      </View>
      
    </SafeAreaView>
  );
}
