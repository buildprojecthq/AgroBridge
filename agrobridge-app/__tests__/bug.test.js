
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BuyerDashboard from '../src/screens/buyer/BuyerDashboard';

// Mock the AuthContext
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ logout: jest.fn() })
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView'
}));

test('renders and clicks sort by price', () => {
  const { getByText } = render(<BuyerDashboard navigation={{ navigate: jest.fn() }} />);
  const button = getByText('Sort by price');
  fireEvent.press(button);
});

