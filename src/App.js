/* global __firebase_config */
import React, { useState, useEffect } from 'react';

/**
 * SIBO Recovery Hub — single-file React SPA
 * This version uses a hybrid configuration loader to work in both
 * the development canvas and on a live Netlify site.
 */

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
} from 'firebase/firestore';

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

// Helper to verify config
const isFirebaseConfigValid = () => {
    // Debug logging to see what we're getting
    console.log('Firebase config check:', {
        apiKey: firebaseConfig?.apiKey ? 'present' : 'missing',
        authDomain: firebaseConfig?.authDomain ? 'present' : 'missing',
        projectId: firebaseConfig?.projectId ? 'present' : 'missing',
        config: firebaseConfig
    });
    
    return firebaseConfig && Object.values(firebaseConfig).every(value => value && String(value).trim() !== '');
}

// Initialize Firebase only if config present
let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigValid()) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('Firebase initialized successfully', app);
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
        citation: {
            text: "A landmark 2010 double-blind, placebo-controlled trial demonstrating the efficacy of Rifaximin for non-constipation IBS, which has significant overlap with SIBO.",
            url: "https://pubmed.ncbi.nlm.nih.gov/21182358/"
        },
        sampleDay: {
            title: "A Sample Day During the Rifaximin Protocol",
            schedule: [
                { time: "Morning (8 AM)", action: "Take first dose of Rifaximin (550mg) with a low-FODMAP breakfast. Example: Scrambled eggs with spinach. Take 5g of PHGG mixed with water." },
                { time: "Afternoon (2 PM)", action: "Take second dose of Rifaximin (550mg) with a low-FODMAP lunch. Example: Grilled chicken salad with olive oil dressing (no high-FODMAP vegetables)." },
                { time: "Evening (8 PM)", action: "Take third dose of Rifaximin (550mg) with a low-FODMAP dinner. Example: Baked salmon with steamed carrots and quinoa." },
                { time: "Bedtime (10 PM)", action: "Begin 12-hour overnight fast to allow the Migrating Motor Complex (MMC) to work." }
            ]
        },
        protocol: [
            {
                phase: "Phase 1: Antibiotic Treatment (14-day course)",
                steps: [
                    { title: "For Hydrogen-Dominant SIBO", description: "Rifaximin (Xifaxan) 550mg, three times per day." },
                    { title: "For Methane-Dominant SIBO (IMO)", description: "A combination of Rifaximin (550mg, three times per day) and Neomycin (500mg, twice per day) or Metronidazole." },
                    { title: "Partially Hydrolyzed Guar Gum (PHGG)", description: "Some studies and patient accounts suggest taking 5g of PHGG with each dose of Rifaximin can enhance its effectiveness." }
                ]
            }
        ]
    }
];
// This closes the siboMethodsData array
			// ---------------- Helper Components ----------------
const ThumbsUpIcon = ({ isSelected }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 18.734V6a2 2 0 012-2h4a2 2 0 012 2v4z" />
    </svg>
);

const ThumbsDownIcon = ({ isSelected }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 5.266V18a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" />
    </svg>
);

const EvidenceTierBadge = ({ tier }) => {
    const tiers = {
        1: { text: 'Tier 1: Strong Evidence', color: 'bg-green-100 text-green-800' },
        2: { text: 'Tier 2: Promising Evidence', color: 'bg-yellow-100 text-yellow-800' },
        3: { text: 'Tier 3: Anecdotal / Case Report', color: 'bg-blue-100 text-blue-800' },
        0: { text: 'Caution: No Evidence / Potential Harm', color: 'bg-red-100 text-red-800' },
    };
    const tierInfo = tiers[tier] || { text: 'N/A', color: 'bg-gray-100 text-gray-800' };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierInfo.color}`}>
            {tierInfo.text}
        </span>
    );
};

const EvidenceTierExplanation = () => {
    const tiersData = [
        { tier: 1, title: 'Tier 1: Strong Evidence', description: 'Backed by high-quality scientific research, such as double-blind, randomized controlled trials (RCTs). These are considered the "gold standard" in medical research.' },
        { tier: 2, title: 'Tier 2: Promising Evidence', description: "Supported by pilot studies, smaller trials, or studies that weren't as rigorously controlled. The results are promising but require more research." },
        { tier: 3, title: 'Tier 3: Anecdotal / Case Report', description: 'Primarily based on user experiences or case reports. While potentially effective for some, they lack formal scientific evidence.' },
        { tier: 0, title: 'Caution: No Evidence / Potential Harm', description: 'Methods that have no scientific evidence for SIBO and may be considered potentially harmful by medical institutions.' },
    ];

    return (
        <div className="max-w-4xl mx-auto mt-16 p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Understanding the Evidence Tiers</h2>
            <ul className="space-y-4">
                {tiersData.map((tierItem) => (
                    <li key={tierItem.tier} className="flex items-start">
                        <div className="mr-4 mt-1 flex-shrink-0">
                            <EvidenceTierBadge tier={tierItem.tier} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700">{tierItem.title}</h4>
                            <p className="text-gray-600 text-sm">{tierItem.description}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const AiPatternAnalysis = () => {
    const patterns = [
        { title: 'Two-Phase Strategy: Eradicate then Prevent', description: "Nearly all successful protocols involve an initial 'kill phase' (using antibiotics, herbals, or an elemental diet) followed by a crucial long-term 'prevention phase' to stop SIBO from returning." },
        { title: 'Motility is King: The Prokinetic Pattern', description: 'Restoring the gut\'s natural cleansing wave (the Migrating Motor Complex or MMC) is the most consistent theme. Prokinetics like ginger & artichoke or prescription options are key for long-term success.' },
        { title: "The 'Top-Down' Approach: Supporting the Full System", description: 'Many methods recognize SIBO as a symptom of a larger digestive issue. Supporting stomach acid (Betaine HCL) and bile flow ensures food is properly broken down before it can feed an overgrowth.' },
        { title: 'Strategic Use of Diet', description: 'Diet (like Low FODMAP) is used as a temporary tool to manage symptoms and support the kill phase, not as a standalone cure. Meal spacing (4-5 hours between meals) is also emphasized to allow the MMC to work.' },
    ];

    return (
        <div className="max-w-4xl mx-auto mt-16 rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-md">
            <h2 className="text-center text-2xl font-bold text-indigo-800">AI Pattern Analysis: Common Themes in SIBO Recovery</h2>
            <ul className="mt-6 space-y-4">
                {patterns.map((pattern) => (
                    <li key={pattern.title} className="flex items-start">
                        <svg className="mr-3 mt-1 h-6 w-6 flex-shrink-0 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div>
                            <h4 className="font-semibold text-indigo-700">{pattern.title}</h4>
                            <p className="text-sm text-indigo-600">{pattern.description}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const AudioSection = () => {
    return (
        <div className="max-w-4xl mx-auto mt-16 p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">SIBO Educational Podcast</h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">SIBO Unpacked: Your Gut Detective Guide</h3>
                <p className="text-gray-600 mb-4">
                    Listen to this AI-generated podcast discussing Small Intestinal Bacterial Overgrowth, its causes, symptoms, and personalized healing approaches.
                </p>
                <audio
                    controls
                    className="w-full"
                    preload="metadata"
                >
                    <source src="https://firebasestorage.googleapis.com/v0/b/sibo-recovery-app.firebasestorage.app/o/SIBO%20Unpacked_%20Your%20Gut%20Detective%20Guide%20to%20Bloating%2C%20Pain%2C%20and%20Personalized%20Healing.mp3?alt=media&token=136277f0-b710-4f2c-91d2-5b889ca1b4e8" type="audio/mpeg" />
                    Your browser does not support the audio element.
                </audio>
                <p className="text-xs text-gray-500 mt-2">
                    Note: This content is AI-generated for educational purposes. Always consult healthcare professionals for medical advice.
                </p>
            </div>
        </div>
    );
};

// ---------------- Header (Auth) ----------------
const Header = ({ user, onGoHome, onSubmitMethod, onFeedback }) => {
    const handleLogin = async () => {
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Google sign-in failed:', error);
            // If Google fails, try anonymous sign-in as backup
            try {
                await signInAnonymously(auth);
            } catch (anonError) {
                console.error('Fallback anonymous sign-in also failed:', anonError);
            }
        }
    };
    
    return (
        <header className="flex items-center justify-between bg-white p-4 shadow-sm">
            <button onClick={onGoHome} className="text-xl font-bold text-gray-800">
                SIBO Recovery Hub
            </button>
            <div className="flex items-center space-x-4">
                <button onClick={onSubmitMethod} className="font-semibold text-green-600 hover:text-green-800">
                    Submit a Method
                </button>
                <button onClick={onFeedback} className="font-semibold text-purple-600 hover:text-purple-800">
                    Feedback
                </button>
                {user ? (
                    <div className="flex items-center space-x-4">
                        <span className="hidden text-sm text-gray-600 sm:inline">
                            Welcome, {user.displayName || `User ${user.uid.substring(0, 6)}...`}
                        </span>
                        <button onClick={() => auth && signOut(auth)} className="font-semibold text-red-600 hover:text-red-800">
                            Log Out
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin} className="font-semibold text-blue-600 hover:text-blue-800">
                        Sign In with Google
                    </button>
                )}
            </div>
        </header>
    );
};

// ---------------- Main UI ----------------
const MethodCard = ({ method, onSelect, onVote, votes, userVote }) => (
    <div
        className="flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-transform hover:-translate-y-1"
        onClick={() => onSelect(method.id)}
    >
        <div className="p-6">
            <div className="mb-3">
                <EvidenceTierBadge tier={method.evidenceTier} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-800">{method.title}</h3>
            <p className="mb-4 text-gray-600">{method.summary}</p>
        </div>
        <div className="flex items-center justify-end space-x-4 bg-gray-50 px-6 py-4">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onVote(method.id, 'like');
                }}
                className={`flex items-center space-x-2 transition-colors ${
                    userVote === 'like' ? 'text-green-600' : 'text-gray-500 hover:text-green-600'
                }`}
            >
                <ThumbsUpIcon isSelected={userVote === 'like'} />
                <span className="font-semibold">{votes.likes}</span>
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onVote(method.id, 'dislike');
                }}
                className={`flex items-center space-x-2 transition-colors ${
                    userVote === 'dislike' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                }`}
            >
                <ThumbsDownIcon isSelected={userVote === 'dislike'} />
                <span className="font-semibold">{votes.dislikes}</span>
            </button>
        </div>
    </div>
);

const MethodListPage = ({ methods, onSelectMethod, onVote, votes, userVotes, onSortChange, onOpenAdvisor }) => (
    <div className="p-4 sm:p-6 md:p-8">
        <header className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Community-Sourced SIBO Protocols
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
                Explore recovery methods backed by community experience and scientific evidence. Vote on what you've tried and see what has
                worked for others.
            </p>
            <button
                onClick={onOpenAdvisor}
                className="mt-6 transform rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl"
            >
                Get Help from AI Protocol Advisor
            </button>
        </header>

        <div className="mb-6 flex justify-end">
            <select
                onChange={(e) => onSortChange(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
                <option value="evidence">Sort by Evidence Tier</option>
                <option value="likes">Sort by Most Likes</option>
            </select>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {methods.map((method) => (
                <MethodCard
                    key={method.id}
                    method={method}
                    onSelect={onSelectMethod}
                    onVote={onVote}
                    votes={votes[method.id] || { likes: 0, dislikes: 0 }}
                    userVote={userVotes[method.id] || null}
                />)
            )}
        </div>

        <AiPatternAnalysis />
        <AudioSection />
        <EvidenceTierExplanation />

        <footer className="mt-12 px-4 text-center text-sm text-gray-500">
            <p>
                Disclaimer: This information is for educational purposes only and is not medical advice. Always consult with a qualified
                healthcare professional before starting any new treatment.
            </p>
        </footer>
    </div>
);

```javascript
// ---------------- Helper Components ----------------
const ThumbsUpIcon = ({ isSelected }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 18.734V6a2 2 0 012-2h4a2 2 0 012 2v4z" />
    </svg>
);

const ThumbsDownIcon = ({ isSelected }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 5.266V18a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" />
    </svg>
);

const EvidenceTierBadge = ({ tier }) => {
    const tiers = {
        1: { text: 'Tier 1: Strong Evidence', color: 'bg-green-100 text-green-800' },
        2: { text: 'Tier 2: Promising Evidence', color: 'bg-yellow-100 text-yellow-800' },
        3: { text: 'Tier 3: Anecdotal / Case Report', color: 'bg-blue-100 text-blue-800' },
        0: { text: 'Caution: No Evidence / Potential Harm', color: 'bg-red-100 text-red-800' },
    };
    const tierInfo = tiers[tier] || { text: 'N/A', color: 'bg-gray-100 text-gray-800' };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierInfo.color}`}>
            {tierInfo.text}
        </span>
    );
};

const EvidenceTierExplanation = () => {
    const tiersData = [
        { tier: 1, title: 'Tier 1: Strong Evidence', description: 'Backed by high-quality scientific research, such as double-blind, randomized controlled trials (RCTs). These are considered the "gold standard" in medical research.' },
        { tier: 2, title: 'Tier 2: Promising Evidence', description: "Supported by pilot studies, smaller trials, or studies that weren't as rigorously controlled. The results are promising but require more research." },
        { tier: 3, title: 'Tier 3: Anecdotal / Case Report', description: 'Primarily based on user experiences or case reports. While potentially effective for some, they lack formal scientific evidence.' },
        { tier: 0, title: 'Caution: No Evidence / Potential Harm', description: 'Methods that have no scientific evidence for SIBO and may be considered potentially harmful by medical institutions.' },
    ];

    return (
        <div className="max-w-4xl mx-auto mt-16 p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Understanding the Evidence Tiers</h2>
            <ul className="space-y-4">
                {tiersData.map((tierItem) => (
                    <li key={tierItem.tier} className="flex items-start">
                        <div className="mr-4 mt-1 flex-shrink-0">
                            <EvidenceTierBadge tier={tierItem.tier} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700">{tierItem.title}</h4>
                            <p className="text-gray-600 text-sm">{tierItem.description}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const AiPatternAnalysis = () => {
    const patterns = [
        { title: 'Two-Phase Strategy: Eradicate then Prevent', description: "Nearly all successful protocols involve an initial 'kill phase' (using antibiotics, herbals, or an elemental diet) followed by a crucial long-term 'prevention phase' to stop SIBO from returning." },
        { title: 'Motility is King: The Prokinetic Pattern', description: 'Restoring the gut\'s natural cleansing wave (the Migrating Motor Complex or MMC) is the most consistent theme. Prokinetics like ginger & artichoke or prescription options are key for long-term success.' },
        { title: "The 'Top-Down' Approach: Supporting the Full System", description: 'Many methods recognize SIBO as a symptom of a larger digestive issue. Supporting stomach acid (Betaine HCL) and bile flow ensures food is properly broken down before it can feed an overgrowth.' },
        { title: 'Strategic Use of Diet', description: 'Diet (like Low FODMAP) is used as a temporary tool to manage symptoms and support the kill phase, not as a standalone cure. Meal spacing (4-5 hours between meals) is also emphasized to allow the MMC to work.' },
    ];

    return (
        <div className="max-w-4xl mx-auto mt-16 rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-md">
            <h2 className="text-center text-2xl font-bold text-indigo-800">AI Pattern Analysis: Common Themes in SIBO Recovery</h2>
            <ul className="mt-6 space-y-4">
                {patterns.map((pattern) => (
                    <li key={pattern.title} className="flex items-start">
                        <svg className="mr-3 mt-1 h-6 w-6 flex-shrink-0 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div>
                            <h4 className="font-semibold text-indigo-700">{pattern.title}</h4>
                            <p className="text-sm text-indigo-600">{pattern.description}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const AudioSection = () => {
    return (
        <div className="max-w-4xl mx-auto mt-16 p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">SIBO Educational Podcast</h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">SIBO Unpacked: Your Gut Detective Guide</h3>
                <p className="text-gray-600 mb-4">
                    Listen to this AI-generated podcast discussing Small Intestinal Bacterial Overgrowth, its causes, symptoms, and personalized healing approaches.
                </p>
                <audio
                    controls
                    className="w-full"
                    preload="metadata"
                >
                    <source src="https://firebasestorage.googleapis.com/v0/b/sibo-recovery-app.firebasestorage.app/o/SIBO%20Unpacked_%20Your%20Gut%20Detective%20Guide%20to%20Bloating%2C%20Pain%2C%20and%20Personalized%20Healing.mp3?alt=media&token=136277f0-b710-4f2c-91d2-5b889ca1b4e8" type="audio/mpeg" />
                    Your browser does not support the audio element.
                </audio>
                <p className="text-xs text-gray-500 mt-2">
                    Note: This content is AI-generated for educational purposes. Always consult healthcare professionals for medical advice.
                </p>
            </div>
        </div>
    );
};

// ---------------- Header (Auth) ----------------
const Header = ({ user, onGoHome, onSubmitMethod, onFeedback }) => {
    const handleLogin = async () => {
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Google sign-in failed:', error);
            // If Google fails, try anonymous sign-in as backup
            try {
                await signInAnonymously(auth);
            } catch (anonError) {
                console.error('Fallback anonymous sign-in also failed:', anonError);
            }
        }
    };
    
    return (
        <header className="flex items-center justify-between bg-white p-4 shadow-sm">
            <button onClick={onGoHome} className="text-xl font-bold text-gray-800">
                SIBO Recovery Hub
            </button>
            <div className="flex items-center space-x-4">
                <button onClick={onSubmitMethod} className="font-semibold text-green-600 hover:text-green-800">
                    Submit a Method
                </button>
                <button onClick={onFeedback} className="font-semibold text-purple-600 hover:text-purple-800">
                    Feedback
                </button>
                {user ? (
                    <div className="flex items-center space-x-4">
                        <span className="hidden text-sm text-gray-600 sm:inline">
                            Welcome, {user.displayName || `User ${user.uid.substring(0, 6)}...`}
                        </span>
                        <button onClick={() => auth && signOut(auth)} className="font-semibold text-red-600 hover:text-red-800">
                            Log Out
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin} className="font-semibold text-blue-600 hover:text-blue-800">
                        Sign In with Google
                    </button>
                )}
            </div>
        </header>
    );
};

// ---------------- Main UI ----------------
const MethodCard = ({ method, onSelect, onVote, votes, userVote }) => (
    <div
        className="flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-transform hover:-translate-y-1"
        onClick={() => onSelect(method.id)}
    >
        <div className="p-6">
            <div className="mb-3">
                <EvidenceTierBadge tier={method.evidenceTier} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-800">{method.title}</h3>
            <p className="mb-4 text-gray-600">{method.summary}</p>
        </div>
        <div className="flex items-center justify-end space-x-4 bg-gray-50 px-6 py-4">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onVote(method.id, 'like');
                }}
                className={`flex items-center space-x-2 transition-colors ${
                    userVote === 'like' ? 'text-green-600' : 'text-gray-500 hover:text-green-600'
                }`}
            >
                <ThumbsUpIcon isSelected={userVote === 'like'} />
                <span className="font-semibold">{votes.likes}</span>
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onVote(method.id, 'dislike');
                }}
                className={`flex items-center space-x-2 transition-colors ${
                    userVote === 'dislike' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                }`}
            >
                <ThumbsDownIcon isSelected={userVote === 'dislike'} />
                <span className="font-semibold">{votes.dislikes}</span>
            </button>
        </div>
    </div>
);

const MethodListPage = ({ methods, onSelectMethod, onVote, votes, userVotes, onSortChange, onOpenAdvisor }) => (
    <div className="p-4 sm:p-6 md:p-8">
        <header className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Community-Sourced SIBO Protocols
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
                Explore recovery methods backed by community experience and scientific evidence. Vote on what you've tried and see what has
                worked for others.
            </p>
            <button
                onClick={onOpenAdvisor}
                className="mt-6 transform rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl"
            >
                Get Help from AI Protocol Advisor
            </button>
        </header>

        <div className="mb-6 flex justify-end">
            <select
                onChange={(e) => onSortChange(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
                <option value="evidence">Sort by Evidence Tier</option>
                <option value="likes">Sort by Most Likes</option>
            </select>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {methods.map((method) => (
                <MethodCard
                    key={method.id}
                    method={method}
                    onSelect={onSelectMethod}
                    onVote={onVote}
                    votes={votes[method.id] || { likes: 0, dislikes: 0 }}
                    userVote={userVotes[method.id] || null}
                />)
            )}
        </div>

        <AiPatternAnalysis />
        <AudioSection />
        <EvidenceTierExplanation />

        <footer className="mt-12 px-4 text-center text-sm text-gray-500">
            <p>
                Disclaimer: This information is for educational purposes only and is not medical advice. Always consult with a qualified
                healthcare professional before starting any new treatment.
            </p>
        </footer>
    </div>
);

// ---------------- Feedback ----------------
const FeedbackPage = ({ onBack, user }) => {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedback.trim() || !user || !db) return;
        setIsSubmitting(true);
        try {
            // Fixed: Use standard Firebase path
            await addDoc(collection(db, 'feedback'), {
                feedbackText: feedback,
                submittedBy: user.uid,
                submittedAt: serverTimestamp(),
            });
            alert('Thank you for your feedback!');
            onBack();
        } catch (error) {
            console.error('Error submitting feedback: ', error);
            alert('Sorry, there was an error submitting your feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Google sign-in failed:', error);
        }
    };

    if (!user) {
        return (
            <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit Feedback</h1>
                <p className="mb-8 text-lg text-gray-600">
                    Please{' '}
                    <button onClick={handleGoogleSignIn} className="font-semibold text-blue-600 hover:underline">
                        sign in with Google
                    </button>{' '}
                    to submit feedback.
                </p>
                <button onClick={onBack} className="font-semibold text-blue-600 hover:text-blue-800">
                    Back to All Methods
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
            <button onClick={onBack} className="mb-8 flex items-center font-semibold text-blue-600 hover:text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to All Methods
            </button>
            <h1 className="mb-6 text-3xl font-extrabold text-gray-900 sm:text-4xl">Share Your Feedback</h1>
            <p className="mb-8 text-gray-600">
                Have an idea to improve the site? Found a bug? Let us know! Your feedback is invaluable in making this a better resource for the
                community.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
                <div>
                    <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                        Your Feedback
                    </label>
                    <textarea name="feedback" id="feedback" rows="8" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Tell us what you think..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                </div>
                <div>
                    <button type="submit" disabled={isSubmitting} className="w-full justify-center rounded-md bg-purple-600 py-2 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-400">
                        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ---------------- Gemini Advisor ----------------
const GeminiAdvisor = ({ methods, onClose }) => {
    const allSymptoms = [...new Set(methods.flatMap((m) => m.commonSymptoms || []))];
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [advice, setAdvice] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const toggleSymptom = (sym) => setSelectedSymptoms((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));

    const getAdvice = async () => {
        if (selectedSymptoms.length === 0) {
            setAdvice('Please select at least one symptom to get advice.');
            return;
        }
        setIsLoading(true);
        setAdvice('');

        const simplified = methods.map((m) => ({ title: m.title, summary: m.summary, evidenceTier: m.evidenceTier, commonSymptoms: m.commonSymptoms }));

        const systemPrompt = `You are an AI assistant for a SIBO recovery website. Your role is to provide a helpful, non-medical summary based on user-reported symptoms and a list of community-sourced treatment protocols.\n\nIMPORTANT RULES:\n1. DO NOT PROVIDE MEDICAL ADVICE. Start every single response with this exact disclaimer: "This is not medical advice. Always consult with a qualified healthcare professional before starting any new treatment."\n2. Analyze the user's selected symptoms and the provided list of protocols.\n3. Identify which protocols are most relevant to the user's symptoms based on the 'commonSymptoms' listed for each protocol.\n4. Summarize in 2-3 short paragraphs.\n5. Mention the 'evidenceTier'.\n6. Helpful, empathetic, strictly informational.\n7. Do not invent information or suggest protocols not on the list.`;

        const userQuery = `My primary symptoms are: ${selectedSymptoms.join(', ')}. Based on the following data, which protocols might be relevant for me to research further and discuss with my doctor?\n\nProtocols Data:\n${JSON.stringify(simplified, null, 2)}`;

        if (!GEMINI_API_KEY) {
            setAdvice('Gemini API key is not configured. Set REACT_APP_GEMINI_API_KEY in your environment variables.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: userQuery }] }],
                }),
            });
            if (!response.ok) throw new Error(`API call failed: ${response.status}`);
            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n');
            setAdvice(text || "Sorry, I couldn't generate advice at this time.");
        } catch (err) {
            console.error('Gemini API call failed:', err);
            setAdvice('Sorry, there was an error getting advice from the AI. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl">AI Protocol Advisor</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-6">
                    <p className="mb-4 font-medium text-gray-600">Select your primary symptoms to get a personalized summary.</p>
                    <div className="flex flex-wrap gap-2">
                        {allSymptoms.map((sym) => (
                            <button
                                key={sym}
                                onClick={() => toggleSymptom(sym)}
                                className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                                    selectedSymptoms.includes(sym)
                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {sym}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={getAdvice}
                    disabled={isLoading || selectedSymptoms.length === 0}
                    className="w-full rounded-lg bg-indigo-600 py-3 px-6 font-bold text-white shadow-md transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    {isLoading ? 'Analyzing...' : 'Get AI Advice'}
                </button>

                {advice && (
                    <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
                        <h3 className="mb-4 text-xl font-bold text-gray-800">Your Personalized Summary</h3>
                        <p className="whitespace-pre-wrap text-gray-700">{advice}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------------- App ----------------
export default function App() {
    const [currentPage, setCurrentPage] = useState('list');
    const [selectedMethodId, setSelectedMethodId] = useState(null);
    const [votes, setVotes] = useState({});
    const [userVotes, setUserVotes] = useState({});
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('evidence'); // 'evidence' | 'likes'

    // Auth
    useEffect(() => {
        if (!auth) {
            setAuthReady(true);
            return;
        }
        
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    // Aggregate votes (per method id)
    useEffect(() => {
        if (!db) return;
        // Fixed: Use standard Firebase path
        const votesCollection = collection(db, 'votes');
        const unsub = onSnapshot(votesCollection, (snapshot) => {
            const data = {};
            siboMethodsData.forEach((m) => (data[String(m.id)] = { likes: 0, dislikes: 0 }));
            snapshot.docs.forEach((d) => {
                data[d.id] = d.data();
            });
            setVotes(data);
        });
        return () => unsub();
    }, []);

    // Current user's votes
    useEffect(() => {
        if (user && db) {
            const userId = user.uid;
            // Fixed: Use standard Firebase path
            const userVotesCollection = collection(db, `users/${userId}/userVotes`);
            const unsub = onSnapshot(userVotesCollection, (snapshot) => {
                const mine = {};
                snapshot.docs.forEach((d) => {
                    mine[d.id] = d.data().vote;
                });
                setUserVotes(mine);
            });
            return () => unsub();
        } else {
            setUserVotes({});
        }
    }, [user]);

    const handleSelectMethod = (id) => {
        setSelectedMethodId(id);
        setCurrentPage('detail');
    };
    const handleBack = () => {
        setSelectedMethodId(null);
        setCurrentPage('list');
    };
    const handleGoHome = () => handleBack();
    const handleSubmitMethod = () => setCurrentPage('submit');
    const handleFeedback = () => setCurrentPage('feedback');

    // Voting with transaction
    const handleVote = async (id, voteType) => {
        if (!auth || !db) return;
        let currentUser = auth.currentUser;
        if (!currentUser) {
            try {
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                currentUser = result.user;
            } catch (e) {
                console.error('Sign-in for vote failed', e);
                return;
            }
        }

        const methodId = String(id);
        const userId = currentUser.uid;

        // Fixed: Use standard Firebase paths
        const voteDocRef = doc(db, 'votes', methodId);
        const userVoteDocRef = doc(db, `users/${userId}/userVotes`, methodId);

        try {
            await runTransaction(db, async (tx) => {
                const [voteDocSnap, userVoteSnap] = await Promise.all([
                    tx.get(voteDocRef),
                    tx.get(userVoteDocRef),
                ]);

                let likes = voteDocSnap.exists() ? voteDocSnap.data().likes || 0 : 0;
                let dislikes = voteDocSnap.exists() ? voteDocSnap.data().dislikes || 0 : 0;

                const prev = userVoteSnap.exists() ? userVoteSnap.data().vote : null;

                // Remove previous vote's impact
                if (prev === 'like') likes = Math.max(0, likes - 1);
                if (prev === 'dislike') dislikes = Math.max(0, dislikes - 1);

                // Apply new vote (if not toggling off)
                if (voteType !== prev) {
                    if (voteType === 'like') likes++;
                    if (voteType === 'dislike') dislikes++;
                    tx.set(userVoteDocRef, { vote: voteType });
                } else {
                    tx.delete(userVoteDocRef); // Toggled off
                }
                
                // Update aggregate count
                tx.set(voteDocRef, { likes, dislikes }, { merge: true });
            });
        } catch (e) {
            console.error('Transaction failed: ', e);
        }
    };
    
    // Sort methods based on user selection
    const sortedMethods = [...siboMethodsData].sort((a, b) => {
        if (sortOrder === 'likes') {
            const likesA = votes[a.id]?.likes || 0;
            const likesB = votes[b.id]?.likes || 0;
            return likesB - likesA;
        }
        // Custom sort for evidence tier: high tiers first, but tier 0 (caution) last
        const tierA = a.evidenceTier === 0 ? -1 : a.evidenceTier;
        const tierB = b.evidenceTier === 0 ? -1 : b.evidenceTier;
        return tierB - tierA;
    });

    const selectedMethod = siboMethodsData.find((m) => m.id === selectedMethodId);
    
    // Render loading state or error for bad config
    if (!isFirebaseConfigValid()) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
                <div className="rounded-lg bg-white p-10 text-center shadow-md">
                    <h1 className="mb-4 text-2xl font-bold text-red-600">Configuration Error</h1>
                    <p className="text-gray-700">
                        Firebase configuration is missing. If you're the site owner, ensure environment variables are set in your hosting provider.
                    </p>
                </div>
            </div>
        );
    }
    if (!authReady) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-600">Loading Community Hub...</p>
            </div>
        );
    }
    
    // Page router
    const renderPage = () => {
        switch (currentPage) {
            case 'detail':
                if (!selectedMethod) {
                    handleBack();
                    return null;
                }
                return <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} />;
            case 'submit': return <SubmitMethodPage onBack={handleBack} user={user} />;
            case 'feedback': return <FeedbackPage onBack={handleBack} user={user} />;
            case 'list':
            default:
                return <MethodListPage 
                    methods={sortedMethods} 
                    onSelectMethod={handleSelectMethod}
                    onVote={handleVote}
                    votes={votes}
                    userVotes={userVotes}
                    onSortChange={setSortOrder}
                    onOpenAdvisor={() => setIsAdvisorOpen(true)}
                />;
        }
    };

    return (
        <main className="min-h-screen font-sans bg-gray-50">
            <Header user={user} onGoHome={handleGoHome} onSubmitMethod={handleSubmitMethod} onFeedback={handleFeedback} />
            {isAdvisorOpen && <GeminiAdvisor methods={siboMethodsData} onClose={() => setIsAdvisorOpen(false)} />}
            {renderPage()}
        </main>
    );
}