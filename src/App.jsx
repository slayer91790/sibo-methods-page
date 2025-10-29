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
   Audio section (placeholder)
--------------------------------------- */
const AudioSection = () => {
  const episodes = []; // e.g., [{ title: 'Episode 1', src: '/audio/ep1.mp3' }]
  if (!episodes.length) return null;
  return (
    <section className="max-w-4xl mx-auto mt-16 p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Audio: Stories & Tips</h2>
      <ul className="space-y-4">
        {episodes.map((ep) => (
          <li key={ep.src} className="p-4 rounded-lg border bg-gray-50">
            <p className="font-semibold mb-2">{ep.title}</p>
            <audio controls className="w-full">
              <source src={ep.src} type="audio/mpeg" />
            </audio>
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
    evidenceTier: 1,
    commonSymptoms: ['Bloating', 'Abdominal pain', 'Diarrhea'],
    citation: { text: 'Discuss with clinician; evidence for symptom improvement in some cohorts.', url: '' },
    sampleDay: {
      title: 'Illustrative day',
      schedule: [
        { time: 'Morning', action: 'Prepared formula, hydration, gentle movement' },
        { time: 'Midday', action: 'Formula portion, rest, light activity' },
        { time: 'Evening', action: 'Formula portion, wind down, sleep hygiene' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Preparation', steps: [{ title: 'Overview', description: 'Plan duration with clinician.' }] },
      { phase: 'Phase 2 — Active', steps: [{ title: 'Follow schedule', description: 'Use formula per plan; monitor.' }] },
      { phase: 'Phase 3 — Reintroduction', steps: [{ title: 'Gradual foods', description: 'Reintroduce while tracking.' }] },
    ],
  },
  {
    id: 5,
    title: 'Prokinetic & Meal Spacing',
    summary: 'Focus on motility support and spacing meals to support MMC.',
    evidenceTier: 2,
    commonSymptoms: ['Bloating', 'Fullness', 'Constipation'],
    citation: { text: 'Physiology-informed strategy; agent-specific evidence varies.', url: '' },
    sampleDay: {
      title: 'Illustrative day',
      schedule: [
        { time: 'Morning', action: 'Balanced breakfast; space next meal ~4+ hrs if appropriate' },
        { time: 'Afternoon', action: 'Light movement; hydration' },
        { time: 'Evening', action: 'Dinner; wind down; sleep hygiene' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Baseline', steps: [{ title: 'Spacing', description: 'Aim for meal spacing (as tolerated).' }] },
      { phase: 'Phase 2 — Support', steps: [{ title: 'Prokinetic', description: 'Discuss options with clinician.' }] },
      { phase: 'Phase 3 — Review', steps: [{ title: 'Reassess', description: 'Fine-tune with support as needed.' }] },
    ],
  },
  {
    id: 6,
    title: 'Low-FODMAP (Short-term symptom management)',
    summary:
      'Structured elimination/reintroduction to identify triggers; short-term symptom tool.',
    evidenceTier: 2,
    commonSymptoms: ['Bloating', 'Gas', 'Abdominal pain'],
    citation: { text: 'IBS symptom research; adapt for SIBO context with clinician.', url: '' },
    sampleDay: {
      title: 'Illustrative day',
      schedule: [
        { time: 'Morning', action: 'Low-FODMAP breakfast' },
        { time: 'Afternoon', action: 'Hydration; walk' },
        { time: 'Evening', action: 'Low-FODMAP dinner; notes' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Elimination', steps: [{ title: 'Short-term plan', description: 'Limit high-FODMAP foods briefly.' }] },
      { phase: 'Phase 2 — Reintroduction', steps: [{ title: 'Systematic testing', description: 'Reintroduce groups one at a time.' }] },
      { phase: 'Phase 3 — Personalization', steps: [{ title: 'Sustain', description: 'Build a long-term, diverse diet.' }] },
    ],
  },
  {
    id: 7,
    title: 'Stress, Sleep, and Movement Support',
    summary:
      'Lifestyle pillars that influence GI symptoms: stress reduction, sleep quality, and gentle movement.',
    evidenceTier: 3,
    commonSymptoms: ['Abdominal pain', 'Bloating', 'General wellbeing'],
    citation: { text: 'Broad health literature supports these areas; specifics vary.', url: '' },
    sampleDay: {
      title: 'Illustrative day',
      schedule: [
        { time: 'Morning', action: 'Light movement or walk' },
        { time: 'Afternoon', action: 'Short stress-reduction session' },
        { time: 'Evening', action: 'Wind-down routine for sleep' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Assess', steps: [{ title: 'Identify habits', description: 'Note stressors and sleep patterns.' }] },
      { phase: 'Phase 2 — Build', steps: [{ title: 'Small changes', description: 'Add gentle daily habits.' }] },
      { phase: 'Phase 3 — Maintain', steps: [{ title: 'Track & adjust', description: 'Iterate based on what helps.' }] },
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
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error('Anon sign-in failed:', err);
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
        <button onClick={onGoHome} className="text-xl font-extrabold tracking-tight">
          SIBO Recovery
        </button>
        <nav className="flex items-center gap-3">
          <button
            onClick={onSubmitMethod}
            className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm"
          >
            Submit
          </button>
          <button
            onClick={onFeedback}
            className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-sm"
          >
            Feedback
          </button>
          {user ? (
            <button
              disabled={busy}
              onClick={doSignOut}
              className="px-3 py-1.5 rounded-md border text-sm"
            >
              Sign out
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={doGoogleSignIn}
              className="px-3 py-1.5 rounded-md border text-sm"
            >
              Sign in
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
        className="mt-6 transform rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl"
      >
        ✨ Get Help from AI Protocol Advisor
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
        />
      ))}
    </div>

    <AiPatternAnalysis />
    <AudioSection />
    <EvidenceTierExplanation />

    <footer className="mt-12 px-4 text-center text-sm text-gray-500">
      <p>
        This site is for educational purposes only and is not medical advice. Always consult a qualified healthcare
        professional.
      </p>
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
      className="mb-8 flex items-center font-semibold text-blue-600 hover:text-blue-800"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2 h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to All Methods
    </button>

    <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
      {method.title}
    </h1>

    <div className="mb-8 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
      <h3 className="mb-2 text-lg font-bold">Evidence & Research</h3>
      <div className="mb-2">
        <EvidenceTierBadge tier={method.evidenceTier} />
      </div>
      <p className="text-sm">{method.citation.text}</p>
      {method.citation.url && (
        <a
          href={method.citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline"
        >
          View Study →
        </a>
      )}
    </div>

    {method.commonSymptoms && (
      <div className="mb-8">
        <h3 className="mb-2 text-lg font-bold text-gray-800">
          Best For These Symptoms:
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
      </div>
    )}

    {method.sampleDay && (
      <div className="mb-8 rounded-lg bg-gray-100 p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-800">
          {method.sampleDay.title}
        </h3>
        <dl className="space-y-4">
          {method.sampleDay.schedule.map((item, index) => (
            <div key={index} className="flex">
              <dt className="w-1/3 font-semibold text-gray-700">{item.time}:</dt>
              <dd className="w-2/3 text-gray-600">{item.action}</dd>
            </div>
          ))}
        </dl>
      </div>
    )}

    <p className="mb-8 text-lg text-gray-600">{method.summary}</p>

    {/* Phases */}
    <div className="space-y-8">
      {method.protocol.map((phase, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
          <div className="border-b border-gray-200 bg-gray-100 p-4">
            <h2 className="text-2xl font-bold text-gray-800">{phase.phase}</h2>
          </div>
          <div className="space-y-6 p-6">
            {phase.steps.map((step, j) => (
              <div key={j}>
                <h4 className="mb-2 text-xl font-semibold text-gray-700">{step.title}</h4>
                {step.description && (
                  <p className="mb-3 text-gray-600">{step.description}</p>
                )}
                {step.items && (
                  <ul className="list-inside list-disc space-y-1 pl-4 text-gray-600">
                    {step.items.map((item, k) => (
                      <li key={k}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <CommentsSection methodId={method.id} user={user} isAdmin={isAdmin} />
  </div>
);

/* ---------------------------------------
   NICKNAMES helpers
--------------------------------------- */
const ADJECTIVES = ['Calm','Brave','Swift','Sunny','Kind','Bright','Lucky','Quiet','Clever','Silver'];
const ANIMALS    = ['Otter','Falcon','Panda','Koala','Fox','Dolphin','Lynx','Finch','Turtle','Bear'];

function generateNickname(uid = '') {
  const a = ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(Math.random()*ANIMALS.length)];
  const tag = uid.slice(-4) || String(Math.floor(Math.random()*9999)).padStart(4,'0');
  return `${a} ${b} #${tag}`;
}

async function getOrCreateNickname(db, uid) {
  const uref = doc(db, 'users', uid);
  const snap = await getDoc(uref);
  if (snap.exists() && snap.data()?.nickname) return snap.data().nickname;
  const nickname = generateNickname(uid);
  await setDoc(uref, { nickname }, { merge: true });
  return nickname;
}

/* ---------------------------------------
   Comments (pseudonyms + edit/delete + admin delete)
--------------------------------------- */
function CommentsSection({ methodId, user, isAdmin }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (!db) return;
    const qref = query(collection(db, `methods/${methodId}/comments`), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(
      qref,
      (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), 
      (err) => { console.error(err); setError('Could not load comments.'); }
    );
    return () => unsub();
  }, [methodId]);

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { console.error(e); try { await signInAnonymously(auth);} catch {} }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !db) return;
    try {
      const nickname = await getOrCreateNickname(db, user.uid);
      await addDoc(collection(db, `methods/${methodId}/comments`), {
        text: newComment.trim(),
        nickname,
        userId: user.uid,
        timestamp: serverTimestamp(),
      });
      setNewComment('');
    } catch (err) {
      console.error(err);
      setError('Failed to post comment. Please try again.');
    }
  };

  const startEdit = (c) => { setEditingId(c.id); setEditText(c.text); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      await updateDoc(doc(db, `methods/${methodId}/comments`, editingId), {
        text: editText.trim(),
        editedAt: serverTimestamp(),
      });
      cancelEdit();
    } catch (e) {
      console.error(e);
      setError('Failed to save changes.');
    }
  };

  const remove = async (id) => {
    if (!user) return;
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, `methods/${methodId}/comments`, id));
    } catch (e) {
      console.error(e);
      setError('Failed to delete comment.');
    }
  };

  const canEdit = (c) => user && c.userId === user.uid;
  const canDelete = (c) => (user && c.userId === user.uid) || isAdmin;

  return (
    <div className="mt-12">
      <h2 className="mb-6 text-2xl font-bold text-gray-800">Community Discussion</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        {user ? (
          <form onSubmit={handleSubmit} className="mb-6">
            <textarea
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              rows="4"
              placeholder="Share your experience with this method..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
              disabled={!newComment.trim()}
            >
              Post Comment
            </button>
          </form>
        ) : (
          <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
            <p className="text-gray-600">
              Want to share your experience?{' '}
              <button onClick={handleGoogleSignIn} className="font-semibold text-blue-600 hover:underline">
                Sign in with Google
              </button>{' '}
              to join the discussion.
            </p>
          </div>
        )}

        {error && <p className="mb-4 text-red-500">{error}</p>}

        <div className="space-y-6">
          {comments.length > 0 ? (
            comments.map((c) => (
              <div key={c.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {c.nickname || `User #${(c.userId || '').slice(-4)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleString() : 'Just now'}
                      {c.editedAt ? ' • edited' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {canEdit(c) && (
                      <button onClick={() => startEdit(c)} className="text-sm text-blue-600 hover:underline">
                        Edit
                      </button>
                    )}
                    {canDelete(c) && (
                      <button onClick={() => remove(c.id)} className="text-sm text-red-600 hover:underline">
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {editingId === c.id ? (
                  <div className="mt-3">
                    <textarea
                      className="w-full rounded-lg border border-gray-300 p-3"
                      rows="3"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="mt-2 flex gap-2">
                      <button onClick={saveEdit} className="rounded bg-green-600 px-3 py-1 text-white">Save</button>
                      <button onClick={cancelEdit} className="rounded bg-gray-200 px-3 py-1">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-gray-700">{c.text}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500">No comments yet. Be the first to share your experience!</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------
   Submit & Feedback Pages
--------------------------------------- */
function SubmitMethodPage({ onBack, user }) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    sourceLink: '',
    symptoms: '',
    protocol: '',
    sampleDay: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'submissions'), {
        ...formData,
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
      });
      alert('Thank you for your submission! It will be reviewed shortly.');
      onBack();
    } catch (error) {
      console.error('Error submitting form: ', error);
      alert('Sorry, there was an error submitting your form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
        <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Submit a Method
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          Please{' '}
          <button
            onClick={async () => {
              if (auth && googleProvider) {
                try {
                  await signInWithPopup(auth, googleProvider);
                } catch (error) {
                  console.error('Google sign-in failed:', error);
                }
              }
            }}
            className="font-semibold text-blue-600 hover:underline"
          >
            sign in with Google
          </button>{' '}
          to submit a new method. This helps us keep the submissions genuine.
        </p>
        <button onClick={onBack} className="font-semibold text-blue-600 hover:text-blue-800">
          Back to All Methods
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <button
        onClick={onBack}
        className="mb-8 flex items-center font-semibold text-blue-600 hover:text-blue-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to All Methods
      </button>

      <h1 className="mb-6 text-3xl font-extrabold text-gray-900 sm:text-4xl">
        Submit a New Recovery Method
      </h1>
      <p className="mb-8 text-gray-600">
        Thank you for contributing to the community! Please provide as much detail as
        possible. Your submission will be reviewed before being published.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Method Title
          </label>
          <input
            type="text"
            name="title"
            id="title"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., Low-Dose Naltrexone (LDN) Protocol"
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
            Short Summary
          </label>
          <textarea
            name="summary"
            id="summary"
            rows="3"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Briefly describe the method and its main principle."
            value={formData.summary}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="sourceLink" className="block text-sm font-medium text-gray-700">
            Link to Source (Optional)
          </label>
          <input
            type="url"
            name="sourceLink"
            id="sourceLink"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., Reddit post, blog, or article URL"
            value={formData.sourceLink}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">
            What symptoms is this method best for?
          </label>
          <textarea
            name="symptoms"
            id="symptoms"
            rows="3"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., Methane-dominant SIBO, Chronic Constipation, Brain Fog"
            value={formData.symptoms}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="protocol" className="block text sm font-medium text-gray-700">
            Full Protocol Details
          </label>
          <textarea
            name="protocol"
            id="protocol"
            rows="8"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Describe the phases and steps in detail. Include timing and duration."
            value={formData.protocol}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="sampleDay" className="block text-sm font-medium text-gray-700">
            A Sample Day
          </label>
          <textarea
            name="sampleDay"
            id="sampleDay"
            rows="5"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Describe a typical day following this protocol from morning to night."
            value={formData.sampleDay}
            onChange={handleChange}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full justify-center rounded-md bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim() || !user || !db) return;
    setIsSubmitting(true);
    try {
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

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
        <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Submit Feedback
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          Please{' '}
          <button
            onClick={async () => {
              if (auth && googleProvider) {
                try {
                  await signInWithPopup(auth, googleProvider);
                } catch (error) {
                  console.error('Google sign-in failed:', error);
                }
              }
            }}
            className="font-semibold text-blue-600 hover:underline"
          >
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
      <button
        onClick={onBack}
        className="mb-8 flex items-center font-semibold text-blue-600 hover:text-blue-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mr-2 h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to All Methods
      </button>
      <h1 className="mb-6 text-3xl font-extrabold text-gray-900 sm:text-4xl">
        Share Your Feedback
      </h1>
      <p className="mb-8 text-gray-600">
        Have an idea to improve the site? Found a bug? Let us know! Your feedback helps make this a better resource for the community.
      </p>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md"
      >
        <div>
          <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
            Your Feedback
          </label>
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
            disabled={isSubmitting}
            className="w-full justify-center rounded-md bg-purple-600 py-2 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------------
   Gemini Advisor
--------------------------------------- */
function GeminiAdvisor({ methods, onClose }) {
  const baseSymptoms = [
    'Constipation','Diarrhea','Bloating','Gas','Abdominal pain',
    'Nausea','Belching','Brain fog','Fullness','Reflux/Heartburn'
  ];
  const allSymptoms = [
    ...new Set([...baseSymptoms, ...methods.flatMap((m) => m.commonSymptoms || [])]),
  ];
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [advice, setAdvice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleSymptom = (sym) =>
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );

  const getAdvice = async () => {
    if (selectedSymptoms.length === 0) {
      setAdvice('Please select at least one symptom to get advice.');
      return;
    }
    setIsLoading(true);
    setAdvice('');

    const simplified = methods.map((m) => ({
      title: m.title,
      summary: m.summary,
      evidenceTier: m.evidenceTier,
      commonSymptoms: m.commonSymptoms,
    }));

    const systemPrompt = `You are an AI assistant for a SIBO recovery website. Your role is to provide a helpful, non-medical summary based on user-reported symptoms and a list of community-sourced treatment protocols.

IMPORTANT RULES:
1. DO NOT PROVIDE MEDICAL ADVICE. Start every single response with this exact disclaimer: "This is not medical advice. Always consult with a qualified healthcare professional before starting any new treatment."
2. Analyze the user's selected symptoms and the provided list of protocols.
3. Identify which protocols are most relevant to the user's symptoms based on the 'commonSymptoms' listed for each protocol.
4. Summarize in 2-3 short paragraphs.
5. Mention the 'evidenceTier'.
6. Helpful, empathetic, strictly informational.
7. Do not invent information or suggest protocols not on the list.`;

    const userQuery = `My primary symptoms are: ${selectedSymptoms.join(
      ', '
    )}. Based on the following data, which protocols might be relevant for me to research further and discuss with my doctor?

Protocols Data:
${JSON.stringify(simplified, null, 2)}`;

    if (!GEMINI_API_KEY) {
      setAdvice(
        'Gemini API key is not configured. Set REACT_APP_GEMINI_API_KEY in your environment variables.'
      );
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
            systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userQuery }] }],
          }),
        }
      );

      if (!response.ok) throw new Error(`API call failed: ${response.status}`);

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join('\n');
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
}

/* ---------------------------------------
   App Root
--------------------------------------- */
export default function App() {
  const [currentPage, setCurrentPage] = useState('list');
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('evidence');
  const [isAdmin, setIsAdmin] = useState(false);

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

  // votes
  useEffect(() => {
    if (!db) return;
    const votesCollection = collection(db, 'votes');
    const unsub = onSnapshot(votesCollection, (snapshot) => {
      const data = {};
      (siboMethodsData || []).forEach((m) => (data[String(m.id)] = { likes: 0, dislikes: 0 }));
      snapshot.docs.forEach((d) => {
        data[d.id] = d.data();
      });
      setVotes(data);
    });
    return () => unsub();
  }, []);

  // user votes
  useEffect(() => {
    if (user && db) {
      const userId = user.uid;
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

  // admin check (admins/{uid} exists)
  useEffect(() => {
    if (!db || !user) { setIsAdmin(false); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(snap.exists());
      } catch (e) {
        console.error('admin check failed', e);
        setIsAdmin(false);
      }
    })();
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
        if (prev === 'like') likes = Math.max(0, likes - 1);
        if (prev === 'dislike') dislikes = Math.max(0, dislikes - 1);

        if (voteType !== prev) {
          if (voteType === 'like') likes++;
          if (voteType === 'dislike') dislikes++;
          tx.set(userVoteDocRef, { vote: voteType });
        } else {
          tx.delete(userVoteDocRef);
        }

        tx.set(voteDocRef, { likes, dislikes }, { merge: true });
      });
    } catch (e) {
      console.error('Transaction failed: ', e);
    }
  };

  const methods = siboMethodsData;

  const sortedMethods = [...methods].sort((a, b) => {
    if (sortOrder === 'likes') {
      const likesA = votes[a.id]?.likes || 0;
      const likesB = votes[b.id]?.likes || 0;
      return likesB - likesA;
    }
    const tierA = a.evidenceTier === 0 ? -1 : a.evidenceTier; // caution to bottom
    const tierB = b.evidenceTier === 0 ? -1 : b.evidenceTier;
    return tierB - tierA;
  });

  const selectedMethod = methods.find((m) => m.id === selectedMethodId);

  if (!isFirebaseConfigValid()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="rounded-lg bg-white p-10 text-center shadow-md">
          <h1 className="mb-4 text-2xl font-bold text-red-600">Configuration Error</h1>
          <p className="text-gray-700">
            Firebase configuration is missing. If you're the site owner, set environment
            variables in your hosting provider.
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

  const renderPage = () => {
    switch (currentPage) {
      case 'detail':
        if (!selectedMethod) {
          handleBack();
          return null;
        }
        return (
          <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} isAdmin={isAdmin} />
        );
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
            onOpenAdvisor={() => setIsAdvisorOpen(true)}
          />
        );
    }
  };

  return (
    <main className="min-h-screen font-sans bg-gray-50">
      <Header
        user={user}
        onGoHome={handleGoHome}
        onSubmitMethod={handleSubmitMethod}
        onFeedback={handleFeedback}
      />
      {isAdvisorOpen && (
        <GeminiAdvisor methods={methods} onClose={() => setIsAdvisorOpen(false)} />
      )}
      {renderPage()}
    </main>
  );
}
