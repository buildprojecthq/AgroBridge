import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';

// Create the Context
const AuthContext = createContext({});

// Custom hook for easy access across screens
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // Will hold 'FARMER', 'BUYER', or 'ADMIN'
  const [userProfile, setUserProfile] = useState(null); // Database fields (full_name, etc.)
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

    const fetchUserProfile = async (authUser) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role, full_name, phone_number, address')
          .eq('id', authUser.id)
          .maybeSingle();

        let updatedRole = null;
        let updatedProfile = null;

        if (error) {
          console.error("Error fetching user profile from Supabase:", error);
        } else if (data) {
          updatedRole = data.role;
          updatedProfile = data;
        } else {
          // If the authenticated user has no profile record in 'public.users',
          // automatically create one using user_metadata to prevent RLS blocks and race conditions
          const meta = authUser.user_metadata || {};
          const defaultRole = meta.role || 'FARMER';
          const newProfile = { 
            id: authUser.id, 
            role: defaultRole,
            full_name: meta.full_name || '',
            phone_number: meta.phone_number || ''
          };
          console.log(`No database profile found for user ${authUser.id}. Auto-creating from metadata.`);
          const { error: upsertError } = await supabase
            .from('users')
            .upsert(newProfile);
          if (upsertError) throw upsertError;
          updatedRole = defaultRole;
          updatedProfile = newProfile;
        }

        if (updatedRole) {
          setUserRole(updatedRole);
          setUserProfile(updatedProfile);
          // Cache the profile for offline mode / optimistic loading
          await AsyncStorage.setItem('@user_role', updatedRole);
          if (updatedProfile) {
            await AsyncStorage.setItem('@user_profile', JSON.stringify(updatedProfile));
          }
        }
      } catch (error) {
        console.error("Error in profile fetch:", error);
      }
    };

    // Listen for Supabase Auth state changes (Login / Logout / Init)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      
      if (session?.user) {
        setUser(session.user);
        
        // 1. Optimistic UI: Load from cache first
        try {
          const cachedRole = await AsyncStorage.getItem('@user_role');
          const cachedProfileStr = await AsyncStorage.getItem('@user_profile');
          if (cachedRole) {
            setUserRole(cachedRole);
          }
          if (cachedProfileStr) {
            setUserProfile(JSON.parse(cachedProfileStr));
          }
        } catch (cacheError) {
          console.error("Error loading cached profile:", cacheError);
        }

        // Unblock UI immediately so user can enter the app using cached data
        setLoading(false);

        // 2. Network Detection: Only fetch if we have internet
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
          // Wrap fetch in a timeout promise to prevent hangups if network is degraded
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
          );
          
          Promise.race([
            fetchUserProfile(session.user),
            timeoutPromise
          ]).catch(err => {
            console.log("Background sync skipped or timed out:", err.message);
          });
        } else {
          console.log("Offline mode: Skipped background profile sync");
        }

      } else {
        // Clear global states on logout
        setUser(null);
        setUserRole(null);
        setUserProfile(null);
        await AsyncStorage.removeItem('@user_role');
        await AsyncStorage.removeItem('@user_profile');
        setLoading(false);
      }
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
    <AuthContext.Provider value={{ user, userRole, userProfile, loading, language, languageChecked, setLanguage: changeAppLanguage, setUserRole, setUserProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
