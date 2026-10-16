import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zavjkhdvrvfphxqgnhqq.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphdmpraGR2cnZmcGh4cWduaHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzA2NzQsImV4cCI6MjA5ODEwNjY3NH0.KP6GHE1FmSoH9-Tue1txLeemRsTzXVZo1TT-7r6qmUE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
