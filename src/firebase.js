// ============================================================================
// THIS SUCKS.™ — Firebase Client SDK Integration
// Project: baby-46ada | Registered Web App: THIS SUCKS.™ Web App
// Provides Firebase Authentication (Email/Password) and Cloud Firestore
// ============================================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';

// Official Web SDK configuration for Firebase project: baby-46ada
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC4r8LtCAo72oy5OF6SspYyNoQvPz-DUhY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "baby-46ada.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "baby-46ada",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "baby-46ada.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "361987971741",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:361987971741:web:a023801930031d92dc9274",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-E07YL8SKNL"
};

// Initialize or reuse Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// ============================================================================
// AUTHENTICATION HELPERS (Email / Password)
// ============================================================================

/**
 * Register a new user with email and password
 * @param {string} email
 * @param {string} password
 * @param {string} [displayName]
 */
export async function signUpWithEmail(email, password, displayName = '') {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName });
    } catch (e) {
      console.warn('Profile name update skipped:', e);
    }
  }
  return userCredential.user;
}

/**
 * Sign in an existing user with email and password
 * @param {string} email
 * @param {string} password
 */
export async function signInWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return userCredential.user;
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  await signOut(auth);
}

/**
 * Listen for user authentication state changes
 * @param {function(User|null)} callback
 * @returns {function()} unsubscribe function
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the currently signed in user synchronously
 * @returns {User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

// ============================================================================
// FIRESTORE VISITOR ODOMETER REALTIME SYNC
// ============================================================================

/**
 * Listen to live real-time updates for siteStats/visitorCounter
 * @param {function(number)} onUpdate
 * @returns {function()} unsubscribe function
 */
export function subscribeToVisitorCounter(onUpdate) {
  const docRef = doc(db, 'siteStats', 'visitorCounter');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof data.count === 'number') {
        onUpdate(data.count);
      }
    }
  }, (err) => {
    console.warn('Firestore live listener notice:', err.message);
  });
}

/**
 * Fetch the current visitor count directly from Firestore
 * @returns {Promise<number>}
 */
export async function fetchFirestoreVisitorCount() {
  const docRef = doc(db, 'siteStats', 'visitorCounter');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return typeof data.count === 'number' ? data.count : 1337;
  }
  return 1337;
}
