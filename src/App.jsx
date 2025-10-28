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
--------------------------------------- */
const AudioSection = () => {
  // Updated episodes array with your Firebase Storage URL
  const episodes = [
    {
      title: 'SIBO Unpacked: Your Gut Detective Guide',
      src: 'https://firebasestorage.googleapis.com/v0/b/sibo-recovery-app.firebasestorage.app/o/SIBO%20Unpacked_%20Your%20Gut%20Detective%20Guide%20to%20Bloating%2C%20Pain%2C%20and%20Personalized%20Healing.mp3?alt=media&token=136277f0-b710-4f2c-91d2-5b889ca1b4e8'
    }
    // Add more episode objects here if needed, separated by commas
  ];

  // If the episodes array is empty, the component will render nothing
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
    Methods data
--------------------------------------- */
const siboMethodsData = [
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
    sampleDay: {
      title: 'A Sample Day During the Rifaximin Protocol',
      schedule: [
        { time: 'Morning (8 AM)', action: 'Dose with water. Walk 10–15 min. Breakfast 30–60 min later.' },
        { time: 'Afternoon (2 PM)', action: 'Second dose. Light movement. Balanced lunch.' },
        { time: 'Evening (8 PM)', action: 'Third dose. Gentle dinner. Journal symptoms.' },
        { time: 'Bedtime', action: '12-hour overnight fast to support MMC.' },
      ],
    },
    protocol: [
      {
        phase: 'Phase 1: Antibiotic Treatment (~14 days)',
        steps: [
          { title: 'Hydrogen-dominant', description: 'Rifaximin 550mg, three times daily (per clinician).' },
          { title: 'Methane-dominant', description: 'Rifaximin + a pairing agent (e.g., Neomycin) per clinician.' },
          { title: 'Dietary support', description: 'Short-term symptom diet if helpful; hydrate and move gently.' },
        ],
      },
      {
        phase: 'Phase 2: Recovery & Prevention',
        steps: [
          { title: 'Prokinetic support', description: 'Discuss options (ginger, artichoke, Rx) if appropriate.' },
          { title: 'Meal spacing', description: '3–4+ hours between meals to encourage MMC (as tolerated).' },
          { title: 'Reintroduction', description: 'Gradual food reintroduction and trigger tracking.' },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Herbal Antimicrobials (Combo)',
    summary:
      'Botanical protocols in cycles; blends such as berberine, oregano, allicin are commonly used (watch sensitivities).',
    evidenceTier: 2,
    commonSymptoms: ['Bloating', 'Gas', 'Abdominal pain'],
    citation: { text: 'Pilot/smaller studies; consult clinician.', url: '' },
    sampleDay: {
      title: 'Illustrative day',
      schedule: [
        { time: 'Morning', action: 'Protocol dose with water; breakfast later.' },
        { time: 'Afternoon', action: 'Second dose; light walk.' },
        { time: 'Evening', action: 'Wind down; symptom notes.' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Foundation', steps: [{ title: 'Dietary baseline', description: 'Simplify triggers; hydrate.' }] },
      { phase: 'Phase 2 — Active', steps: [{ title: 'Cycle antimicrobials', description: 'Follow cycle plan; track symptoms.' }] },
      { phase: 'Phase 3 — Maintenance', steps: [{ title: 'Reassess', description: 'Evaluate and plan next steps.' }] },
    ],
  },
  {
    id: 4,
    title: 'Elemental Diet (Short Course, supervised)',
    summary:
      'Nutritionally complete formula used short-term when other approaches are not tolerated.',
    evidenceTier: 1, // Changed from 2 based on Pimentel 2004 study showing 80%+ normalization
    commonSymptoms: ['Bloating', 'Abdominal pain', 'Diarrhea', 'Severe/Stubborn Cases'],
    citation: { text: 'Pimentel et al. 2004 showed high efficacy in normalizing breath tests.', url: 'https://pubmed.ncbi.nlm.nih.gov/14992438/' },
    sampleDay: {
      title: 'Illustrative day',
      schedule: [
        { time: 'Morning', action: 'Prepared formula, hydration, gentle movement' },
        { time: 'Midday', action: 'Formula portion, rest, light activity' },
        { time: 'Evening', action: 'Formula portion, wind down, sleep hygiene' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Preparation', steps: [{ title: 'Overview', description: 'Plan 14-21 day duration with clinician.' }] },
      { phase: 'Phase 2 — Active', steps: [{ title: 'Follow schedule', description: 'Use formula exclusively; monitor symptoms.' }] },
      { phase: 'Phase 3 — Reintroduction', steps: [{ title: 'Gradual foods', description: 'Slowly reintroduce simple, well-cooked foods while tracking.' }] },
    ],
  },
    {
    id: 5,
    title: 'Prokinetic & Meal Spacing',
    summary: 'Focus on motility support (MMC stimulation) and spacing meals to prevent bacterial accumulation.',
    evidenceTier: 2, // Supporting MMC is physiologically sound, specific agent evidence varies
    commonSymptoms: ['Bloating', 'Fullness', 'Constipation', 'Relapse Prevention'],
    citation: { text: 'Physiology-informed strategy; agent-specific evidence varies (e.g., Ginger/Artichoke combo has some study support).', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4040759/' }, // Example study for ginger/artichoke
    sampleDay: {
      title: 'Illustrative day',
      schedule: [
        { time: 'Morning', action: 'Balanced breakfast; space next meal 4+ hrs if appropriate.' },
        { time: 'Afternoon', action: 'Lunch after 4+ hr gap. Light movement; hydration between meals.' },
        { time: 'Evening', action: 'Dinner after 4+ hr gap. Wind down.' },
         { time: 'Bedtime', action: 'Take prokinetic (e.g., Ginger/Artichoke) at least 2-3 hours after dinner on empty stomach. Ensure 12+ hour overnight fast.' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Baseline', steps: [{ title: 'Meal Spacing', description: 'Aim for 4-5 hour gaps between meals, 12+ hour overnight fast. No snacking.' }] },
      { phase: 'Phase 2 — Prokinetic Support', steps: [{ title: 'Choose Agent', description: 'Discuss options (Ginger/Artichoke, Iberogast, Rx like Prucalopride, LDN, Erythromycin) with clinician.' }, {title: 'Timing', description: 'Typically taken at bedtime on an empty stomach.'}] },
      { phase: 'Phase 3 — Review & Maintain', steps: [{ title: 'Reassess', description: 'Monitor symptoms, adjust agent/dose as needed with clinician support.' }] },
    ],
  },
  {
    id: 6,
    title: 'Low-FODMAP Diet (Short-term)',
    summary:
      'A structured elimination and reintroduction diet to identify specific carbohydrate triggers for symptoms like gas and bloating. Primarily a symptom management tool during/after treatment.',
    evidenceTier: 2, // Strong evidence for IBS symptom relief, adapted for SIBO context
    commonSymptoms: ['Bloating', 'Gas', 'Abdominal pain', 'Diarrhea'],
    citation: { text: 'Extensive research in IBS symptom management (Monash University). Use as a short-term tool with clinician guidance for SIBO.', url: 'https://www.monashfodmap.com/about-fodmap-and-ibs/' },
    sampleDay: {
      title: 'Illustrative day (Elimination Phase)',
      schedule: [
        { time: 'Morning', action: 'Low-FODMAP breakfast (e.g., scrambled eggs, spinach, gluten-free toast with minimal safe topping).' },
        { time: 'Afternoon', action: 'Low-FODMAP lunch (e.g., grilled chicken salad with safe greens, cucumber, carrots, olive oil/lemon dressing). Hydration.' },
        { time: 'Evening', action: 'Low-FODMAP dinner (e.g., baked salmon, steamed green beans, portion of rice). Symptom notes.' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Elimination (2-6 weeks)', steps: [{ title: 'Strict Limitation', description: 'Strictly avoid high-FODMAP foods using a reliable guide (e.g., Monash app).' }] },
      { phase: 'Phase 2 — Reintroduction', steps: [{ title: 'Systematic Testing', description: 'Reintroduce FODMAP groups one at a time, in specific portion sizes, to identify personal triggers.' }] },
      { phase: 'Phase 3 — Personalization', steps: [{ title: 'Modified Diet', description: 'Build a long-term, diverse diet incorporating well-tolerated FODMAPs.' }] },
    ],
  },
  {
    id: 7,
    title: 'Stress, Sleep, and Movement Support',
    summary:
      'Addresses crucial lifestyle pillars influencing the gut-brain axis and overall GI function: stress reduction techniques, sleep hygiene, and appropriate physical activity.',
    evidenceTier: 3, // Broad health literature supports gut-brain connection; specifics vary
    commonSymptoms: ['Abdominal pain', 'Bloating', 'General wellbeing', 'Gut-Brain Axis Dysfunction'],
    citation: { text: 'Gut-brain axis research supports the impact of stress/sleep on GI function. Integrate as foundational support.', url: '' },
    sampleDay: {
      title: 'Illustrative day',
      schedule: [
        { time: 'Morning', action: 'Gentle movement (walk, yoga). Mindful breakfast.' },
        { time: 'Afternoon', action: 'Short stress-reduction session (meditation, deep breathing). Hydration.' },
        { time: 'Evening', action: 'Consistent wind-down routine (dim lights, no screens). Aim for 7-9 hours sleep.' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Assess', steps: [{ title: 'Identify Habits', description: 'Note stressors, sleep patterns, activity levels.' }] },
      { phase: 'Phase 2 — Build Small Habits', steps: [{ title: 'Stress Reduction', description: 'Incorporate daily mindfulness, meditation, or deep breathing (5-10 mins).' }, {title: 'Sleep Hygiene', description: 'Establish consistent bedtime/wake time, create cool/dark sleep environment.'}, {title: 'Gentle Movement', description: 'Aim for daily low-impact activity like walking or stretching.'}] },
      { phase: 'Phase 3 — Maintain & Adapt', steps: [{ title: 'Track & Adjust', description: 'Observe impact on symptoms and well-being, refine habits as needed.' }] },
    ],
  },
];

/* ---------------------------------------
    Header
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
      // Fallback to anonymous only if Google fails explicitly
      // Consider removing anonymous sign-in if not needed
      try {
        await signInAnonymously(auth);
         console.log("Signed in anonymously after Google failed.");
      } catch (err) {
        console.error('Anonymous sign-in also failed:', err);
      }
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    if (!auth) return;
    setBusy(true);
    try {
      await signOut(auth);
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={onGoHome} className="text-xl font-extrabold tracking-tight text-indigo-700 hover:text-indigo-900">
          SIBO Recovery Hub
        </button>
        <nav className="flex items-center gap-3">
          <button
            onClick={onSubmitMethod}
            className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit Method
          </button>
          <button
            onClick={onFeedback}
            className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Feedback
          </button>
          {user ? (
            <button
              disabled={busy}
              onClick={doSignOut}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Sign out {user.isAnonymous ? '(Guest)' : ''}
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={doGoogleSignIn}
              className="px-3 py-1.5 rounded-md border border-indigo-600 text-sm font-medium text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
    Cards & List page
--------------------------------------- */
const MethodCard = ({ method, onSelect, onVote, votes, userVote }) => (
  <div
    className="flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl"
    onClick={() => onSelect(method.id)}
    role="button" // Accessibility
    tabIndex={0} // Accessibility
    onKeyPress={(e) => e.key === 'Enter' && onSelect(method.id)} // Accessibility
  >
    <div className="p-6">
      <div className="mb-3">
        <EvidenceTierBadge tier={method.evidenceTier} />
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-800">{method.title}</h3>
      <p className="mb-4 text-sm text-gray-600 line-clamp-3">{method.summary}</p> {/* Limit summary lines */}
    </div>
    <div className="flex items-center justify-end space-x-4 border-t border-gray-100 bg-gray-50 px-6 py-4">
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent card click
          onVote(method.id, 'like');
        }}
        className={`flex items-center space-x-1 transition-colors ${
          userVote === 'like' ? 'text-green-600 font-semibold' : 'text-gray-500 hover:text-green-600'
        }`}
        aria-label={`Like ${method.title}`} // Accessibility
      >
        <ThumbsUpIcon isSelected={userVote === 'like'} />
        <span className="text-sm font-medium">{votes.likes}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent card click
          onVote(method.id, 'dislike');
        }}
        className={`flex items-center space-x-1 transition-colors ${
          userVote === 'dislike' ? 'text-red-600 font-semibold' : 'text-gray-500 hover:text-red-600'
        }`}
         aria-label={`Dislike ${method.title}`} // Accessibility
      >
        <ThumbsDownIcon isSelected={userVote === 'dislike'} />
        <span className="text-sm font-medium">{votes.dislikes}</span>
      </button>
    </div>
  </div>
);

const MethodListPage = ({
  methods,
  onSelectMethod,
  onVote,
  votes,
  userVotes,
  onSortChange,
  onOpenAdvisor,
}) => (
  <div className="p-4 sm:p-6 md:p-8">
    <header className="mb-10 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
        Community-Sourced SIBO Protocols
      </h1>
      <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
        Explore recovery methods backed by community experience and general evidence summaries. Vote on what you've
        tried and see what has worked for others.
      </p>
      <button
        onClick={onOpenAdvisor}
        className="mt-6 inline-flex items-center gap-2 transform rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
        Get Help from AI Protocol Advisor
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

    {/* Consider moving these sections? They add a lot of length to the main page */}
    <AiPatternAnalysis />
    <AudioSection />
    <EvidenceTierExplanation />

    <footer className="mt-16 border-t border-gray-200 pt-8 px-4 text-center text-sm text-gray-500">
      <p className="mb-2">
        **Disclaimer:** This site is for informational purposes only and does not constitute medical advice.
        Always consult with a qualified healthcare professional regarding any health concerns or before making any decisions related to your health or treatment.
      </p>
       <p>&copy; {new Date().getFullYear()} SIBO Recovery Hub. All rights reserved.</p>
    </footer>
  </div>
);


/* ---------------------------------------
    Detail page
--------------------------------------- */
const MethodDetailPage = ({ method, onBack, user, isAdmin }) => (
  <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
    <button
      onClick={onBack}
      className="mb-8 inline-flex items-center font-semibold text-blue-600 hover:text-blue-800"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
      Back to All Methods
    </button>

    <article> {/* Semantic HTML */}
      <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
        {method.title}
      </h1>

      <section className="mb-8 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800" aria-labelledby="evidence-heading">
        <h3 id="evidence-heading" className="mb-2 text-lg font-bold">Evidence & Research</h3>
        <div className="mb-2">
          <EvidenceTierBadge tier={method.evidenceTier} />
        </div>
        <p className="text-sm">{method.citation.text}</p>
        {method.citation.url && (
          <a
            href={method.citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
          >
            View Study <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        )}
      </section>

      {method.commonSymptoms && method.commonSymptoms.length > 0 && (
          <section className="mb-8" aria-labelledby="symptoms-heading">
              <h3 id="symptoms-heading" className="mb-2 text-lg font-bold text-gray-800">
                  Potentially Helpful For Symptoms Like:
              </h3>
              <div className="flex flex-wrap gap-2">
                  {method.commonSymptoms.map((symptom, i) => (
                      <span
                          key={i}
                          className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700"
                      >
                          {symptom}
                      </span>
                  ))}
              </div>
          </section>
      )}


      {method.sampleDay && method.sampleDay.schedule && method.sampleDay.schedule.length > 0 && (
        <section className="mb-8 rounded-lg bg-gray-100 p-6" aria-labelledby="sample-day-heading">
          <h3 id="sample-day-heading" className="mb-4 text-lg font-bold text-gray-800">
            {method.sampleDay.title || "A Sample Day"}
          </h3>
          <dl className="space-y-4">
            {method.sampleDay.schedule.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row">
                <dt className="w-full sm:w-1/3 font-semibold text-gray-700">{item.time}:</dt>
                <dd className="w-full sm:w-2/3 text-gray-600 sm:pl-2">{item.action}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p className="mb-8 text-lg text-gray-600">{method.summary}</p>

      {/* Protocol Phases */}
       {method.protocol && method.protocol.length > 0 && (
            <section className="space-y-8" aria-labelledby="protocol-heading">
                <h2 id="protocol-heading" className="sr-only">Protocol Details</h2> {/* Hidden heading for structure */}
                {method.protocol.map((phase, i) => (
                    <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                        <div className="border-b border-gray-200 bg-gray-100 p-4">
                            <h3 className="text-xl font-bold text-gray-800">{phase.phase}</h3>
                        </div>
                        <div className="space-y-6 p-6">
                            {phase.steps && phase.steps.length > 0 ? (
                                phase.steps.map((step, j) => (
                                    <div key={j}>
                                        <h4 className="mb-2 text-lg font-semibold text-gray-700">{step.title}</h4>
                                        {step.description && (
                                            <p className="mb-3 text-gray-600">{step.description}</p>
                                        )}
                                        {step.items && step.items.length > 0 && (
                                            <ul className="list-inside list-disc space-y-1 pl-4 text-gray-600">
                                                {step.items.map((item, k) => (
                                                    <li key={k}>{item}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500">No steps defined for this phase.</p>
                            )}
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
    NICKNAMES helpers
--------------------------------------- */
const ADJECTIVES = ['Calm','Brave','Swift','Sunny','Kind','Bright','Lucky','Quiet','Clever','Silver', 'Gentle', 'Wise', 'Bold', 'Merry', 'Sturdy'];
const ANIMALS    = ['Otter','Falcon','Panda','Koala','Fox','Dolphin','Lynx','Finch','Turtle','Bear', 'Badger', 'Eagle', 'Rabbit', 'Wolf', 'Deer'];

function generateNickname(uid = '') {
  const a = ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(Math.random()*ANIMALS.length)];
  // Use last 4 of UID for more uniqueness if available, otherwise random
  const tag = uid.slice(-4) || String(Math.floor(1000 + Math.random() * 9000));
  return `${a} ${b} #${tag}`;
}

// Updated to handle potential errors during Firestore operations
async function getOrCreateNickname(db, uid) {
  if (!uid || !db) {
      console.warn("getOrCreateNickname called without uid or db");
      return `User #${String(Math.random()).slice(2, 6)}`; // Temporary fallback
  }
  const uref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(uref);
    if (snap.exists() && snap.data()?.nickname) {
      return snap.data().nickname;
    }
    // Nickname doesn't exist, generate and save
    const nickname = generateNickname(uid);
    await setDoc(uref, { nickname }, { merge: true }); // Use merge to avoid overwriting other potential user data
    return nickname;
  } catch (error) {
    console.error("Error fetching or creating nickname for UID:", uid, error);
    // Return a temporary nickname in case of error
    return `User #${uid.slice(-4) || 'Err'}`;
  }
}

/* ---------------------------------------
    Comments (Improved Version)
--------------------------------------- */
function CommentsSection({ methodId, user, isAdmin }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null); // ID of the comment being edited
  const [editText, setEditText] = useState('');     // Text content while editing
  const [nicknames, setNicknames] = useState({}); // Cache for user nicknames { userId: nickname }
  const [isLoading, setIsLoading] = useState(true); // Loading state for comments

  // --- Fetch Comments and Nicknames ---
  useEffect(() => {
    if (!db || !methodId) return;

    setIsLoading(true);
    setError(null); // Clear previous errors

    const qref = query(collection(db, `methods/${methodId}/comments`), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      qref,
      async (querySnapshot) => {
        const fetchedComments = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setComments(fetchedComments);

        // --- Efficiently fetch missing nicknames ---
        const userIdsToFetch = fetchedComments
          .map(c => c.userId)
          .filter(userId => userId && !nicknames[userId]); // Only fetch if userId exists and not already cached

        if (userIdsToFetch.length > 0) {
          const uniqueUserIds = [...new Set(userIdsToFetch)]; // Remove duplicates
          const nicknamePromises = uniqueUserIds.map(userId =>
            getOrCreateNickname(db, userId).then(name => ({ userId, name }))
          );
          try {
            const fetchedNicknames = await Promise.all(nicknamePromises);
            setNicknames(prev => ({
              ...prev,
              ...fetchedNicknames.reduce((acc, { userId, name }) => {
                acc[userId] = name;
                return acc;
              }, {})
            }));
          } catch (nickError) {
             console.error("Error fetching some nicknames:", nickError);
             // Partial update might still be useful
          }
        }
        setIsLoading(false); // Done loading
      },
      (err) => {
        console.error("Error fetching comments snapshot:", err);
        setError('Could not load comments. Please check your connection and try again.');
        setIsLoading(false);
      }
    );
    return () => unsubscribe(); // Cleanup listener on unmount
  }, [methodId, db]); // Rerun if methodId or db changes

 // --- Handlers ---
  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) return;
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error("Google Sign-in failed in Comments:", e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !db || user.isAnonymous) { // Prevent anonymous comments
        alert("Please sign in with Google to post a comment.");
        return;
    }
    setError(null); // Clear previous errors
    try {
      // Don't store nickname on comment, rely on fetching via userId
      await addDoc(collection(db, `methods/${methodId}/comments`), {
        text: newComment.trim(),
        userId: user.uid, // Store the user's unique ID
        timestamp: serverTimestamp(),
        // No nickname field here
      });
      setNewComment(''); // Clear input after successful post
    } catch (err) {
      console.error("Error posting comment:", err);
      setError('Failed to post comment. Please try again.');
    }
  };

  const startEdit = (comment) => {
      // Ensure only the owner can start editing
      if (user && comment.userId === user.uid) {
          setEditingId(comment.id);
          setEditText(comment.text);
      }
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async () => {
    if (!editingId || !editText.trim() || !user || !db) return;
    setError(null);

    const commentRef = doc(db, `methods/${methodId}/comments`, editingId);
    try {
      // Double-check ownership before updating
      const commentSnap = await getDoc(commentRef);
      if (commentSnap.exists() && commentSnap.data().userId === user.uid) {
        await updateDoc(commentRef, {
          text: editText.trim(),
          editedAt: serverTimestamp(), // Mark as edited
        });
        cancelEdit(); // Close editor on success
      } else {
          setError("Could not save edit. Comment not found or permission denied.");
          cancelEdit(); // Close editor on failure too
      }
    } catch (e) {
      console.error("Failed to save comment edit:", e);
      setError('Failed to save changes. Please try again.');
    }
  };

  const remove = async (commentId, commentUserId) => {
    if (!user || !db) return; // Need user and db
    // Check permission: Must be the comment owner OR an admin
    if (commentUserId !== user.uid && !isAdmin) {
        setError("You don't have permission to delete this comment.");
        return;
    }

    if (!window.confirm('Are you sure you want to permanently delete this comment?')) return;
    setError(null);

    try {
      await deleteDoc(doc(db, `methods/${methodId}/comments`, commentId));
    } catch (e) {
      console.error("Failed to delete comment:", e);
      setError('Failed to delete comment. Please try again.');
    }
  };

  // Simplified permission checks
  const canEdit = (commentUserId) => user && commentUserId === user.uid;
  const canDelete = (commentUserId) => (user && commentUserId === user.uid) || isAdmin;

 // --- Render Logic ---
  return (
    <section className="mt-12" aria-labelledby="discussion-heading">
      <h2 id="discussion-heading" className="mb-6 text-2xl font-bold text-gray-800">Community Discussion</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        {user && !user.isAnonymous ? ( // Show form only for non-anonymous logged-in users
          <form onSubmit={handleSubmit} className="mb-6">
            <label htmlFor="new-comment" className="sr-only">Your Comment</label>
            <textarea
              id="new-comment"
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              rows="4"
              placeholder="Share your experience (guidelines apply)..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              required
            />
            <button
              type="submit"
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
              disabled={!newComment.trim()}
            >
              Post Comment
            </button>
          </form>
        ) : (
          <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
            <p className="text-gray-600">
              Want to share your experience?{' '}
              <button onClick={handleGoogleSignIn} className="font-semibold text-indigo-600 hover:underline">
                Sign in with Google
              </button>{' '}
              to join the discussion.
            </p>
          </div>
        )}

        {error && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{error}</p>}

        {isLoading ? (
             <p className="text-gray-500">Loading comments...</p>
        ) : (
            <div className="space-y-6">
            {comments.length > 0 ? (
                comments.map((c) => (
                <div key={c.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-semibold text-gray-800">
                            {/* Display nickname from cached state */}
                            {nicknames[c.userId] || `User...`}
                        </p>
                        <p className="text-xs text-gray-500">
                            {c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleString() : 'Just now'}
                            {c.editedAt ? <span className="italic"> • edited</span> : ''}
                        </p>
                    </div>
                    {/* Buttons only visible if logged in */}
                    {user && (
                        <div className="flex flex-shrink-0 gap-3">
                        {canEdit(c.userId) && editingId !== c.id && ( // Don't show Edit while editing
                            <button onClick={() => startEdit(c)} className="text-sm font-medium text-indigo-600 hover:underline">
                            Edit
                            </button>
                        )}
                        {canDelete(c.userId) && (
                            <button onClick={() => remove(c.id, c.userId)} className="text-sm font-medium text-red-600 hover:underline">
                            Delete
                            </button>
                        )}
                        </div>
                    )}
                    </div>

                    {editingId === c.id ? ( // Show edit form if editing this comment
                    <div className="mt-3">
                         <label htmlFor={`edit-comment-${c.id}`} className="sr-only">Edit Comment</label>
                        <textarea
                           id={`edit-comment-${c.id}`}
                           className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                           rows="3"
                           value={editText}
                           onChange={(e) => setEditText(e.target.value)}
                           required
                        />
                        <div className="mt-2 flex gap-2">
                        <button
                            onClick={saveEdit}
                            disabled={!editText.trim()}
                            className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
                            >Save</button>
                        <button onClick={cancelEdit} className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">Cancel</button>
                        </div>
                    </div>
                    ) : ( // Otherwise, show comment text
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{c.text}</p>
                    )}
                </div>
                ))
            ) : (
                <p className="text-gray-500">No comments yet. Be the first to share your experience!</p>
            )}
            </div>
        )}
      </div>
    </section>
  );
}


/* ---------------------------------------
    Submit & Feedback Pages (Improved Auth Handling)
--------------------------------------- */
function SubmitMethodPage({ onBack, user }) {
  const [formData, setFormData] = useState({ title: '', summary: '', sourceLink: '', symptoms: '', protocol: '', sampleDay: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Re-check user status on submit, prevent anonymous
    if (!user || user.isAnonymous || !db) {
      setError("Please sign in with Google to submit a method.");
      return;
    }
    setError(null); // Clear error
    setIsSubmitting(true);
    try {
      // Split symptoms string into an array
       const symptomsArray = formData.symptoms.split(',').map(s => s.trim()).filter(s => s);

      await addDoc(collection(db, 'submissions'), {
        ...formData,
        symptoms: symptomsArray, // Store as array
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
        status: 'pending', // Add a status for review
      });
      alert('Thank you for your submission! It will be reviewed shortly.');
      onBack();
    } catch (error) {
      console.error('Error submitting form: ', error);
      setError('Sorry, there was an error submitting your form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Specific sign-in handler for this page
  const handleGoogleSignInForSubmit = async () => {
      if (!auth || !googleProvider) return;
      setError(null);
      try { await signInWithPopup(auth, googleProvider); }
      catch (e) { console.error("Google sign-in failed:", e); setError("Sign-in failed. Please try again."); }
  };

  // Show prompt if not logged in OR is anonymous
  if (!user || user.isAnonymous) {
    return (
      <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
        <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit a Method</h1>
         {error && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{error}</p>}
        <p className="mb-8 text-lg text-gray-600">
          Please{' '}
          <button onClick={handleGoogleSignInForSubmit} className="font-semibold text-indigo-600 hover:underline">
            sign in with Google
          </button>{' '}
          to contribute a new method. This helps maintain the quality of submissions.
        </p>
        <button onClick={onBack} className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800">
             <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
            Back to All Methods
        </button>
      </div>
    );
  }

  // Render form only for non-anonymous users
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <button onClick={onBack} className="mb-8 inline-flex items-center font-semibold text-blue-600 hover:text-blue-800">
         <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
        Back to All Methods
      </button>

      <h1 className="mb-6 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit a New Recovery Method</h1>
      <p className="mb-8 text-gray-600">
        Thank you for contributing! Provide details below. Submissions are reviewed before publishing.
      </p>
       {error && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
         {/* Form fields remain largely the same, ensure labels match inputs correctly */}
         <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Method Title</label>
            <input type="text" name="title" id="title" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., Low-Dose Naltrexone (LDN) Protocol" value={formData.title} onChange={handleChange} />
         </div>
         <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Short Summary</label>
            <textarea name="summary" id="summary" rows="3" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Briefly describe the method's main principle." value={formData.summary} onChange={handleChange} />
         </div>
          <div>
            <label htmlFor="sourceLink" className="block text-sm font-medium text-gray-700">Link to Source (Optional)</label>
            <input type="url" name="sourceLink" id="sourceLink" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="URL of article, study, or post" value={formData.sourceLink} onChange={handleChange} />
         </div>
         <div>
             <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">Relevant Symptoms (comma-separated)</label>
             <input type="text" name="symptoms" id="symptoms" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., Methane SIBO, Constipation, Brain Fog" value={formData.symptoms} onChange={handleChange} />
         </div>
         <div>
            <label htmlFor="protocol" className="block text-sm font-medium text-gray-700">Full Protocol Details</label>
            <textarea name="protocol" id="protocol" rows="8" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Describe phases, steps, dosages, timing, duration clearly." value={formData.protocol} onChange={handleChange} />
         </div>
         <div>
             <label htmlFor="sampleDay" className="block text-sm font-medium text-gray-700">A Sample Day</label>
             <textarea name="sampleDay" id="sampleDay" rows="5" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Outline a typical day (e.g., Morning: ..., Afternoon: ..., Evening: ...)." value={formData.sampleDay} onChange={handleChange} />
         </div>

        <div>
          <button type="submit" disabled={isSubmitting} className="w-full justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </div>
  );
}


function FeedbackPage({ onBack, user }) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim() || !user || user.isAnonymous || !db) { // Re-check user, prevent anonymous
       setError("Please sign in with Google to submit feedback.");
       return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        feedbackText: feedback.trim(),
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
        userAgent: navigator.userAgent, // Optional: Capture browser info
      });
      alert('Thank you for your feedback!');
      onBack();
    } catch (error) {
      console.error('Error submitting feedback: ', error);
      setError('Sorry, there was an error submitting your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

   // Specific sign-in handler
   const handleGoogleSignInForFeedback = async () => {
      if (!auth || !googleProvider) return;
      setError(null);
      try { await signInWithPopup(auth, googleProvider); }
      catch (e) { console.error("Google sign-in failed:", e); setError("Sign-in failed. Please try again."); }
   };

  // Show prompt if not logged in OR is anonymous
  if (!user || user.isAnonymous) {
    return (
      <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
        <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit Feedback</h1>
         {error && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{error}</p>}
        <p className="mb-8 text-lg text-gray-600">
          Please{' '}
          <button onClick={handleGoogleSignInForFeedback} className="font-semibold text-indigo-600 hover:underline">
            sign in with Google
          </button>{' '}
          to share your feedback.
        </p>
         <button onClick={onBack} className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800">
             <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
            Back to All Methods
        </button>
      </div>
    );
  }

  // Render form only for non-anonymous users
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <button onClick={onBack} className="mb-8 inline-flex items-center font-semibold text-blue-600 hover:text-blue-800">
         <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
        Back to All Methods
      </button>
      <h1 className="mb-6 text-3xl font-extrabold text-gray-900 sm:text-4xl">Share Your Feedback</h1>
      <p className="mb-8 text-gray-600">
        Have an idea? Found a bug? Let us know! Your feedback helps improve this resource.
      </p>
       {error && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
        <div>
          <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">Your Feedback</label>
          <textarea
            name="feedback"
            id="feedback"
            rows="8"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Tell us what you think..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={isSubmitting || !feedback.trim()}
            className="w-full justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}


/* ---------------------------------------
    Gemini Advisor (Error Handling & Structure Improvements)
--------------------------------------- */
function GeminiAdvisor({ methods, onClose }) {
  // Ensure methods is always an array
  const safeMethods = Array.isArray(methods) ? methods : [];

  const baseSymptoms = [ /* ... (keep your base symptoms) ... */ 'Constipation','Diarrhea','Bloating','Gas','Abdominal pain','Nausea','Belching','Brain fog','Fullness','Reflux/Heartburn' ];

  // Safely extract symptoms, ensuring commonSymptoms is an array
  const allSymptoms = [
    ...new Set([...baseSymptoms, ...safeMethods.flatMap(m => Array.isArray(m.commonSymptoms) ? m.commonSymptoms : [])])
  ];

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [advice, setAdvice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // Added error state

  const toggleSymptom = (sym) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const getAdvice = async () => {
    if (selectedSymptoms.length === 0) {
      setError('Please select at least one symptom.');
      setAdvice(''); // Clear previous advice
      return;
    }
    setIsLoading(true);
    setAdvice('');
    setError(null); // Clear previous errors

    const simplified = safeMethods.map((m) => ({
      title: m.title,
      summary: m.summary,
      evidenceTier: m.evidenceTier,
      commonSymptoms: Array.isArray(m.commonSymptoms) ? m.commonSymptoms : [], // Ensure array
    }));

     const systemPrompt = `You are an AI assistant for a SIBO recovery website. Your role is to provide a helpful, non-medical summary based on user-reported symptoms and a list of community-sourced treatment protocols.\n\nIMPORTANT RULES:\n1. DO NOT PROVIDE MEDICAL ADVICE. Start every single response with this exact disclaimer: "This is not medical advice. Always consult with a qualified healthcare professional before starting any new treatment."\n2. Analyze the user's selected symptoms and the provided list of protocols.\n3. Identify which protocols are most relevant to the user's symptoms based on the 'commonSymptoms' listed for each protocol.\n4. Summarize in 2-3 short paragraphs.\n5. Mention the 'evidenceTier'.\n6. Helpful, empathetic, strictly informational.\n7. Do not invent information or suggest protocols not on the list.`;

    const userQuery = `My primary symptoms are: ${selectedSymptoms.join(', ')}. Based on the following data, which protocols might be relevant for me to research further and discuss with my doctor?\n\nProtocols Data:\n${JSON.stringify(simplified, null, 2)}`;


    if (!GEMINI_API_KEY) {
      setError('AI Advisor is currently unavailable (API Key missing).');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               // Check Gemini API docs for the correct structure (system_instruction vs systemInstruction)
               system_instruction: { parts: [{ text: systemPrompt }] }, // Use system_instruction if required
               contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            }),
        }
      );

       if (!response.ok) {
           let errorDetails = `API call failed: ${response.status} ${response.statusText}`;
           try {
               const errorBody = await response.json();
               console.error("Gemini API Error Body:", errorBody);
               // Extract more specific error message if available
               errorDetails += ` - ${errorBody?.error?.message || JSON.stringify(errorBody)}`;
           } catch (parseError) {
               // If response isn't JSON
               errorDetails += ` - Could not parse error response.`;
           }
           throw new Error(errorDetails);
       }

      const result = await response.json();

      // Check for safety ratings or blocks which might indicate why content is empty
       if (result?.promptFeedback?.blockReason) {
           console.warn("Gemini Response Blocked:", result.promptFeedback);
           setError(`The AI response was blocked due to: ${result.promptFeedback.blockReason}. Please adjust your query or try again later.`);
           setAdvice('');
       } else {
           const text = result?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n').trim();
           if (text) {
               setAdvice(text);
           } else {
               console.warn("Gemini response empty or structure unexpected:", result);
               setError("Received an empty or unexpected response from the AI. Please try again.");
               setAdvice('');
           }
       }

    } catch (err) {
      console.error('Gemini API call failed:', err);
      setError(`Sorry, there was an error communicating with the AI Advisor: ${err.message}. Please try again later.`);
      setAdvice('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="advisor-title">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="advisor-title" className="text-2xl font-bold text-gray-800 sm:text-3xl">AI Protocol Advisor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Close Advisor">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-4 text-sm text-gray-600">Select your primary symptoms below. The AI will provide a general summary based on the protocols listed on this site (for informational purposes only).</p>
          <div className="flex flex-wrap gap-2">
            {allSymptoms.map((sym) => (
              <button
                key={sym}
                onClick={() => toggleSymptom(sym)}
                className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
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
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
             <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Analyzing... </>
          ) : 'Get AI Advice'}
        </button>

         {/* Display Error Message */}
         {error && (
             <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700">
                 {error}
             </div>
         )}

        {/* Display Advice */}
        {advice && !error && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-xl font-bold text-gray-800">Your Personalized Summary</h3>
            {/* Render advice with proper line breaks */}
            <div className="whitespace-pre-wrap text-sm text-gray-700 space-y-2">
                 {advice.split('\n').map((line, index) => (
                    line.trim() ? <p key={index}>{line}</p> : null // Render non-empty lines as paragraphs
                 ))}
            </div>
             <p className="mt-4 text-xs text-gray-500 italic">Remember: This AI summary is for informational purposes only. Discuss any treatment options with your healthcare provider.</p>
          </div>
        )}
      </div>
    </div>
  );
}


/* ---------------------------------------
    App Root (Main Component)
--------------------------------------- */
export default function App() {
  const [currentPage, setCurrentPage] = useState('list');
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [votes, setVotes] = useState({}); // { methodId: { likes: N, dislikes: M } }
  const [userVotes, setUserVotes] = useState({}); // { methodId: 'like' | 'dislike' }
  const [user, setUser] = useState(null); // Firebase auth user object or null
  const [authReady, setAuthReady] = useState(false); // Tracks if auth state has been checked
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('evidence'); // 'evidence' or 'likes'
  const [isAdmin, setIsAdmin] = useState(false); // Admin status

  // --- Effects ---

  // Initialize Auth Listener
  useEffect(() => {
    if (!auth) { // If Firebase didn't initialize, mark as ready and stop
      console.error("Firebase Auth not initialized. Cannot set up listener.");
      setAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // currentUser is null if logged out
      setAuthReady(true); // Mark auth as ready after first check
    });
    return () => unsubscribe(); // Cleanup on unmount
  }, []); // Run only once

  // Fetch Aggregate Votes
  useEffect(() => {
    if (!db) return; // Need DB
    const votesRef = collection(db, 'votes');
    const unsubscribe = onSnapshot(votesRef, (snapshot) => {
      const aggregateVotes = {};
       // Initialize all methods to ensure they appear even if they have 0 votes yet
       siboMethodsData.forEach(m => aggregateVotes[String(m.id)] = { likes: 0, dislikes: 0 });
      snapshot.forEach((doc) => {
        aggregateVotes[doc.id] = { // doc.id is the methodId
          likes: doc.data().likes || 0,
          dislikes: doc.data().dislikes || 0,
        };
      });
      setVotes(aggregateVotes);
    }, (error) => console.error("Error fetching aggregate votes:", error));
    return () => unsubscribe();
  }, [db]); // Depend on db

  // Fetch User's Votes
  useEffect(() => {
    if (user && db) { // Need logged-in user and DB
      const userVotesRef = collection(db, `users/${user.uid}/userVotes`);
      const unsubscribe = onSnapshot(userVotesRef, (snapshot) => {
        const currentUserVotes = {};
        snapshot.forEach((doc) => {
          currentUserVotes[doc.id] = doc.data().vote; // doc.id is methodId
        });
        setUserVotes(currentUserVotes);
      }, (error) => {
          console.error("Error fetching user votes:", error);
          setUserVotes({}); // Clear on error
      });
      return () => unsubscribe();
    } else {
      setUserVotes({}); // Clear votes if user logs out
    }
  }, [user, db]); // Depend on user and db

  // Check Admin Status
   useEffect(() => {
    // Only check if user is logged in (not anonymous) and db is ready
    if (user && !user.isAnonymous && db) {
      const checkAdminStatus = async () => {
        const adminRef = doc(db, 'admins', user.uid);
        try {
          const adminSnap = await getDoc(adminRef);
          setIsAdmin(adminSnap.exists()); // User is admin if doc /admins/{uid} exists
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false); // Assume not admin on error
        }
      };
      checkAdminStatus();
    } else {
      setIsAdmin(false); // Not admin if not logged in, anonymous, or db not ready
    }
  }, [user, db]); // Re-check when user changes


  // --- Event Handlers ---
  const handleSelectMethod = (id) => { setSelectedMethodId(id); setCurrentPage('detail'); };
  const handleBack = () => { setSelectedMethodId(null); setCurrentPage('list'); };
  const handleGoHome = () => handleBack();
  const handleSubmitMethod = () => setCurrentPage('submit');
  const handleFeedback = () => setCurrentPage('feedback');
  const handleOpenAdvisor = () => setIsAdvisorOpen(true);
  const handleCloseAdvisor = () => setIsAdvisorOpen(false);


  // --- Voting Logic (with sign-in prompt) ---
  const handleVote = async (id, voteType) => {
    if (!auth || !db) return; // Guard against uninitialized Firebase

    let currentUser = auth.currentUser;

    // Prompt non-anonymous sign-in if needed
    if (!currentUser || currentUser.isAnonymous) {
      if (window.confirm("Please sign in with Google to vote. Would you like to sign in now?")) {
        try {
           const result = await signInWithPopup(auth, googleProvider);
           currentUser = result.user; // Update currentUser after successful sign-in
           if (!currentUser) return; // Should not happen, but safeguard
         } catch (e) {
           console.error('Sign-in required for vote failed:', e);
           alert("Sign-in failed. Please try again to vote.");
           return; // Exit if sign-in fails or is cancelled
         }
      } else {
         return; // User chose not to sign in
      }
    }

    // --- Proceed with vote transaction ---
    const methodId = String(id);
    const userId = currentUser.uid;
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
        const previousVote = userVoteSnap.exists() ? userVoteSnap.data().vote : null;

        if (voteType === previousVote) { // Toggling vote off
          if (voteType === 'like') likes = Math.max(0, likes - 1);
          if (voteType === 'dislike') dislikes = Math.max(0, dislikes - 1);
          tx.delete(userVoteDocRef);
        } else { // New vote or changing vote
          if (previousVote === 'like') likes = Math.max(0, likes - 1); // Remove old vote impact
          if (previousVote === 'dislike') dislikes = Math.max(0, dislikes - 1);
          if (voteType === 'like') likes++; // Add new vote impact
          if (voteType === 'dislike') dislikes++;
          tx.set(userVoteDocRef, { vote: voteType });
        }
        tx.set(voteDocRef, { likes, dislikes }, { merge: true });
      });
    } catch (e) {
      console.error('Vote transaction failed: ', e);
      alert("Your vote could not be recorded. Please try again.");
    }
  };


  // --- Sorting ---
  const methods = siboMethodsData; // Base data
   const sortedMethods = [...methods].sort((a, b) => {
       if (sortOrder === 'likes') {
           const likesA = votes[String(a.id)]?.likes || 0;
           const likesB = votes[String(b.id)]?.likes || 0;
           return likesB - likesA; // Descending likes
       }
       // Default: 'evidence' sort
       const tierA = a.evidenceTier === 0 ? -1 : a.evidenceTier; // Tier 0 last
       const tierB = b.evidenceTier === 0 ? -1 : b.evidenceTier;
       return tierB - tierA; // Descending tier (higher number first, except 0)
   });

  const selectedMethod = methods.find((m) => m.id === selectedMethodId);

  // --- Render Logic ---

  // Handle Firebase Config Error
  if (!isFirebaseConfigValid()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 p-8">
        <div className="rounded-lg bg-white p-10 text-center shadow-xl border border-red-200">
          <h1 className="mb-4 text-2xl font-bold text-red-700">Configuration Error</h1>
          <p className="text-gray-700">
            Firebase configuration is missing or invalid. Please check environment variables.
          </p>
        </div>
      </div>
    );
  }

  // Handle Auth Loading State
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
         {/* Optional: Add a spinner component here */}
        <p className="text-lg font-medium text-gray-600 animate-pulse">Loading Community Hub...</p>
      </div>
    );
  }

  // --- Page Router ---
  const renderPage = () => {
    switch (currentPage) {
      case 'detail':
        return selectedMethod ? (
          <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} isAdmin={isAdmin} />
        ) : ( handleBack(), null ); // Go back if method somehow invalid
      case 'submit':
        return <SubmitMethodPage onBack={handleBack} user={user} />;
      case 'feedback':
        return <FeedbackPage onBack={handleBack} user={user} />;
      case 'list':
      default:
        return (
          <MethodListPage
            methods={sortedMethods}
            onSelectMethod={handleSelectMethod}
            onVote={handleVote}
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
    <div className="min-h-screen font-sans bg-gray-50 text-gray-900"> {/* Added base text color */}
      <Header
        user={user}
        onGoHome={handleGoHome}
        onSubmitMethod={handleSubmitMethod}
        onFeedback={handleFeedback}
      />
      {isAdvisorOpen && (
        <GeminiAdvisor methods={methods} onClose={handleCloseAdvisor} />
      )}
      <main> {/* Wrap page content in main */}
        {renderPage()}
      </main>
    </div>
  );
}