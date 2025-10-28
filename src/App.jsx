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
  console.log("Firebase initialized successfully.");
} else {
  console.error(
    'Firebase configuration is missing or incomplete. Check environment variables.'
  );
}

/* ---------------------------------------
    Icons / small components
--------------------------------------- */
const ThumbsUpIcon = ({ isSelected }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 18.734V6a2 2 0 012-2h4a2 2 0 012 2v4z" />
  </svg>
);

const ThumbsDownIcon = ({ isSelected }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 5.266V18a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" />
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
      <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Understanding the Evidence Tiers</h2>
      <ul className="space-y-4">
        {tiers.map((item) => (
          <li key={item.tier} className="flex items-start">
            <div className="mr-4 mt-1 flex-shrink-0"><EvidenceTierBadge tier={item.tier} /></div>
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
      <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">What We See Across Success Stories</h2>
      <ul className="space-y-2 pl-6 text-gray-700 list-disc">
        {patterns.map((p) => <li key={p.title}><strong>{p.title}:</strong> {p.description}</li>)}
      </ul>
    </section>
  );
};

/* ---------------------------------------
    Audio section
--------------------------------------- */
const AudioSection = () => {
  const episodes = [{ title: 'SIBO Unpacked: Your Gut Detective Guide', src: 'https://firebasestorage.googleapis.com/v0/b/sibo-recovery-app.firebasestorage.app/o/SIBO%20Unpacked_%20Your%20Gut%20Detective%20Guide%20to%20Bloating%2C%20Pain%2C%20and%20Personalized%20Healing.mp3?alt=media&token=136277f0-b710-4f2c-91d2-5b889ca1b4e8' }];
  if (!episodes.length) return null;
  return (
    <section className="mx-auto mt-16 max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Audio: Stories & Tips</h2>
      <ul className="space-y-4">
        {episodes.map((ep) => (
          <li key={ep.src} className="rounded-lg border bg-gray-50 p-4">
            <p className="mb-2 font-semibold">{ep.title}</p>
            <audio controls className="w-full" preload="metadata"><source src={ep.src} type="audio/mpeg" />Your browser does not support the audio element.</audio>
            <p className="mt-2 text-xs text-gray-500 italic">Note: This content is AI-generated for educational purposes.</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

/* ---------------------------------------
    Methods data (FULL VERSION RESTORED)
--------------------------------------- */
const siboMethodsData = [
  {
    id: 2,
    title: 'Rifaximin (Pharmaceutical) Protocol',
    summary: 'Utilizes the prescription antibiotic Rifaximin as the primary means of eradicating the bacterial overgrowth; may be paired for methane cases.',
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
    summary: 'Botanical protocols in cycles; blends such as berberine, oregano, allicin are commonly used (watch sensitivities).',
    evidenceTier: 2,
    commonSymptoms: ['Bloating', 'Gas', 'Abdominal pain'],
    citation: { text: 'Pilot/smaller studies; consult clinician.', url: '' }, // Add specific study URL if available
    sampleDay: {
      title: 'Illustrative Day (Herbal Protocol)',
      schedule: [
        { time: 'Morning', action: 'Take herbal dose as directed (e.g., before breakfast). Breakfast later.' },
        { time: 'Afternoon', action: 'Second dose as directed (e.g., before lunch). Light walk.' },
        { time: 'Evening', action: 'Third dose if required. Wind down; note symptoms.' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Foundation (Optional)', steps: [{ title: 'Dietary Baseline', description: 'Simplify diet, remove known triggers, hydrate well.' }] },
      { phase: 'Phase 2 — Active Treatment (e.g., 4-6 weeks)', steps: [{ title: 'Cycle Antimicrobials', description: 'Follow clinician\'s plan (e.g., specific herbs, dosage, duration). Track symptoms meticulously.' }] },
      { phase: 'Phase 3 — Maintenance & Prevention', steps: [{ title: 'Reassess & Plan', description: 'Evaluate symptom improvement. Discuss next steps (e.g., prokinetics, diet) with clinician.' }] },
    ],
  },
   {
    id: 4,
    title: 'Elemental Diet (Short Course, supervised)',
    summary: 'Nutritionally complete, pre-digested liquid formula used exclusively for 14-21 days to starve bacteria while nourishing the patient.',
    evidenceTier: 1, // Strong evidence for breath test normalization
    commonSymptoms: ['Bloating', 'Abdominal pain', 'Diarrhea', 'Severe/Stubborn Cases', 'When other treatments fail'],
    citation: { text: 'Pimentel et al. 2004 showed high efficacy (80%+) in normalizing breath tests.', url: 'https://pubmed.ncbi.nlm.nih.gov/14992438/' },
    sampleDay: {
      title: 'Illustrative Day (Elemental Diet)',
      schedule: [
        { time: 'Throughout Day', action: 'Sip prescribed amount of formula slowly over the day. Drink plenty of water between "meals".' },
        { time: 'Movement', action: 'Gentle movement like walking is encouraged.' },
        { time: 'Avoid', action: 'Strictly avoid all other food, drinks (except water/plain tea), gum, etc.' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Preparation', steps: [{ title: 'Plan Duration', description: 'Typically 14 days, sometimes 21, decided with clinician.' }, {title: 'Obtain Formula', description: 'Choose formula type (e.g., Physicians\' Elemental, Absorb Plus) with clinician guidance.'}] },
      { phase: 'Phase 2 — Active (14-21 days)', steps: [{ title: 'Exclusive Use', description: 'Consume only the formula and water. Follow mixing instructions precisely.' }, {title: 'Monitor', description: 'Track symptoms, energy levels, potential die-off reactions.'}] },
      { phase: 'Phase 3 — Reintroduction', steps: [{ title: 'Gradual Foods', description: 'Very slowly reintroduce simple, well-cooked foods one at a time over several days/weeks, monitoring reactions.' }] },
    ],
  },
  {
    id: 5,
    title: 'Prokinetic & Meal Spacing',
    summary: 'Focus on stimulating the Migrating Motor Complex (MMC) - the gut\'s cleaning wave - through medication/herbs and timed gaps between meals.',
    evidenceTier: 2,
    commonSymptoms: ['Bloating', 'Fullness', 'Constipation', 'Relapse Prevention'],
    citation: { text: 'Physiology-based strategy. Agent evidence varies (e.g., Prucalopride has RCTs). Ginger/Artichoke combo has smaller studies.', url: '' }, // Add URLs if specific agents are focused
    sampleDay: {
      title: 'Illustrative Day (Motility Focus)',
      schedule: [
        { time: 'Morning (e.g., 8 AM)', action: 'Balanced breakfast. Start 4-5 hour timer.' },
        { time: 'Afternoon (e.g., 1 PM)', action: 'Lunch after 4-5 hour gap. Start timer again.' },
        { time: 'Evening (e.g., 6 PM)', action: 'Dinner after 4-5 hour gap.' },
        { time: 'Bedtime (e.g., 10 PM)', action: 'Take prokinetic (if prescribed) on empty stomach (at least 3-4 hours after dinner). Ensure 12+ hour overnight fast.' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Establish Meal Timing', steps: [{ title: 'Consistent Gaps', description: 'Aim for 4-5 hours between meals during the day. Strictly no snacking.' }, {title: 'Overnight Fast', description: 'Ensure at least 12 hours between dinner and breakfast.'}] },
      { phase: 'Phase 2 — Add Prokinetic Support', steps: [{ title: 'Agent Selection', description: 'Discuss options (Rx: Prucalopride, LDN, Erythromycin; Herbal: Ginger/Artichoke, Iberogast) with clinician.' }, {title: 'Optimal Timing', description: 'Usually taken at bedtime on an empty stomach to enhance overnight MMC activity.'}] },
      { phase: 'Phase 3 — Long-Term Maintenance', steps: [{ title: 'Monitor & Adjust', description: 'Continue meal spacing. Adjust prokinetic type/dose with clinician based on response.' }] },
    ],
  },
  {
    id: 6,
    title: 'Low-FODMAP Diet (Short-term)',
    summary: 'A temporary diagnostic diet involving eliminating fermentable carbs (FODMAPs) then systematically reintroducing them to identify personal triggers for IBS-like symptoms.',
    evidenceTier: 2, // Strong evidence for IBS symptom relief, adapted for SIBO symptom management
    commonSymptoms: ['Bloating', 'Gas', 'Abdominal pain', 'Diarrhea'],
    citation: { text: 'Extensive research in IBS (Monash University). Used short-term for SIBO symptom control, not a root cause treatment.', url: 'https://www.monashfodmap.com/about-fodmap-and-ibs/' },
    sampleDay: {
      title: 'Illustrative Day (Low-FODMAP Elimination)',
      schedule: [
        { time: 'Breakfast', action: 'Scrambled eggs with spinach, portion of gluten-free toast with minimal safe topping.' },
        { time: 'Lunch', action: 'Grilled chicken salad with approved greens (lettuce, cucumber, carrot), olive oil/lemon dressing.' },
        { time: 'Dinner', action: 'Baked salmon, steamed green beans, measured portion of rice.' },
        { time: 'Snacks (if needed)', action: 'Strictly low-FODMAP options in appropriate portions (e.g., handful of specific nuts, specific fruits).' }
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Elimination (Strict Phase: 2-6 weeks)', steps: [{ title: 'Avoid High-FODMAP Foods', description: 'Strictly follow a reliable Low-FODMAP guide (e.g., Monash app). Focus on allowed foods.' }] },
      { phase: 'Phase 2 — Reintroduction (Challenge Phase)', steps: [{ title: 'Systematic Testing', description: 'Reintroduce one FODMAP subgroup at a time, in increasing amounts over 3 days, monitoring symptoms carefully.' }] },
      { phase: 'Phase 3 — Personalization (Modified Diet)', steps: [{ title: 'Integrate Tolerated Foods', description: 'Build a long-term, diverse diet incorporating well-tolerated FODMAPs at personal threshold levels.' }] },
    ],
  },
   {
    id: 7,
    title: 'Stress, Sleep, and Movement Support',
    summary: 'Focuses on lifestyle factors influencing the gut-brain axis: stress management techniques, optimizing sleep quality, and incorporating appropriate physical activity.',
    evidenceTier: 3, // Broad health literature supports gut-brain connection
    commonSymptoms: ['Abdominal pain', 'Bloating', 'General wellbeing', 'Gut-Brain Axis Dysfunction', 'Increased symptom perception'],
    citation: { text: 'Gut-brain axis research highlights the impact of stress, sleep, and nervous system state on GI function and symptoms.', url: '' }, // Add relevant review article if found
    sampleDay: {
      title: 'Illustrative Day (Lifestyle Support)',
      schedule: [
        { time: 'Morning', action: 'Gentle movement (e.g., 20-min walk, yoga, stretching). Mindful breakfast, seated and calm.' },
        { time: 'Midday', action: 'Short stress-reduction break (e.g., 5-10 min deep breathing, meditation app, brief walk outside).' },
        { time: 'Evening', action: 'Consistent wind-down routine 1 hour before bed (e.g., dim lights, warm bath, reading, avoid screens/stressful content).' },
        { time: 'Sleep', action: 'Aim for 7-9 hours of consistent, quality sleep in a cool, dark, quiet room.' },
      ],
    },
    protocol: [
      { phase: 'Phase 1 — Awareness & Assessment', steps: [{ title: 'Identify Stressors', description: 'Note daily stressors and common reactions.' }, { title: 'Track Sleep', description: 'Log bedtime, wake time, perceived sleep quality.' }, { title: 'Assess Movement', description: 'Note current activity levels and types.' }] },
      { phase: 'Phase 2 — Implement Small Changes', steps: [{ title: 'Daily Stress Reduction', description: 'Schedule brief daily practice (meditation, breathing, mindfulness).' }, { title: 'Improve Sleep Hygiene', description: 'Establish consistent sleep schedule, optimize bedroom environment.' }, { title: 'Incorporate Gentle Movement', description: 'Start with regular low-impact activity (walking, yoga, tai chi).' }] },
      { phase: 'Phase 3 — Maintain & Refine', steps: [{ title: 'Consistency is Key', description: 'Maintain habits. Observe impact on symptoms and well-being.' }, { title: 'Adapt as Needed', description: 'Adjust techniques based on what provides the most benefit.' }] },
    ],
  },
];
/* ---------------------------------------
    *** END OF FULL SIBO METHODS DATA ***
--------------------------------------- */

/* ---------------------------------------
    Header Component
--------------------------------------- */
function Header({ user, onGoHome, onSubmitMethod, onFeedback }) { /* ... (Keep Full Header Code) ... */ return <header>...</header>; }

/* ---------------------------------------
    Method Card Component (Full)
--------------------------------------- */
const MethodCard = ({ method, onSelect, onVote, votes, userVote }) => { /* ... (Keep Full MethodCard Code) ... */ return <div>...</div>; }

/* ---------------------------------------
    Method List Page Component (Full)
--------------------------------------- */
const MethodListPage = ({ methods, onSelectMethod, onVote, votes, userVotes, onSortChange, onOpenAdvisor }) => { /* ... (Keep Full MethodListPage Code) ... */ return <div>...</div>; }

/* ---------------------------------------
    Detail Page Component (Full)
--------------------------------------- */
const MethodDetailPage = ({ method, onBack, user, isAdmin }) => { /* ... (Keep Full MethodDetailPage Code) ... */ return <div>...</div>; }

/* ---------------------------------------
    Nickname Helpers (Keep As Is)
--------------------------------------- */
const ADJECTIVES = ['Calm','Brave','Swift','Sunny','Kind','Bright','Lucky','Quiet','Clever','Silver', 'Gentle', 'Wise', 'Bold', 'Merry', 'Sturdy'];
const ANIMALS    = ['Otter','Falcon','Panda','Koala','Fox','Dolphin','Lynx','Finch','Turtle','Bear', 'Badger', 'Eagle', 'Rabbit', 'Wolf', 'Deer'];
function generateNickname(uid = '') { /* ... (Keep As Is) ... */ }
async function getOrCreateNickname(db, uid) { /* ... (Keep As Is) ... */ }

/* ---------------------------------------
    Comments Component (Full)
--------------------------------------- */
function CommentsSection({ methodId, user, isAdmin }) { /* ... (Keep Full CommentsSection Code) ... */ return <section>...</section>; }

/* ---------------------------------------
    Submit & Feedback Page Components (Full)
--------------------------------------- */
function SubmitMethodPage({ onBack, user }) { /* ... (Keep Full SubmitMethodPage Code) ... */ return <div>...</div>; }
function FeedbackPage({ onBack, user }) { /* ... (Keep Full FeedbackPage Code) ... */ return <div>...</div>; }

/* ---------------------------------------
    Gemini Advisor Component (Full)
--------------------------------------- */
function GeminiAdvisor({ methods, onClose }) { /* ... (Keep Full GeminiAdvisor Code) ... */ return <div>...</div>; }


/* ---------------------------------------
    App Root Component (Full - with ErrorBoundary)
--------------------------------------- */
// Simple Error Boundary Component (Add this above your App component)
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("ErrorBoundary caught an error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center bg-red-50 text-red-700">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                    <p>Please try refreshing the page or contact support if the problem persists.</p>
                    {/* Optionally display simplified error in dev mode */}
                    {process.env.NODE_ENV === 'development' && (
                        <pre className="mt-4 text-xs text-left bg-red-100 p-2 overflow-auto">{this.state.error?.toString()}</pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

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
  const [showFirebaseNotice, setShowFirebaseNotice] = useState(!isFirebaseConfigValid());


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
  const handleVote = async (id, voteType) => { /* ... (Keep Full Voting Logic As Is) ... */ if (!auth || !db) return; let currentUser = auth.currentUser; if (!currentUser || currentUser.isAnonymous) { if(window.confirm("Sign in with Google to vote?")){ try { currentUser = (await signInWithPopup(auth, googleProvider)).user; if(!currentUser) return; } catch(e){ console.error(e); return; } } else { return; } } const methodId = String(id); const userId = currentUser.uid; const voteDocRef = doc(db, 'votes', methodId); const userVoteDocRef = doc(db, `users/${userId}/userVotes`, methodId); try { await runTransaction(db, async tx => { const [vSnap, uVSnap] = await Promise.all([tx.get(voteDocRef), tx.get(userVoteDocRef)]); let {likes=0, dislikes=0} = vSnap.data() || {}; const prev = uVSnap.data()?.vote; if(prev==='like') likes=Math.max(0,likes-1); if(prev==='dislike') dislikes=Math.max(0,dislikes-1); if(voteType!==prev){ if(voteType==='like') likes++; if(voteType==='dislike') dislikes++; tx.set(userVoteDocRef,{vote:voteType}); } else { tx.delete(userVoteDocRef); } tx.set(voteDocRef, {likes,dislikes}, {merge:true}); }); } catch(e){ console.error("Vote tx failed:", e); alert("Vote failed."); } };


  // --- Data & Sorting ---
  const methods = siboMethodsData; // Use the full data defined above
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

  // Config Error Check (Handled by showFirebaseNotice)

  // Auth Loading Check
  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100"><p className="animate-pulse text-lg font-medium text-gray-600">Loading...</p></div>;
  }

  // Page Router
  const renderPage = () => {
     // If Firebase isn't configured, always show limited list page
     if (!isFirebaseConfigValid()) {
         return <MethodListPage methods={sortedMethods} onSelectMethod={() => alert("Details unavailable in limited mode.")} onVote={()=>{}} votes={{}} userVotes={{}} onSortChange={()=>{}} onOpenAdvisor={() => alert("Advisor unavailable.")} />;
     }

    // Normal routing if Firebase is configured
    switch (currentPage) {
      case 'detail': return selectedMethod ? <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} isAdmin={isAdmin} /> : (handleBack(), null);
      case 'submit': return <SubmitMethodPage onBack={handleBack} user={user} />;
      case 'feedback': return <FeedbackPage onBack={handleBack} user={user} />;
      case 'list': default: return <MethodListPage methods={sortedMethods} onSelectMethod={handleSelectMethod} onVote={handleVote} votes={votes} userVotes={userVotes} onSortChange={setSortOrder} onOpenAdvisor={handleOpenAdvisor} />;
    }
  };


  // --- Final Render ---
  return (
    <ErrorBoundary> {/* Wrap root */}
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <Header user={user} onGoHome={handleGoHome} onSubmitMethod={handleSubmitMethod} onFeedback={handleFeedback} />
         {showFirebaseNotice && (
            <div className="mx-auto mt-4 mb-4 max-w-6xl rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-900" role="alert">
                ⚠️ Limited mode: Firebase is not configured correctly. Voting, comments, submissions, and AI features are disabled. Please verify environment variables in Netlify build settings.
            </div>
         )}
        {isAdvisorOpen && <GeminiAdvisor methods={methods} onClose={handleCloseAdvisor} />}
        <main>{renderPage()}</main>
        </div>
    </ErrorBoundary>
  );
}