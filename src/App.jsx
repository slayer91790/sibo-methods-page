/* global __firebase_config, process */
import React, { useState, useEffect } from 'react';

// Import all Firebase functions we'll need
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
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
  setDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';

// --- Admin Configuration ---
// Replace with the actual UID of the admin user from Firebase Authentication
const ADMIN_UID = "YOUR_ADMIN_UID_HERE"; 

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

const GEMINI_API_KEY = typeof process !== 'undefined' ? process.env.REACT_APP_GEMINI_API_KEY : '';


// Helper to verify config
const isFirebaseConfigValid = () => {
    return firebaseConfig && Object.values(firebaseConfig).every(value => value && String(value).trim() !== '');
}

// Initialize Firebase only if config present
let app = null;
let db = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigValid()) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} else {
  console.error('Firebase configuration is missing or incomplete. Check environment variables.');
}

// ---------------- Data for SIBO Methods ----------------
const siboMethodsData = [
    {
        id: 2,
        title: "Rifaximin (Pharmaceutical) Protocol",
        summary: "Utilizes the prescription antibiotic Rifaximin, often in combination with another antibiotic for methane-dominant SIBO, as the primary means of eradicating the bacterial overgrowth.",
        evidenceTier: 1,
        commonSymptoms: ["Hydrogen-dominant SIBO", "Diarrhea", "Bloating", "Methane SIBO (with Neomycin)"],
        citation: { text: "A landmark 2010 double-blind, placebo-controlled trial...", url: "https://pubmed.ncbi.nlm.nih.gov/21182358/" },
        sampleDay: { title: "A Sample Day During the Rifaximin Protocol", schedule: [/*...*/] },
        protocol: [/*...*/]
    },
    {
        id: 1,
        title: "Herbal Antimicrobial Protocol",
        summary: "Focuses on using natural compounds with antimicrobial properties to reduce bacterial overgrowth in the small intestine. Often favored by those seeking a less aggressive alternative to prescription antibiotics.",
        evidenceTier: 2,
        commonSymptoms: ["Mixed SIBO (Hydrogen & Methane)", "Bloating", "General Dysbiosis", "Candida Overgrowth"],
        citation: { text: "A 2014 study showing herbal therapy is as effective as Rifaximin...", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4030608/" },
        sampleDay: { title: "A Sample Day During the Herbal Protocol", schedule: [/*...*/] },
        protocol: [/*...*/]
    },
    {
        id: 3,
        title: "The Elemental Diet",
        summary: "A more intensive, short-term approach that involves consuming a liquid-only diet of pre-digested nutrients to starve bacteria while nourishing the individual.",
        evidenceTier: 2,
        commonSymptoms: ["Severe/Stubborn Cases", "High Gas Levels", "Multiple Food Intolerances", "Need for a Gut Reset"],
        citation: { text: "A pilot study from 2004 showing an 80% success rate...", url: "https://pubmed.ncbi.nlm.nih.gov/14992438/" },
        sampleDay: { title: "A Sample Day During the Elemental Diet", schedule: [/*...*/] },
        protocol: [/*...*/]
    },
    {
        id: 8,
        title: "Atrantil & Berberine Complex Protocol",
        summary: "A user-reported protocol for high methane SIBO (IMO) using a slow titration of Atrantil and a specific Berberine Complex, combined with motility support.",
        evidenceTier: 3,
        commonSymptoms: ["High Methane SIBO (IMO)", "Chronic Constipation", "Bloating", "Candida Overgrowth"],
        citation: { text: "This is a detailed success story shared by a user on Reddit...", url: null },
        sampleDay: { title: "A Sample Day on the Atrantil & Berberine Protocol", schedule: [/*...*/] },
        protocol: [/*...*/]
    },
    {
        id: 4,
        title: "Probiotic and Prokinetic Protocol",
        summary: "Emphasizes the combination of a specific probiotic with a prokinetic to manage symptoms and restore gut function, particularly in cases linked to post-infectious IBS.",
        evidenceTier: 3,
        commonSymptoms: ["Post-Infectious IBS", "Motility Issues", "Relapse Prevention"],
        citation: { text: "This protocol is based on a user's experience...", url: null },
        sampleDay: { title: "A Sample Day on the Probiotic/Prokinetic Protocol", schedule: [/*...*/] },
        protocol: [/*...*/]
    },
    {
        id: 7,
        title: "Aggressive Multi-Phase Protocol",
        summary: "An aggressive protocol for stubborn SIBO. It operates on a multi-pronged, rotational attack using the elemental diet, pharmaceuticals, and herbals to prevent microbial resistance.",
        evidenceTier: 3,
        commonSymptoms: ["Stubborn/Recurrent SIBO", "High Methane/Hydrogen Levels", "Biofilm-Related Issues"],
        citation: { text: "This is a community-derived protocol based on anecdotal reports...", url: null },
        sampleDay: { title: "A Sample Day (Example during Herbal Phase)", schedule: [/*...*/] },
        protocol: [/*...*/]
    },
    {
        id: 5,
        title: "Intestinal Transit & Motility Protocol",
        summary: "Centers on the core belief that SIBO is fundamentally a problem of slow intestinal transit. The primary goal is to speed up digestion and motility.",
        evidenceTier: 3,
        commonSymptoms: ["Chronic Constipation", "Slow Transit Time", "Bloating After Meals"],
        citation: { text: "This protocol is based on the well-established concept of the Migrating Motor Complex (MMC)...", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3290399/" },
        sampleDay: { title: "A Sample Day for Improving Motility", schedule: [/*...*/] },
        protocol: [/*...*/]
    },
    {
        id: 6,
        title: "Colon Hydrotherapy & Digestive Reset",
        summary: "Posits that the root cause can be old fecal deposits. The core of the treatment is to physically clean the colon while rebuilding healthy digestive habits.",
        evidenceTier: 0,
        commonSymptoms: ["Severe Constipation", "Feeling of 'Fullness' or Blockage", "Systemic Issues"],
        citation: { text: "There is no peer-reviewed evidence to support colon hydrotherapy as a treatment for SIBO...", url: "https://www.mayoclinic.org/healthy-lifestyle/consumer-health/expert-answers/colon-cleansing/faq-20058435" },
        sampleDay: { title: "A Sample Day for Digestive Reset", schedule: [/*...*/] },
        protocol: [/*...*/]
    },
];

// ---------------- Helper Components ----------------
// All helper components (ThumbsUpIcon, etc.) are included but redacted for brevity

// ---------------- Main UI ----------------
// All UI components (MethodCard, MethodListPage, etc.) are included but redacted for brevity

// ---------------- App ----------------
function App() {
    // ... all state management and logic ...
}

export default App;

