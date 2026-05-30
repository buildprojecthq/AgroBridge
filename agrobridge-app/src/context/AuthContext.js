// agrobridge-app/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { onAuthStateChanged, signOut } from '@react-native-firebase/auth';
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
    // Listen for Firebase Auth state changes (Login / Logout / Session persistence)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          // Fetch the user's specific role from the Firestore 'users' collection
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists && userDocSnap.data()) {
            setUserRole(userDocSnap.data().role);
          } else {
            console.log("No user profile found in Firestore yet.");
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error fetching user role from Firestore:", error);
          setUserRole(null);
        }
      } else {
        // Clear global states on logout
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe; // Clean up listener on unmount
  }, []);

  // Secure logout function accessible from anywhere in the app
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setLoading(false);
  };

  // Development bypass to easily login without OTP
  const bypassLogin = (role = 'FARMER') => {
    setUser({ uid: 'dev-bypass-123', email: 'dev@agrobridge.com', displayName: 'Developer', phoneNumber: '+919999999999' });
    setUserRole(role);
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
    <AuthContext.Provider value={{ user, userRole, loading, language, languageChecked, setLanguage: changeAppLanguage, setUserRole, logout, bypassLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
