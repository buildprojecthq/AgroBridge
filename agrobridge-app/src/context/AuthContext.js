import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

// Create the Context
const AuthContext = createContext({});

// Custom hook for easy access across screens
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // Will hold 'FARMER', 'BUYER', or 'ADMIN'
  const [language, setLanguage] = useState(null); // Language selection
  const [languageChecked, setLanguageChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    // Check for saved language first
    const checkLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('@app_language');
        if (savedLang) {
          setLanguage(savedLang);
          i18n.changeLanguage(savedLang);
        }
      } catch (e) {
        console.error("Failed to load language", e);
      } finally {
        setLanguageChecked(true);
      }
    };
    
    checkLanguage();

    const fetchUserProfile = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role from Supabase:", error);
          setUserRole(null);
        } else if (data) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error("Error in profile fetch:", error);
        setUserRole(null);
      }
    };

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for Supabase Auth state changes (Login / Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        // Clear global states on logout
        setUser(null);
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Secure logout function accessible from anywhere in the app
  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setLoading(false);
  };

  const changeAppLanguage = async (langId) => {
    setLanguage(langId);
    i18n.changeLanguage(langId);
    try {
      await AsyncStorage.setItem('@app_language', langId);
    } catch (e) {
      console.error("Failed to save language", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, language, languageChecked, setLanguage: changeAppLanguage, setUserRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
