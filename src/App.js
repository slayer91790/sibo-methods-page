/* global __firebase_config */
import React, { useState, useEffect } from 'react';
// --- Firebase SDKs ---
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';

/**
 * SIBO Recovery Hub — single-file React SPA
 * This version uses a hybrid configuration loader to work in both
 * the development canvas and on a live Netlify site.
 */

// --- Hybrid Firebase Configuration ---
let firebaseConfig;
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    // Use config from the dev canvas environment if it exists
    firebaseConfig = JSON.parse(__firebase_config);
} else {
    // For production, read directly from process.env at build time
    firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
    };
}

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;