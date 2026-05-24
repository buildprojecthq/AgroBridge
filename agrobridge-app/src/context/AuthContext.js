// agrobridge-app/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Create the Context
const AuthContext = createContext({});

// Custom hook for easy access across screens
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // Will hold 'FARMER', 'BUYER', or 'ADMIN'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase Auth state changes (Login / Logout / Session persistence)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          // Fetch the user's specific role from the Firestore 'users' collection
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
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

  return (
    <AuthContext.Provider value={{ user, userRole, loading, setUserRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};