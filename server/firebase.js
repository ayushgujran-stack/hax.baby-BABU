// Firebase Admin SDK Service Layer for THIS SUCKS.™
// Specifically dedicated to powering the persistent Visitor Odometer in Cloud Firestore

import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

let firestoreInstance = null;
let isConfigured = false;

try {
  let credential = null;

  // 1. Check for inline JSON string or file path in FIREBASE_SERVICE_ACCOUNT_KEY
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if (rawKey.startsWith('{')) {
      credential = admin.credential.cert(JSON.parse(rawKey));
    } else if (fs.existsSync(rawKey)) {
      credential = admin.credential.cert(JSON.parse(fs.readFileSync(rawKey, 'utf8')));
    }
  }

  // 2. Check for individual environment variables
  if (!credential && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // Replace escaped newlines if passed via single-line env var
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    });
  }

  // 3. Check for GOOGLE_APPLICATION_CREDENTIALS standard path
  if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    credential = admin.credential.applicationDefault();
  }

  // 4. Initialize if credential resolved
  if (credential) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || undefined
      });
    }
    firestoreInstance = admin.firestore();
    isConfigured = true;
    console.log('🔥 [Firebase] Successfully connected to Cloud Firestore for Visitor Odometer.');
  } else {
    console.log('ℹ️ [Firebase] No service account credentials detected in environment.');
    console.log('ℹ️ [Firebase] Visitor Odometer will operate in resilient local mode until credentials are provided.');
  }
} catch (err) {
  console.warn('⚠️ [Firebase] Initialization notice:', err.message);
  isConfigured = false;
}

export const dbFirestore = firestoreInstance;
export const isFirebaseConfigured = isConfigured;
export const FieldValue = admin.firestore?.FieldValue;

// Target Firestore document path as specified: siteStats/visitorCounter
export const VISITOR_COUNTER_COLLECTION = 'siteStats';
export const VISITOR_COUNTER_DOC = 'visitorCounter';

// Guestbook collection path
export const GUESTBOOK_COLLECTION = 'guestbook';
