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
  firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
}
const GEMINI_API_KEY =
  typeof process !== 'undefined' ? process.env.REACT_APP_GEMINI_API_KEY : '';

const isFirebaseConfigValid = () =>
  firebaseConfig &&
  Object.values(firebaseConfig).every((v) => v && String(v).trim() !== '');

let app = null;
let db = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigValid()) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
   console.log("Firebase initialized successfully."); // Add this log
} else {
  console.error(
    'Firebase configuration is missing or incomplete. Check environment variables.'
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${info.color}`}>
      {info.text}
    </span>
  );
};

const EvidenceTierExplanation = () => {
  const tiers = [
    { tier: 1, title: 'Tier 1: Strong Evidence', description: 'Backed by high-quality scientific research, such as double-blind, randomized controlled trials (RCTs).' },
    { tier: 2, title: 'Tier 2: Promising Evidence', description: "Supported by pilot studies, smaller trials, or studies that weren't as rigorously controlled. Promising but requires more research." },
    { tier: 3, title: 'Tier 3: Anecdotal / Case Report', description: 'Primarily based on user experiences or case reports. Lacks formal scientific evidence.' },
    { tier: 0, title: 'Caution: No Evidence / Potential Harm', description: 'No scientific evidence for SIBO and may carry potential risks.' },
  ];
  return (
    <div className="mx-auto mt-16 max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-md">
      <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
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
              <p className="text-sm text-gray-600">{item.description}</p>
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
    { title: 'Two-Phase Strategy: Eradicate then Prevent', description: "Most protocols involve an initial 'kill phase' followed by a long-term 'prevention phase' to help reduce recurrence." },
    { title: 'Motility Support Matters', description: 'Supporting the Migrating Motor Complex (MMC) with meal spacing and, where appropriate, prokinetics, is a common pattern.' },
    { title: 'Top-Down Support', description: 'Some approaches consider upstream digestion support (stomach acid, bile flow) as part of a holistic plan.' },
    { title: 'Strategic Use of Diet', description: 'Diet strategies (e.g., Low FODMAP/SCD) can help manage symptoms during treatment and reintroduction phases.' },
  ];
  return (
    <section className="mx-auto mt-16 max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-md">
      <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
        What We See Across Success Stories
      </h2>
      <ul className="space-y-2 pl-6 text-gray-700 list-disc">
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
--------------------------------------- */
const AudioSection = () => {
  // Updated episodes array with your Firebase Storage URL
  const episodes = [
    {
      title: 'SIBO Unpacked: Your Gut Detective Guide',
      src: 'https://firebasestorage.googleapis.com/v0/b/sibo-recovery-app.firebasestorage.app/o/SIBO%20Unpacked_%20Your%20Gut%20Detective%20Guide%20to%20Bloating%2C%20Pain%2C%20and%20Personalized%20Healing.mp3?alt=media&token=136277f0-b710-4f2c-91d2-5b889ca1b4e8'
    }
  ];

  if (!episodes.length) return null; // Don't render if no episodes

  return (
    <section className="mx-auto mt-16 max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Audio: Stories & Tips</h2>
      <ul className="space-y-4">
        {episodes.map((ep) => (
          <li key={ep.src} className="rounded-lg border bg-gray-50 p-4">
            <p className="mb-2 font-semibold">{ep.title}</p>
            <audio controls className="w-full" preload="metadata">
              <source src={ep.src} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
             <p className="mt-2 text-xs text-gray-500 italic">
                 Note: This content is AI-generated for educational purposes.
             </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

/* ---------------------------------------
    Methods data (Make sure this matches the data expected by components)
--------------------------------------- */
const siboMethodsData = [
  // ... (Keep your full siboMethodsData array here - make sure it's complete) ...
   { id: 2, title: 'Rifaximin (Pharmaceutical) Protocol', summary: 'Utilizes the prescription antibiotic Rifaximin...', evidenceTier: 1, commonSymptoms: [...], citation: {...}, sampleDay: {...}, protocol: [...] },
   { id: 3, title: 'Herbal Antimicrobials (Combo)', summary: 'Botanical protocols in cycles...', evidenceTier: 2, commonSymptoms: [...], citation: {...}, sampleDay: {...}, protocol: [...] },
   { id: 4, title: 'Elemental Diet (Short Course, supervised)', summary: 'Nutritionally complete formula...', evidenceTier: 1, commonSymptoms: [...], citation: {...}, sampleDay: {...}, protocol: [...] },
   { id: 5, title: 'Prokinetic & Meal Spacing', summary: 'Focus on motility support...', evidenceTier: 2, commonSymptoms: [...], citation: {...}, sampleDay: {...}, protocol: [...] },
   { id: 6, title: 'Low-FODMAP (Short-term symptom management)', summary: 'Structured elimination/reintroduction...', evidenceTier: 2, commonSymptoms: [...], citation: {...}, sampleDay: {...}, protocol: [...] },
   { id: 7, title: 'Stress, Sleep, and Movement Support', summary: 'Lifestyle pillars that influence GI symptoms...', evidenceTier: 3, commonSymptoms: [...], citation: {...}, sampleDay: {...}, protocol: [...] },
];

/* ---------------------------------------
    Header Component
--------------------------------------- */
function Header({ user, onGoHome, onSubmitMethod, onFeedback }) {
  const [busy, setBusy] = useState(false);

  const doGoogleSignIn = async () => {
    if (!auth || !googleProvider) return;
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Google sign-in failed:', e);
      // Optional: Add user feedback here (e.g., alert("Could not sign in with Google."))
      // Removed automatic fallback to anonymous as it might hide Google sign-in issues.
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    if (!auth) return;
    setBusy(true);
    try {
      await signOut(auth);
    } catch(e){
        console.error("Sign out failed:", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button onClick={onGoHome} className="text-xl font-extrabold tracking-tight text-indigo-700 hover:text-indigo-900">
          SIBO Recovery Hub
        </button>
        <nav className="flex items-center gap-3">
          <button
            onClick={onSubmitMethod}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Submit Method
          </button>
          <button
            onClick={onFeedback}
            className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Feedback
          </button>
          {user ? (
            <button
              disabled={busy}
              onClick={doSignOut}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Sign out {user.isAnonymous ? '(Guest)' : ''}
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={doGoogleSignIn}
              className="rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Sign in w/ Google
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ---------------------------------------
    Method Card Component (Full)
--------------------------------------- */
const MethodCard = ({ method, onSelect, onVote, votes, userVote }) => (
  <div
    className="flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl"
    onClick={() => onSelect(method.id)}
    role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && onSelect(method.id)}
  >
    <div className="p-6">
      <div className="mb-3">
        <EvidenceTierBadge tier={method.evidenceTier} />
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-800">{method.title}</h3>
      <p className="mb-4 text-sm text-gray-600 line-clamp-3">{method.summary}</p> {/* Use line-clamp if you have Tailwind typography plugin */}
    </div>
    <div className="flex items-center justify-end space-x-4 border-t border-gray-100 bg-gray-50 px-6 py-4">
      <button
        onClick={(e) => { e.stopPropagation(); onVote(method.id, 'like'); }}
        className={`flex items-center space-x-1 transition-colors ${userVote === 'like' ? 'font-semibold text-green-600' : 'text-gray-500 hover:text-green-600'}`}
        aria-label={`Like ${method.title}`}
      >
        <ThumbsUpIcon isSelected={userVote === 'like'} />
        <span className="text-sm font-medium">{votes?.likes ?? 0}</span> {/* Handle potentially undefined votes */}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onVote(method.id, 'dislike'); }}
        className={`flex items-center space-x-1 transition-colors ${userVote === 'dislike' ? 'font-semibold text-red-600' : 'text-gray-500 hover:text-red-600'}`}
        aria-label={`Dislike ${method.title}`}
      >
        <ThumbsDownIcon isSelected={userVote === 'dislike'} />
        <span className="text-sm font-medium">{votes?.dislikes ?? 0}</span> {/* Handle potentially undefined votes */}
      </button>
    </div>
  </div>
);


/* ---------------------------------------
    Method List Page Component (Full)
--------------------------------------- */
const MethodListPage = ({ methods, onSelectMethod, onVote, votes, userVotes, onSortChange, onOpenAdvisor }) => (
  <div className="p-4 sm:p-6 md:p-8">
    <header className="mb-10 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
        Community-Sourced SIBO Protocols
      </h1>
      <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
        Explore recovery methods backed by community experience and general evidence summaries. Vote on what you've tried.
      </p>
      <button
        onClick={onOpenAdvisor}
        className="mt-6 inline-flex items-center gap-2 transform rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {/* Simple icon or emoji */}
         ✨ Get Help from AI Protocol Advisor
      </button>
    </header>

    <div className="mb-6 flex justify-end">
       <label htmlFor="sort-order" className="sr-only">Sort methods by</label>
      <select
        id="sort-order"
        onChange={(e) => onSortChange(e.target.value)}
        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
      >
        <option value="evidence">Sort by Evidence Tier</option>
        <option value="likes">Sort by Most Likes</option>
      </select>
    </div>

    {methods && methods.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {methods.map((method) => (
            <MethodCard
            key={method.id}
            method={method}
            onSelect={onSelectMethod}
            onVote={onVote}
            votes={votes[method.id] || { likes: 0, dislikes: 0 }}
            userVote={userVotes[method.id] || null}
            />
        ))}
        </div>
    ) : (
        <p className="text-center text-gray-500">Loading methods or none available.</p>
    )}


    <AiPatternAnalysis />
    <AudioSection />
    <EvidenceTierExplanation />

    <footer className="mt-16 border-t border-gray-200 px-4 pt-8 text-center text-sm text-gray-500">
       <p className="mb-2">
        **Disclaimer:** This site is for informational purposes only and does not constitute medical advice.
        Always consult with a qualified healthcare professional regarding any health concerns or before making any decisions related to your health or treatment.
      </p>
       <p>&copy; {new Date().getFullYear()} SIBO Recovery Hub. All rights reserved.</p>
    </footer>
  </div>
);


/* ---------------------------------------
    Detail Page Component (Full - Ensure all sections are restored)
--------------------------------------- */
const MethodDetailPage = ({ method, onBack, user, isAdmin }) => (
  <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
    <button onClick={onBack} className="mb-8 inline-flex items-center font-semibold text-blue-600 hover:text-blue-800">
      <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
      Back to All Methods
    </button>
     <article> {/* Wrap in article for semantics */}
        <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">{method.title}</h1>

         {/* Evidence Section */}
        <section aria-labelledby="evidence-heading" className="mb-8 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
            <h3 id="evidence-heading" className="mb-2 text-lg font-bold">Evidence & Research</h3>
            <div className="mb-2"><EvidenceTierBadge tier={method.evidenceTier} /></div>
            <p className="text-sm">{method.citation?.text || 'No citation available.'}</p>
            {method.citation?.url && (
            <a href={method.citation.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
                View Study <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            )}
        </section>

        {/* Symptoms Section */}
        {method.commonSymptoms && method.commonSymptoms.length > 0 && (
          <section aria-labelledby="symptoms-heading" className="mb-8">
              <h3 id="symptoms-heading" className="mb-2 text-lg font-bold text-gray-800">Potentially Helpful For Symptoms Like:</h3>
              <div className="flex flex-wrap gap-2">
                  {method.commonSymptoms.map((symptom, i) => <span key={i} className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700">{symptom}</span>)}
              </div>
          </section>
        )}

        {/* Sample Day Section */}
        {method.sampleDay?.schedule?.length > 0 && (
            <section aria-labelledby="sample-day-heading" className="mb-8 rounded-lg bg-gray-100 p-6">
                <h3 id="sample-day-heading" className="mb-4 text-lg font-bold text-gray-800">{method.sampleDay.title || "A Sample Day"}</h3>
                <dl className="space-y-4">
                {method.sampleDay.schedule.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row">
                    <dt className="w-full shrink-0 sm:w-1/4 font-semibold text-gray-700">{item.time}:</dt> {/* Adjusted width */}
                    <dd className="w-full text-gray-600 sm:pl-2">{item.action}</dd>
                    </div>
                ))}
                </dl>
            </section>
        )}

        {/* Summary Paragraph */}
        <p className="mb-8 text-lg text-gray-600">{method.summary}</p>

        {/* Protocol Phases Section */}
        {method.protocol && method.protocol.length > 0 && (
            <section aria-labelledby="protocol-heading" className="space-y-8">
                <h2 id="protocol-heading" className="sr-only">Protocol Details</h2>
                {method.protocol.map((phase, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                    <div className="border-b border-gray-200 bg-gray-100 p-4"><h3 className="text-xl font-bold text-gray-800">{phase.phase}</h3></div>
                    <div className="space-y-6 p-6">
                    {phase.steps && phase.steps.length > 0 ? (
                        phase.steps.map((step, j) => (
                        <div key={j}>
                            <h4 className="mb-2 text-lg font-semibold text-gray-700">{step.title}</h4>
                            {step.description && <p className="mb-3 text-gray-600">{step.description}</p>}
                            {step.items && step.items.length > 0 && (
                            <ul className="list-inside list-disc space-y-1 pl-4 text-gray-600">
                                {step.items.map((item, k) => <li key={k}>{item}</li>)}
                            </ul>
                            )}
                        </div>
                        ))
                    ) : <p className="text-gray-500">No steps defined.</p>}
                    </div>
                </div>
                ))}
            </section>
        )}
    </article>


    <CommentsSection methodId={method.id} user={user} isAdmin={isAdmin} />
  </div>
);

/* ---------------------------------------
    Nickname Helpers (Keep As Is)
--------------------------------------- */
const ADJECTIVES = ['Calm','Brave','Swift','Sunny','Kind','Bright','Lucky','Quiet','Clever','Silver', 'Gentle', 'Wise', 'Bold', 'Merry', 'Sturdy'];
const ANIMALS    = ['Otter','Falcon','Panda','Koala','Fox','Dolphin','Lynx','Finch','Turtle','Bear', 'Badger', 'Eagle', 'Rabbit', 'Wolf', 'Deer'];

function generateNickname(uid = '') {
  const a = ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(Math.random()*ANIMALS.length)];
  const tag = uid.slice(-4) || String(Math.floor(1000 + Math.random() * 9000));
  return `${a} ${b} #${tag}`;
}

async function getOrCreateNickname(db, uid) {
  if (!uid || !db) return `User #${String(Math.random()).slice(2, 6)}`;
  const uref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(uref);
    if (snap.exists() && snap.data()?.nickname) return snap.data().nickname;
    const nickname = generateNickname(uid);
    await setDoc(uref, { nickname }, { merge: true });
    return nickname;
  } catch (error) {
    console.error("Error fetching/creating nickname:", error);
    return `User #${uid.slice(-4) || 'Err'}`;
  }
}

/* ---------------------------------------
    Comments Component (Full)
--------------------------------------- */
function CommentsSection({ methodId, user, isAdmin }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [nicknames, setNicknames] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !methodId) return;
    setIsLoading(true); setError(null);
    const qref = query(collection(db, `methods/${methodId}/comments`), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(qref, async (querySnapshot) => {
      const fetchedComments = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComments(fetchedComments);
      const userIdsToFetch = fetchedComments.map(c => c.userId).filter(userId => userId && !nicknames[userId]);
      if (userIdsToFetch.length > 0) {
        const uniqueUserIds = [...new Set(userIdsToFetch)];
        const nicknamePromises = uniqueUserIds.map(userId => getOrCreateNickname(db, userId).then(name => ({ userId, name })));
        try {
          const fetchedNicknames = await Promise.all(nicknamePromises);
          setNicknames(prev => ({ ...prev, ...fetchedNicknames.reduce((acc, { userId, name }) => ({ ...acc, [userId]: name }), {}) }));
        } catch (nickError) { console.error("Error fetching nicknames:", nickError); }
      }
      setIsLoading(false);
    }, (err) => { console.error("Comments snapshot error:", err); setError('Could not load comments.'); setIsLoading(false); });
    return () => unsubscribe();
  }, [methodId, db]); // Include db in dependencies

  const handleGoogleSignIn = async () => { /* ... (keep as is) ... */ if (!auth || !googleProvider) return; try { await signInWithPopup(auth, googleProvider); } catch (e) { console.error("Google Sign-in failed in Comments:", e); } };
  const handleSubmit = async (e) => { /* ... (keep as is, ensure no anonymous) ... */ e.preventDefault(); if (!newComment.trim() || !user || !db || user.isAnonymous) { alert("Please sign in with Google to post."); return; } setError(null); try { await addDoc(collection(db, `methods/${methodId}/comments`), { text: newComment.trim(), userId: user.uid, timestamp: serverTimestamp() }); setNewComment(''); } catch (err) { console.error(err); setError('Failed to post comment.'); } };
  const startEdit = (comment) => { /* ... (keep as is) ... */ if (user && comment.userId === user.uid) { setEditingId(comment.id); setEditText(comment.text); } };
  const cancelEdit = () => { /* ... (keep as is) ... */ setEditingId(null); setEditText(''); };
  const saveEdit = async () => { /* ... (keep as is, check ownership) ... */ if (!editingId || !editText.trim() || !user || !db) return; setError(null); const commentRef = doc(db, `methods/${methodId}/comments`, editingId); try { const commentSnap = await getDoc(commentRef); if (commentSnap.exists() && commentSnap.data().userId === user.uid) { await updateDoc(commentRef, { text: editText.trim(), editedAt: serverTimestamp() }); cancelEdit(); } else { setError("Permission denied or comment not found."); cancelEdit(); } } catch (e) { console.error("Save edit failed:", e); setError('Failed to save changes.'); } };
  const remove = async (commentId, commentUserId) => { /* ... (keep as is, check ownership or admin) ... */ if (!user || !db) return; if (commentUserId !== user.uid && !isAdmin) { setError("Permission denied."); return; } if (!window.confirm('Delete this comment?')) return; setError(null); try { await deleteDoc(doc(db, `methods/${methodId}/comments`, commentId)); } catch (e) { console.error("Delete failed:", e); setError('Failed to delete comment.'); } };

  const canEdit = (commentUserId) => user && commentUserId === user.uid;
  const canDelete = (commentUserId) => (user && commentUserId === user.uid) || isAdmin;

   return (
    <section className="mt-12" aria-labelledby="discussion-heading">
      <h2 id="discussion-heading" className="mb-6 text-2xl font-bold text-gray-800">Community Discussion</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
         {/* Sign-in Prompt or Form */}
         {user && !user.isAnonymous ? (
             <form onSubmit={handleSubmit} className="mb-6"> {/* ... form elements ... */}
                 <label htmlFor="new-comment" className="sr-only">Your Comment</label>
                 <textarea id="new-comment" /* ... */ value={newComment} onChange={(e) => setNewComment(e.target.value)} required />
                 <button type="submit" /* ... */ disabled={!newComment.trim()}>Post Comment</button>
             </form>
         ) : (
             <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center"> {/* ... sign-in prompt ... */}
                 <p>Want to share? <button onClick={handleGoogleSignIn} /* ... */>Sign in with Google</button> to join.</p>
             </div>
         )}

         {error && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{error}</p>}

        {/* Comments List */}
         {isLoading ? <p>Loading comments...</p> : (
            <div className="space-y-6">
                {comments.length > 0 ? comments.map((c) => (
                <div key={c.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-4">
                        {/* Nickname & Timestamp */}
                        <div>
                             <p className="font-semibold text-gray-800">{nicknames[c.userId] || `User...`}</p>
                             <p className="text-xs text-gray-500">{c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleString() : '...'} {c.editedAt ? <span className="italic"> • edited</span> : ''}</p>
                        </div>
                         {/* Edit/Delete Buttons */}
                         {user && (
                             <div className="flex flex-shrink-0 gap-3">
                                 {canEdit(c.userId) && editingId !== c.id && <button onClick={() => startEdit(c)} /* ... */>Edit</button>}
                                 {canDelete(c.userId) && <button onClick={() => remove(c.id, c.userId)} /* ... */>Delete</button>}
                             </div>
                         )}
                    </div>
                    {/* Comment Text or Edit Form */}
                    {editingId === c.id ? (
                        <div className="mt-3"> {/* ... edit form ... */}
                            <label htmlFor={`edit-${c.id}`} className="sr-only">Edit</label>
                            <textarea id={`edit-${c.id}`} /* ... */ value={editText} onChange={(e) => setEditText(e.target.value)} required />
                            <div className="mt-2 flex gap-2">
                                <button onClick={saveEdit} disabled={!editText.trim()} /* ... */>Save</button>
                                <button onClick={cancelEdit} /* ... */>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{c.text}</p>
                    )}
                </div>
                )) : <p>No comments yet.</p>}
            </div>
         )}
      </div>
    </section>
  );
}

/* ---------------------------------------
    Submit & Feedback Page Components (Full - Ensure all sections are restored)
--------------------------------------- */
function SubmitMethodPage({ onBack, user }) { /* ... (Keep Full Component Code As Is) ... */ return ( <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8"> {/* ... content ... */} </div> ); }
function FeedbackPage({ onBack, user }) { /* ... (Keep Full Component Code As Is) ... */ return ( <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8"> {/* ... content ... */} </div> ); }

/* ---------------------------------------
    Gemini Advisor Component (Full)
--------------------------------------- */
function GeminiAdvisor({ methods, onClose }) { /* ... (Keep Full Component Code As Is) ... */ return ( <div className="fixed inset-0 z-50 ..."> {/* ... content ... */} </div> ); }

/* ---------------------------------------
    App Root Component (Full - Ensure all state and effects are restored)
--------------------------------------- */
export default function App() {
  // --- State Variables ---
  const [currentPage, setCurrentPage] = useState('list');
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('evidence');
  const [isAdmin, setIsAdmin] = useState(false);
   const [showFirebaseNotice, setShowFirebaseNotice] = useState(!isFirebaseConfigValid()); // Show notice if config bad


  // --- Effects (Keep all useEffect hooks as is) ---
  useEffect(() => { /* Auth Listener */ if (!auth) { setAuthReady(true); return; } const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true); }); return unsub; }, []);
  useEffect(() => { /* Aggregate Votes */ if (!db) return; const unsub = onSnapshot(collection(db, 'votes'), (snap) => { const data = {}; siboMethodsData.forEach(m => data[String(m.id)]={likes:0,dislikes:0}); snap.forEach(d=>data[d.id]=d.data()); setVotes(data); }, e=>console.error("Votes listener error:",e)); return unsub; }, [db]);
  useEffect(() => { /* User Votes */ if (user && db) { const unsub = onSnapshot(collection(db, `users/${user.uid}/userVotes`), snap => { const mine={}; snap.forEach(d=>mine[d.id]=d.data().vote); setUserVotes(mine); }, e=>console.error("User votes listener error:",e)); return unsub; } else { setUserVotes({}); } }, [user, db]);
  useEffect(() => { /* Admin Check */ if (user && !user.isAnonymous && db) { (async () => { try { const snap = await getDoc(doc(db, 'admins', user.uid)); setIsAdmin(snap.exists()); } catch(e){ console.error("Admin check failed:", e); setIsAdmin(false); } })(); } else { setIsAdmin(false); } }, [user, db]);


  // --- Handlers (Keep all handlers as is) ---
  const handleSelectMethod = (id) => { setSelectedMethodId(id); setCurrentPage('detail'); };
  const handleBack = () => { setSelectedMethodId(null); setCurrentPage('list'); };
  const handleGoHome = handleBack;
  const handleSubmitMethod = () => setCurrentPage('submit');
  const handleFeedback = () => setCurrentPage('feedback');
  const handleOpenAdvisor = () => setIsAdvisorOpen(true);
  const handleCloseAdvisor = () => setIsAdvisorOpen(false);
  const handleVote = async (id, voteType) => { /* ... (Keep Full Voting Logic As Is) ... */ if (!auth || !db) return; let currentUser = auth.currentUser; if (!currentUser || currentUser.isAnonymous) { if(window.confirm("Sign in with Google to vote?")){ try { currentUser = (await signInWithPopup(auth, googleProvider)).user; if(!currentUser) return; } catch(e){ console.error(e); return; } } else { return; } } const methodId = String(id); const userId = currentUser.uid; const voteDocRef = doc(db, 'votes', methodId); const userVoteDocRef = doc(db, `users/${userId}/userVotes`, methodId); try { await runTransaction(db, async tx => { /* ... (transaction logic) ... */ const [vSnap, uVSnap] = await Promise.all([tx.get(voteDocRef), tx.get(userVoteDocRef)]); let {likes=0, dislikes=0} = vSnap.data() || {}; const prev = uVSnap.data()?.vote; if(prev==='like') likes=Math.max(0,likes-1); if(prev==='dislike') dislikes=Math.max(0,dislikes-1); if(voteType!==prev){ if(voteType==='like') likes++; if(voteType==='dislike') dislikes++; tx.set(userVoteDocRef,{vote:voteType}); } else { tx.delete(userVoteDocRef); } tx.set(voteDocRef, {likes,dislikes}, {merge:true}); }); } catch(e){ console.error("Vote tx failed:", e); alert("Vote failed."); } };


  // --- Data & Sorting (Keep As Is) ---
  const methods = siboMethodsData;
  const sortedMethods = [...methods].sort((a, b) => {
    if (sortOrder === 'likes') {
      const likesA = votes[String(a.id)]?.likes || 0;
      const likesB = votes[String(b.id)]?.likes || 0;
      return likesB - likesA;
    }
    const tierA = a.evidenceTier === 0 ? -1 : a.evidenceTier;
    const tierB = b.evidenceTier === 0 ? -1 : b.evidenceTier;
    return tierB - tierA;
  });
  const selectedMethod = methods.find((m) => m.id === selectedMethodId);


  // --- Render Logic ---

   // Error Boundary (Simple version)
   class ErrorBoundary extends React.Component {
       constructor(props) { super(props); this.state = { hasError: false, error: null }; }
       static getDerivedStateFromError(error) { return { hasError: true, error }; }
       componentDidCatch(error, errorInfo) { console.error("ErrorBoundary caught an error:", error, errorInfo); }
       render() {
           if (this.state.hasError) {
               return (
                   <div className="p-8 text-center bg-red-50 text-red-700">
                       <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                       <p>Please try refreshing the page.</p>
                       <pre className="mt-4 text-xs text-left bg-red-100 p-2 overflow-auto">{this.state.error?.toString()}</pre>
                   </div>
               );
           }
           return this.props.children;
       }
   }

  // Config Error Check
  // Note: isFirebaseConfigValid() check is done early, showFirebaseNotice handles the UI message.


  // Auth Loading Check
  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100"><p className="animate-pulse text-lg font-medium text-gray-600">Loading...</p></div>;
  }

  // Page Router
  const renderPage = () => {
    // If Firebase isn't configured, force a limited view or message
     if (!isFirebaseConfigValid()) {
         return <MethodListPage methods={sortedMethods} onSelectMethod={() => alert("Details unavailable in limited mode.")} onVote={()=>{}} votes={{}} userVotes={{}} onSortChange={()=>{}} onOpenAdvisor={() => alert("Advisor unavailable.")} />;
     }

    switch (currentPage) {
      case 'detail': return selectedMethod ? <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} isAdmin={isAdmin} /> : (handleBack(), null);
      case 'submit': return <SubmitMethodPage onBack={handleBack} user={user} />;
      case 'feedback': return <FeedbackPage onBack={handleBack} user={user} />;
      case 'list': default: return <MethodListPage methods={sortedMethods} onSelectMethod={handleSelectMethod} onVote={handleVote} votes={votes} userVotes={userVotes} onSortChange={setSortOrder} onOpenAdvisor={handleOpenAdvisor} />;
    }
  };


  // --- Final Render ---
  return (
    <ErrorBoundary> {/* Wrap everything */}
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <Header user={user} onGoHome={handleGoHome} onSubmitMethod={handleSubmitMethod} onFeedback={handleFeedback} />
         {/* Show notice if config is invalid */}
         {showFirebaseNotice && (
            <div className="mx-auto mt-4 mb-4 max-w-6xl rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                ⚠️ Limited mode: Firebase is not configured. Voting, comments, submissions, and AI features are disabled. Please check environment variables.
            </div>
         )}
        {isAdvisorOpen && <GeminiAdvisor methods={methods} onClose={handleCloseAdvisor} />}
        <main>{renderPage()}</main>
        </div>
    </ErrorBoundary>
  );
}