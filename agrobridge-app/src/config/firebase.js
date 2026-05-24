// agrobridge-app/src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace these with the actual keys from your Firebase Console Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyAqvhCTeGxlnppfwFd8LBXzdp2ICmZQ8Fs",
  authDomain: "agroapp-backend-e5294.firebaseapp.com",
  projectId: "agroapp-backend-e5294",
  storageBucket: "agroapp-backend-e5294.firebasestorage.app",
  messagingSenderId: "108853026140",
  appId: "1:108853026140:web:c0f514767e7e836c8b3599",
  measurementId: "G-JYBBNW9N8L"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence so users don't have to re-login every time they open the app
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore Database
const db = getFirestore(app);

export { auth, db };