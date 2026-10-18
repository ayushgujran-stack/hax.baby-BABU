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
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
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

// ============================================================================
// FIRESTORE GUESTBOOK REALTIME SYNC
// ============================================================================

/**
 * Listen to live real-time updates for guestbook collection
 * @param {function(Array)} onUpdate
 * @param {number} [maxCount=20]
 * @returns {function()} unsubscribe function
 */
export function subscribeToGuestbook(onUpdate, maxCount = 20) {
  try {
    const q = query(
      collection(db, 'guestbook'),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        let dateStr = new Date().toISOString();
        if (d.createdAt) {
          if (typeof d.createdAt.toDate === 'function') {
            dateStr = d.createdAt.toDate().toISOString();
          } else if (typeof d.createdAt === 'string') {
            dateStr = d.createdAt;
          }
        }

        return {
          id: docSnap.id,
          message: d.message || '',
          sentiment: d.sentiment || 'neutral',
          babuResponse: d.babuResponse || 'Babu clapped enthusiastically.',
          status: d.status || 'RESOLVED BY BABU',
          createdAt: dateStr
        };
      });

      onUpdate(messages);
    }, (err) => {
      console.warn('Firestore guestbook live listener notice:', err.message);
    });
  } catch (err) {
    console.warn('Failed to attach Firestore guestbook snapshot listener:', err.message);
    return () => {};
  }
}

/**
 * Fetch recent guestbook messages directly from Firestore
 * @param {number} [maxCount=20]
 * @returns {Promise<Array>}
 */
export async function fetchFirestoreGuestbookMessages(maxCount = 20) {
  try {
    const q = query(
      collection(db, 'guestbook'),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => {
      const d = docSnap.data();
      let dateStr = new Date().toISOString();
      if (d.createdAt) {
        if (typeof d.createdAt.toDate === 'function') {
          dateStr = d.createdAt.toDate().toISOString();
        } else if (typeof d.createdAt === 'string') {
          dateStr = d.createdAt;
        }
      }

      return {
        id: docSnap.id,
        message: d.message || '',
        sentiment: d.sentiment || 'neutral',
        babuResponse: d.babuResponse || 'Babu clapped enthusiastically.',
        status: d.status || 'RESOLVED BY BABU',
        createdAt: dateStr
      };
    });
  } catch (err) {
    console.warn('Direct Firestore guestbook fetch error:', err.message);
    return [];
  }
}

// ============================================================================
// FIRESTORE ORDER SUBMISSION (Direct & Resilient Vercel Persistence)
// ============================================================================

export const APPROVED_PRODUCTS = [
  'Pacifier my aunt gifted',
  'Found at Suzie’s house',
  'It just spawned on my bedroom'
];

/**
 * Place a persistent order directly into Cloud Firestore orders collection
 * Ensures 100% functionality on deployed Vercel static environments without an Express server
 * @param {string} productName
 * @returns {Promise<Object>}
 */
export async function placeFirestoreOrder(productName) {
  if (typeof productName !== 'string' || !productName.trim()) {
    throw new Error('Product name is required. Babu cannot fulfill orders of thin air.');
  }

  const trimmed = productName.trim().toLowerCase();
  const matched = APPROVED_PRODUCTS.find(p => p.toLowerCase() === trimmed);

  if (!matched) {
    throw new Error(`Invalid product "${productName}". Approved products are: ${APPROVED_PRODUCTS.join(', ')}.`);
  }

  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  const createdAtIso = new Date().toISOString();

  const docRef = doc(db, 'orders', orderId);
  await setDoc(docRef, {
    orderId,
    product: matched,
    status: 'AWAITING_CEO_APPROVAL',
    createdAt: serverTimestamp(),
    createdAtIso,
    confirmation: {
      headline: 'ORDER PLACED!',
      message: 'Delivery after sucked and approved by CEO.'
    }
  });

  return {
    success: true,
    orderId,
    product: matched,
    status: 'AWAITING_CEO_APPROVAL',
    createdAt: createdAtIso,
    confirmation: {
      headline: 'ORDER PLACED!',
      message: 'Delivery after sucked and approved by CEO.'
    }
  };
}

/**
 * Increment visitor counter directly in Cloud Firestore
 * @returns {Promise<number>}
 */
export async function recordFirestoreVisitorHit() {
  const docRef = doc(db, 'siteStats', 'visitorCounter');
  try {
    await updateDoc(docRef, {
      count: increment(1),
      updatedAt: serverTimestamp()
    });
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().count || 1338;
    }
  } catch (err) {
    // If document doesn't exist yet, initialize it
    await setDoc(docRef, {
      count: 1338,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return 1338;
  }
  return 1338;
}

/**
 * Submit guestbook message directly to Cloud Firestore
 * @param {{ message: string, visitorId: string }} param0
 * @returns {Promise<Object>}
 */
export async function submitFirestoreGuestbookMessage({ message, visitorId }) {
  const trimmed = (message || '').trim();
  if (trimmed.length < 5 || trimmed.length > 500) {
    throw new Error('Valid review between 5 and 500 characters required.');
  }

  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const messageId = `GB-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  const createdAtIso = new Date().toISOString();

  // Rule-based lightweight sentiment
  const lower = trimmed.toLowerCase();
  let sentiment = 'neutral';
  if (lower.includes("doesn't work") || lower.includes("broken") || lower.includes("bug") || lower.includes("glitch") || lower.includes("error")) {
    sentiment = 'issue';
  } else if (lower.includes("not bad") || lower.includes("love") || lower.includes("great") || lower.includes("best") || lower.includes("awesome") || lower.includes("cute") || lower.includes("good")) {
    sentiment = 'positive';
  } else if (lower.includes("terrible") || lower.includes("worst") || lower.includes("awful") || lower.includes("hate") || lower.includes("bad")) {
    sentiment = 'negative';
  }

  const BABU_REACTIONS_POOL = {
    positive: [
      "YOU'RE MY FAVOURITE HUMAN! I AM PROMOTING YOU TO SENIOR SUCKER.",
      "GOO GOO GA GA! YOU GET IT! YOU HAVE EXECUTIVE TASTE.",
      "I WOULD GIVE YOU A PACIFIER, BUT I NEED ALL OF THEM FOR MY NAP.",
      "Babu clapped excitedly, drooled on his desk, and approved your bonus!",
      "HIGH FIVE! (Babu misses your hand completely and slaps his own knee).",
      "You just earned 500 imaginary shares of THIS SUCKS™ Corp!",
      "Babu signed an executive decree granting you unlimited imaginary cookies.",
      "EXCELLENT FEEDBACK. I am scheduling you for a 3-hour boardroom giggle session.",
      "Your review gave me the energy to crawl across the entire living room rug!",
      "Mom printed your review and stuck it on the fridge with a magnet!"
    ],
    negative: [
      "WOW. OKAY. I AM GOING TO CRY ABOUT THIS IN BOARDROOM A.",
      "THIS IS A BUSINESS, NOT A DAYCARE! RESPECT THE HUSTLE.",
      "Babu stared silently for 5 seconds, then started clapping sarcastically.",
      "Your grievance has been filed directly under my nap pillow.",
      "I HAVE SOILED MY EXECUTIVE DIAPER WITH RAGE.",
      "Refund denied. That munny has already been invested into apple puree.",
      "Babu threw his rattle across the nursery in protest of this memo.",
      "My lawyers (Mom & Teddy Bear) will be contacting you shortly.",
      "I will address this immediately after my scheduled 2:00 PM tantrum.",
      "Noted. I chewed on a plastic block until I forgot what you said."
    ],
    issue: [
      "OH NO. MOM! WE HAVE A TECHNICAL GLITCH! CODE RED IN NURSERY!",
      "Babu looked extremely concerned and shook his rattle at the server rack.",
      "WE ARE DISPATCHING TOMMY THE DOG TO SNIFF OUT THE BUG IMMEDIATELY.",
      "Hold on! Mom is looking at the computer right now while I watch.",
      "I pressed 47 random buttons on the keyboard to fix it. Did it work?",
      "Dev team (me with a plastic wrench) is investigating this breakdown.",
      "Unplugging the pacifier and plugging it back in...",
      "Server error 404: Pacifier dropped under the sofa."
    ],
    neutral: [
      "HMM. I WILL THINK ABOUT THIS DURING NAP TIME.",
      "OKAY. FAIR ENOUGH. AS LONG AS REVENUE STAYS UP.",
      "I HEARD YOU. NOW WHERE IS MY WARM MILK?",
      "Babu stared intently, blinked twice, and reached for a pacifier.",
      "Duly noted in the Official Cardboard Ledger.",
      "Babu yawned, signed the receipt with a purple crayon, and took a nap.",
      "Interesting proposal. Submit it in writing with attached animal crackers.",
      "The CEO nodded thoughtfully while balancing a block on his head.",
      "Under review by the Toddler Board of Directors."
    ]
  };

  const pool = BABU_REACTIONS_POOL[sentiment] || BABU_REACTIONS_POOL.neutral;
  const babuResponse = pool[Math.floor(Math.random() * pool.length)];

  const docRef = doc(db, 'guestbook', messageId);
  await setDoc(docRef, {
    message: trimmed,
    visitorId: visitorId || 'anonymous',
    sentiment,
    babuResponse,
    status: 'RESOLVED BY BABU',
    createdAt: serverTimestamp(),
    createdAtIso
  });

  return {
    success: true,
    messageId,
    message: trimmed,
    sentiment,
    babuResponse,
    status: 'RESOLVED BY BABU',
    createdAt: createdAtIso
  };
}

/**
 * Lookup returning visitor memory directly from Cloud Firestore
 * @param {string} visitorId
 * @returns {Promise<Object>}
 */
export async function getFirestoreVisitorMemory(visitorId) {
  if (!visitorId) return { success: true, recognized: false };

  try {
    const q = query(
      collection(db, 'guestbook'),
      where('visitorId', '==', visitorId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      const excerpt = (data.message || '').substring(0, 60);
      return {
        success: true,
        recognized: true,
        sentiment: data.sentiment || 'neutral',
        previousMessage: excerpt,
        greeting: {
          headline: data.sentiment === 'positive' ? '"YOU\'RE BACK! I REMEMBER YOU!"' : '"YOU AGAIN?! DID YOU BRING A PACIFIER?"',
          subtext: `Babu remembers: "${excerpt}"`,
          tag: "RETURNING INVESTOR DETECTED ★"
        }
      };
    }
  } catch (err) {
    console.warn('Direct Firestore visitor memory lookup notice:', err.message);
  }

  return { success: true, recognized: false };
}
