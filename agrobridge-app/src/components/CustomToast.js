import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BaseToast = ({ props, iconName, iconColor, borderColor }) => (
  <View style={[styles.container, { borderColor }]}>
    <Ionicons name={iconName} size={32} color={iconColor} style={styles.icon} />
    <View style={styles.textContainer}>
      <Text style={styles.text1}>{props.text1}</Text>
      <Text style={styles.text2}>{props.text2}</Text>
    </View>
  </View>
);

export const toastConfig = {
  success: ({ text1, text2, props, ...rest }) => (
    <BaseToast props={{ text1, text2 }} iconName="checkmark-circle" iconColor="#10b981" borderColor="#10b981" />
  ),
  error: ({ text1, text2, props, ...rest }) => (
    <BaseToast props={{ text1, text2 }} iconName="warning" iconColor="#ef4444" borderColor="#ef4444" />
  ),
  info: ({ text1, text2, props, ...rest }) => (
    <BaseToast props={{ text1, text2 }} iconName="information-circle" iconColor="#3b82f6" borderColor="#3b82f6" />
  )
};

const styles = StyleSheet.create({
  container: {
    minHeight: 90,
    width: '92%',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    marginTop: 10
  },
  icon: {
    marginRight: 16
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  text1: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  text2: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    flexWrap: 'wrap',
  }
});
