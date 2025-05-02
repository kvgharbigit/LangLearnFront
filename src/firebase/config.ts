// src/firebase/config.ts
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: Platform.OS === 'ios'
    ? "AIzaSyB2pP1Qp7-H2-DIj_5F7vh16XWO0Fc6JKg"  // iOS API key
    : "AIzaSyCFgF0241aFjzmgGRl70AicSJQ0HlCzSeY", // Android API key
  authDomain: "languageapp-472c1.firebaseapp.com",
  projectId: "languageapp-472c1",
  storageBucket: "languageapp-472c1.firebasestorage.app",
  messagingSenderId: "205296109732",
  appId: Platform.OS === 'ios'
    ? "1:205296109732:ios:6cd2b1ded17fe088f53e31"  // iOS app ID
    : "1:205296109732:android:ea506239b5d29bc6f53e31"  // Android app ID
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app;