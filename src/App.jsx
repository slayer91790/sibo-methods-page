/* global __firebase_config */
import React, { useState, useEffect } from 'react';
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
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

/* ---------------------------------------
    Firebase Configuration Handling
--------------------------------------- */
let firebaseConfig;
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  try {
    firebaseConfig = typeof __firebase_config === 'string'
      ? JSON.parse(__firebase_config)
      : __firebase_config;
  } catch (e) {
    console.error('Error parsing __firebase_config:', e);
  }
}
if (!firebaseConfig) {
  // Try reading from environment variables (for Netlify/CRA build)
  const envConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
  // Check if all necessary keys were found in env vars
  if (Object.values(envConfig).every(v => v && String(v).trim() !== '')) {
      firebaseConfig = envConfig;
  }
}

const GEMINI_API_KEY =
  typeof process !== 'undefined' ? process.env.REACT_APP_GEMINI_API_KEY : '';

// Function to check if config is valid (used for the banner)
const isFirebaseConfigValid = () =>
  firebaseConfig &&
  Object.values(firebaseConfig).every((v) => v && String(v).trim() !== '');

let app = null;
let db = null;
let auth = null;
let googleProvider = null;

// Initialize Firebase only if config is valid
if (isFirebaseConfigValid()) {
  try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      googleProvider = new GoogleAuthProvider();
  } catch (error) {
      console.error("Firebase Initialization Error:", error);
      // Invalidate config if init fails to ensure banner shows
      firebaseConfig = null;
  }
} else {
  console.warn(
    'Firebase configuration is missing or incomplete. Database features (votes, comments, submissions) will be disabled.'
  );
}


/* ---------------------------------------
    Icons / small components
--------------------------------------- */
const ThumbsUpIcon = ({ isSelected }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill={isSelected ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 18.734V6a2 2 0 012-2h4a2 2 0 012 2v4z"
    />
  </svg>
);

const ThumbsDownIcon = ({ isSelected }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill={isSelected ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 5.266V18a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z"
    />
  </svg>
);

/* ---------------------------------------
    Evidence badges & explanations
--------------------------------------- */
const EvidenceTierBadge = ({ tier }) => {
  const tierData = {
    1: { text: 'Tier 1: Strong Evidence', color: 'bg-green-100 text-green-800' },
    2: { text: 'Tier 2: Promising Evidence', color: 'bg-yellow-100 text-yellow-800' },
    3: { text: 'Tier 3: Anecdotal / Case Report', color: 'bg-blue-100 text-blue-800' },
    0: { text: 'Caution: No Evidence / Potential Harm', color: 'bg-red-100 text-red-800' },
  };
  const info = tierData[tier] || { text: 'N/A', color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
      {info.text}
    </span>
  );
};

const EvidenceTierExplanation = () => {
  const tiers = [
    { tier: 1, title: 'Tier 1: Strong Evidence', description: 'Backed by higher-quality studies such as randomized controlled trials.' },
    { tier: 2, title: 'Tier 2: Promising Evidence', description: 'Supported by pilot or small studies; promising but needs more research.' },
    { tier: 3, title: 'Tier 3: Anecdotal / Case Report', description: 'Based on user experiences or case reports.' },
    { tier: 0, title: 'Caution: No Evidence / Potential Harm', description: 'No supportive evidence and/or potential harm.' },
  ];
  return (
    <div className="max-w-4xl mx-auto mt-16 p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
        Understanding the Evidence Tiers
      </h2>
      <ul className="space-y-4">
        {tiers.map((item) => (
          <li key={item.tier} className="flex items-start">
            <div className="mr-4 mt-1 flex-shrink-0">
              <EvidenceTierBadge tier={item.tier} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">{item.title}</h4>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------------------------------------
    Patterns section
--------------------------------------- */
const AiPatternAnalysis = () => {
  const patterns = [
    {
      title: 'Two-Phase Strategy: Eradicate then Prevent',
      description:
        "Most protocols involve an initial 'kill phase' followed by a long-term 'prevention phase' to help reduce recurrence.",
    },
    {
      title: 'Motility Support Matters',
      description:
        'Supporting the Migrating Motor Complex (MMC) with meal spacing and, where appropriate, prokinetics, is a common pattern.',
    },
    {
      title: 'Top-Down Support',
      description:
        'Some approaches consider upstream digestion support (stomach acid, bile flow) as part of a holistic plan.',
    },
    {
      title: 'Strategic Use of Diet',
      description:
        'Diet strategies (e.g., Low FODMAP/SCD) can help manage symptoms during treatment and reintroduction phases.',
    },
  ];
  return (
    <section className="max-w-4xl mx-auto mt-16 p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
        What we see across success stories
      </h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-700">
        {patterns.map((p) => (
          <li key={p.title}>
            <strong>{p.title}:</strong> {p.description}
          </li>
        ))}
      </ul>
    </section>
  );
};

/* ---------------------------------------
    Audio section
    *** AUDIO URL DOMAIN CORRECTED HERE ***
--------------------------------------- */
const AudioSection = () => {
  // Corrected domain to .appspot.com and kept the rest of the path/token
  const episodes = [
    {
      title: 'SIBO Unpacked: Your Gut Detective Guide',
      src: 'https://firebasestorage.googleapis.com/v0/b/sibo-recovery-app.appspot.com/o/SIBO%20Unpacked_%20Your%20Gut%20Detective%20Guide%20to%20Bloating%2C%20Pain%2C%20and%20Personalized%20Healing.mp3?alt=media&token=136277f0-b710-4f2c-91d2-5b889ca1b4e8'
    }
  ];

  if (!episodes.length) return null;

  return (
    <section className="max-w-4xl mx-auto mt-16 p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Audio: Stories & Tips</h2>
      <ul className="space-y-4">
        {episodes.map((ep) => (
          <li key={ep.src} className="p-4 rounded-lg border bg-gray-50">
            <p className="font-semibold mb-2">{ep.title}</p>
            <audio controls className="w-full" preload="metadata">
              <source src={ep.src} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
             <p className="text-xs text-gray-500 mt-2">
                 Note: This content is AI-generated for educational purposes.
             </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
/* ---------------------------------------
    *** END OF AUDIO URL FIX ***
--------------------------------------- */


/* --- [ Rest of the code remains the same: Methods data, Header, MethodCard, MethodListPage, MethodDetailPage, Nickname helpers, CommentsSection, Submit/Feedback Pages, GeminiAdvisor ] --- */

/* ---------------------------------------
    Methods data (Keep your existing data here)
--------------------------------------- */
const siboMethodsData = [
  // ... (Your existing siboMethodsData array goes here, unchanged) ...
   {
    id: 2,
    title: 'Rifaximin (Pharmaceutical) Protocol',
    summary:
      'Utilizes the prescription antibiotic Rifaximin as the primary means of eradicating the bacterial overgrowth; may be paired for methane cases.',
    evidenceTier: 1,
    commonSymptoms: ['Hydrogen-dominant SIBO', 'Diarrhea', 'Bloating', 'Methane SIBO (with pairing)'],
    citation: {
      text: '2010 double-blind Rifaximin trial in non-constipation IBS; SIBO overlap.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/21182358/',
    },
    sampleDay: { /* ... schedule ... */ }, protocol: [ /* ... phases ... */ ]
  },
  { id: 3, /* ... Herbal ... */ },
  { id: 4, /* ... Elemental ... */ },
  { id: 5, /* ... Prokinetic ... */ },
  { id: 6, /* ... Low-FODMAP ... */ },
  { id: 7, /* ... Stress/Sleep ... */ },
];

/* ---------------------------------------
    Header (Keep your existing Header component here)
--------------------------------------- */
function Header({ user, onGoHome, onSubmitMethod, onFeedback }) {
  // ... (Your existing Header component code goes here, unchanged) ...
  const [busy, setBusy] = useState(false);

  const doGoogleSignIn = async () => { /* ... */ };
  const doSignOut = async () => { /* ... */ };

  return ( <header> {/* ... */} </header> );
}


/* ---------------------------------------
    Cards & List page (Keep your existing components here)
--------------------------------------- */
const MethodCard = ({ method, onSelect, onVote, votes, userVote }) => (
  // ... (Your existing MethodCard component code goes here, unchanged) ...
  <div> {/* ... */} </div>
);

const MethodListPage = ({ methods, onSelectMethod, onVote, votes, userVotes, onSortChange, onOpenAdvisor, }) => (
  // ... (Your existing MethodListPage component code goes here, unchanged) ...
   <div> {/* ... */} </div>
);

/* ---------------------------------------
    Detail page (Keep your existing component here)
--------------------------------------- */
const MethodDetailPage = ({ method, onBack, user, isAdmin }) => (
  // ... (Your existing MethodDetailPage component code goes here, unchanged) ...
   <div> {/* ... */} </div>
);

/* ---------------------------------------
    NICKNAMES helpers (Keep your existing helpers here)
--------------------------------------- */
const ADJECTIVES = [ /* ... */ ];
const ANIMALS    = [ /* ... */ ];
function generateNickname(uid = '') { /* ... */ }
async function getOrCreateNickname(db, uid) { /* ... */ }

/* ---------------------------------------
    Comments (Keep your existing component here)
--------------------------------------- */
function CommentsSection({ methodId, user, isAdmin }) {
   // ... (Your existing CommentsSection component code goes here, unchanged) ...
   // Make sure internal guards like if (!db) return; are present
   return ( <div> {/* ... */} </div> );
}

/* ---------------------------------------
    Submit & Feedback Pages (Keep your existing components here)
--------------------------------------- */
function SubmitMethodPage({ onBack, user }) {
  // ... (Your existing SubmitMethodPage component code goes here, unchanged) ...
  // Make sure internal guards like if (!user || user.isAnonymous || !db) return; are present
  return ( <div> {/* ... */} </div> );
}

function FeedbackPage({ onBack, user }) {
  // ... (Your existing FeedbackPage component code goes here, unchanged) ...
  // Make sure internal guards like if (!user || user.isAnonymous || !db) return; are present
  return ( <div> {/* ... */} </div> );
}

/* ---------------------------------------
    Gemini Advisor (Keep your existing component here)
--------------------------------------- */
function GeminiAdvisor({ methods, onClose }) {
  // ... (Your existing GeminiAdvisor component code goes here, unchanged) ...
  // Ensure internal checks like if (!GEMINI_API_KEY) return; are present
  return ( <div> {/* ... */} </div> );
}


/* ---------------------------------------
    App Root (Main Component)
    *** FIREBASE CONFIG CHECK UPDATED HERE ***
--------------------------------------- */
export default function App() {
  const [currentPage, setCurrentPage] = useState('list');
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!auth); // Initialize based on whether auth was set up
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('evidence');
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Determine if Firebase notice should be shown ---
  const showFirebaseNotice = !isFirebaseConfigValid();

  // --- Effects (Keep your existing useEffect hooks here) ---
  // Initialize Auth Listener
  useEffect(() => {
    if (!auth) { // If Firebase didn't initialize
      setAuthReady(true); // Still mark as ready so UI renders
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []); // Run only once

  // Fetch Aggregate Votes
  useEffect(() => {
    if (!db) return; // Guard: No DB, no fetch
    // ... (rest of your votes useEffect)
    const votesRef = collection(db, 'votes');
    const unsubscribe = onSnapshot(votesRef, (snapshot) => { /* ... setVotes ... */ }, (error) => console.error("Error fetching aggregate votes:", error));
    return () => unsubscribe();
  }, [db]);

  // Fetch User's Votes
  useEffect(() => {
    if (!user || !db) { // Guard: No User or DB, clear/skip fetch
        setUserVotes({});
        return;
    }
    // ... (rest of your userVotes useEffect)
     const userVotesRef = collection(db, `users/${user.uid}/userVotes`);
     const unsubscribe = onSnapshot(userVotesRef, (snapshot) => { /* ... setUserVotes ... */ }, (error) => console.error("Error fetching user votes:", error));
     return () => unsubscribe();
  }, [user, db]);

  // Check Admin Status
  useEffect(() => {
    if (!user || user.isAnonymous || !db) { // Guard: No User, Anonymous, or No DB
        setIsAdmin(false);
        return;
    }
    // ... (rest of your admin check useEffect)
    const checkAdminStatus = async () => { /* ... getDoc, setIsAdmin ... */ };
    checkAdminStatus();
  }, [user, db]);


  // --- Event Handlers (Keep your existing handlers here) ---
  const handleSelectMethod = (id) => { setSelectedMethodId(id); setCurrentPage('detail'); };
  const handleBack = () => { setSelectedMethodId(null); setCurrentPage('list'); };
  const handleGoHome = () => handleBack();
  const handleSubmitMethod = () => {
      if (showFirebaseNotice) { alert("Submissions disabled: Firebase not configured."); return; }
      setCurrentPage('submit');
  };
  const handleFeedback = () => {
       if (showFirebaseNotice) { alert("Feedback disabled: Firebase not configured."); return; }
       setCurrentPage('feedback');
  };
  const handleOpenAdvisor = () => setIsAdvisorOpen(true);
  const handleCloseAdvisor = () => setIsAdvisorOpen(false);
  const handleVote = async (id, voteType) => {
      if (showFirebaseNotice) { alert("Voting disabled: Firebase not configured."); return; }
      // ... (rest of your existing handleVote logic, including sign-in prompt) ...
  };

  // --- Sorting (Keep your existing sorting logic here) ---
  const methods = siboMethodsData;
  const sortedMethods = [...methods].sort((a, b) => { /* ... your sorting logic ... */ });
  const selectedMethod = methods.find((m) => m.id === selectedMethodId);


  // --- Render Logic ---

  // Handle Auth Loading State (still useful)
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg font-medium text-gray-600 animate-pulse">Loading Community Hub...</p>
      </div>
    );
  }

  // --- Page Router Logic (Keep your existing router here) ---
  const renderPage = () => {
    switch (currentPage) {
      case 'detail':
        return selectedMethod ? (
          <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} isAdmin={isAdmin} />
        ) : ( handleBack(), null );
      case 'submit':
         // Render normally, internal component handles auth check / firebase notice
        return <SubmitMethodPage onBack={handleBack} user={user} />;
      case 'feedback':
         // Render normally, internal component handles auth check / firebase notice
        return <FeedbackPage onBack={handleBack} user={user} />;
      case 'list':
      default:
        return (
          <MethodListPage
            methods={sortedMethods}
            onSelectMethod={handleSelectMethod}
            onVote={handleVote} // Pass handleVote which now includes the notice check
            votes={votes}
            userVotes={userVotes}
            onSortChange={setSortOrder}
            onOpenAdvisor={handleOpenAdvisor}
          />
        );
    }
  };

  // --- Final Render ---
  return (
    <div className="min-h-screen font-sans bg-gray-50 text-gray-900">
      <Header
        user={user}
        onGoHome={handleGoHome}
        onSubmitMethod={handleSubmitMethod} // Pass handler which includes notice check
        onFeedback={handleFeedback} // Pass handler which includes notice check
      />

      {/* *** FIREBASE NOTICE BANNER ADDED HERE *** */}
      {showFirebaseNotice && (
        <div className="mx-auto max-w-6xl px-4 py-3 mt-4 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm font-medium shadow-sm">
          Notice: Real-time features like votes, comments, and submissions are currently disabled. Please configure Firebase environment variables for full functionality.
        </div>
      )}
      {/* *** END OF BANNER *** */}


      {isAdvisorOpen && (
        <GeminiAdvisor methods={methods} onClose={handleCloseAdvisor} />
      )}
      <main>
        {renderPage()}
      </main>
    </div>
  );
}