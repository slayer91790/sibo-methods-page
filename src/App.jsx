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
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

const isFirebaseConfigValid = () =>
  firebaseConfig && Object.values(firebaseConfig).every(v => v && String(v).trim() !== '');

let app = null;
let db = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigValid()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase initialized successfully.");
  } catch(e) {
    console.error("Firebase initialization failed:", e);
  }
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
    { tier: 2, title: 'Tier 2: Promising Evidence', description: 'Supported by pilot or small studies; promising but needs more research.' },
    { tier: 3, title: 'Tier 3: Anecdotal / Case Report', description: 'Based on user experiences or case reports.' },
    { tier: 0, title: 'Caution: No Evidence / Potential Harm', description: 'No supportive evidence and/or potential harm.' },
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
    <section className="mx-auto mt-16 max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-md">
      <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
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
  const episodes = [
    { 
      title: 'SIBO Unpacked: Your Gut Detective Guide', 
      src: 'https://firebasestorage.googleapis.com/v0/b/sibo-recovery-app.firebasestorage.app/o/SIBO%20Unpacked_%20Your%20Gut%20Detective%20Guide%20to%20Bloating%2C%20Pain%2C%20and%20Personalized%20Healing.mp3?alt=media&token=136277f0-b710-4f2c-91d2-5b889ca1b4e8' 
    }
  ];
  if (!episodes.length) return null;
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
   Methods data
--------------------------------------- */
const siboMethodsData = [
  {
    id: 2,
    title: 'Rifaximin-Based Pharmaceutical Protocol',
    summary:
      'Targeted, gut-specific antibiotics (Rifaximin ± a pairing antibiotic for methane cases) to reduce bacterial load with minimal systemic effects.',
    evidenceTier: 1, 
    commonSymptoms: [
      'Hydrogen-dominant SIBO',
      'Diarrhea',
      'Methane/IMO (with pairing)',
      'Bloating',
      'Gas'
    ],
    citation: {
      text:
        'Clinical use of rifaximin for SIBO/IBS; pairing with neomycin or metronidazole often used for methane/IMO.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/21182358/'
    },
    sampleDay: {
      title: 'Sample day (during 14-day course)',
      schedule: [
        { time: 'Morning',  action: 'Rifaximin 550 mg; add PHGG 5 g with the dose if recommended.' },
        { time: 'Midday',   action: 'Rifaximin 550 mg; light movement; balanced lunch.' },
        { time: 'Evening',  action: 'Rifaximin 550 mg (± neomycin 500 mg if methane/IMO); symptom notes.' }
      ]
    },
    protocol: [
      {
        phase: 'Phase 1 — Antibiotic Treatment (≈14 days)',
        steps: [
          { title: 'Hydrogen-dominant SIBO', items: ['Rifaximin 550 mg, three times daily.'] },
          { title: 'Methane-dominant / IMO', items: ['Rifaximin 550 mg, three times daily', 'PLUS Neomycin 500 mg, twice daily (or Metronidazole per clinician).'] },
          { title: 'PHGG (Optional adjunct)', description: 'Some evidence/experiences suggest 5 g partially hydrolyzed guar gum with each rifaximin dose may improve response.' }
        ]
      },
      {
        phase: 'Phase 2 — Post-Antibiotic Recovery & Prevention',
        steps: [
          { title: 'Diet (4–6 weeks)', description: 'Low FODMAP or Specific Carbohydrate Diet to manage symptoms and reduce quick relapse risk.' },
          { title: 'Prokinetics (critical for recurrence prevention)', description: 'Support MMC—discuss options (e.g., ginger/artichoke or Rx like low-dose erythromycin/prucalopride).' },
          { title: 'Address the root cause', description: 'Work with your clinician to evaluate motility disorders, anatomical issues, or autoimmune contributors.' },
          { title: 'Gut-healing support', items: ['L-glutamine', 'Zinc carnosine', 'Bone broth or similar soothing options'] }
        ]
      }
    ]
  },
  {
    id: 3,
    title: 'Herbal Antimicrobial Approach',
    summary:
      'Uses botanical antimicrobials in rotating combinations, often alongside a short-term Low-FODMAP diet. Favored by those seeking a non-antibiotic route.',
    evidenceTier: 2,
    commonSymptoms: ['Bloating', 'Gas', 'Abdominal pain', 'Constipation', 'Diarrhea'],
    citation: {
      text: 'Emerging/limited studies + community reports; clinician guidance recommended.',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4030608/'
    },
    sampleDay: {
      title: 'Sample day (during antimicrobial phase)',
      schedule: [
        { time: 'Morning',  action: 'Biofilm disruptor 30 min pre-breakfast; take combo herbs with food.' },
        { time: 'Afternoon',action: 'Second antimicrobial dose with lunch; hydration + light walk.' },
        { time: 'Evening',  action: 'Third dose with dinner (if 3x/day); symptom journal.' }
      ]
    },
    protocol: [
      {
        phase: 'Phase 1 — Antimicrobial Treatment (4–6 weeks)',
        steps: [
          { title: 'Rotating combinations', description: 'Use 2–3 botanicals together and rotate every 2–3 weeks to reduce resistance risk.' },
          { title: 'Common options (typical adult ranges)', items: ['Berberine: 500 mg, 2–3×/day', 'Oregano oil (enteric-coated): 100–200 mg carvacrol, 2–3×/day', 'Neem extract: 400–500 mg, 2–3×/day', 'Allicin (garlic extract): 400–500 mg, 2–3×/day'] },
          { title: 'Biofilm disruptors (30 min before herb doses)', items: ['N-acetylcysteine (NAC)', 'Proprietary enzyme blends, per product directions'] }
        ]
      },
      {
        phase: 'Phase 2 — Dietary Management (concurrent + 4 weeks after)',
        steps: [
          { title: 'Low FODMAP', description: 'Short-term strict Low FODMAP (e.g., use the Monash app) to reduce fermentable carbs feeding the overgrowth.' }
        ]
      },
      {
        phase: 'Phase 3 — Prevention & Gut Healing (ongoing)',
        steps: [
          { title: 'Prokinetics (MMC support)', items: ['Natural: ginger + artichoke', 'Prescription: low-dose erythromycin or prucalopride'] },
          { title: 'Digestive support', items: ['Betaine HCl with meals (titrate carefully per clinician)', 'Broad-spectrum digestive enzymes as needed'] },
          { title: 'Gradual food reintroduction', description: 'Systematically reintroduce FODMAP foods to discover personal triggers and expand diet diversity.' }
        ]
      }
    ]
  },
  {
    id: 4,
    title: 'Elemental Diet (short-term, supervised)',
    summary:
      'Liquid-only, pre-digested nutrition that feeds you but not the overgrowth—typically 14–21 days with careful reintroduction.',
    evidenceTier: 1,
    commonSymptoms: ['Bloating', 'Abdominal pain', 'Diarrhea', 'Significant symptom flares'],
    citation: {
      text: 'Research and clinical reports indicate symptom improvement in select cohorts; requires supervision.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/14992438/'
    },
    sampleDay: {
      title: 'Sample day (during elemental phase)',
      schedule: [
        { time: 'Morning',  action: 'Measured formula portion; hydration; gentle movement.' },
        { time: 'Midday',   action: 'Formula portion; rest as needed; light walk.' },
        { time: 'Evening',  action: 'Formula portion; wind-down routine; sleep hygiene.' }
      ]
    },
    protocol: [
      {
        phase: 'Phase 1 — Elemental Diet (14–21 days)',
        steps: [
          { title: 'Exclusive consumption', description: 'Only elemental formula + water unless your clinician specifies otherwise. No other foods/supplements.' },
          { title: 'Formula options', description: 'Commercial or carefully prepared “homemade” versions; must include amino acids, simple carbs, and fats in easily absorbable forms.' }
        ]
      },
      {
        phase: 'Phase 2 — Slow Reintroduction',
        steps: [
          { title: 'Day 1 post-diet', items: ['Well-cooked, single-ingredient, low-FODMAP foods (e.g., steamed carrots, plain broth).'] },
          { title: 'Subsequent days', description: 'Introduce one simple new food per day; monitor closely. Often guided by Low FODMAP or SCD principles.' }
        ]
      },
      {
        phase: 'Phase 3 — Long-Term Prevention',
        steps: [
          { title: 'Personalized diet', description: 'Continue with a modified, diverse diet based on tolerated foods and identified triggers.' },
          { title: 'Prokinetics & gut support', items: ['MMC support as above', 'Optional soothing/gut-repair strategies per clinician'] }
        ]
      }
    ]
  },
  {
    id: 5,
    title: 'Prokinetic & Meal Spacing',
    summary: 'Focus on stimulating the Migrating Motor Complex (MMC) - the gut\'s cleaning wave - through medication/herbs and timed gaps between meals.',
    evidenceTier: 2,
    commonSymptoms: ['Bloating', 'Fullness', 'Constipation', 'Relapse Prevention'],
    citation: { text: 'Physiology-based strategy. Agent evidence varies (e.g., Prucalopride has RCTs). Ginger/Artichoke combo has smaller studies.', url: '' },
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
    evidenceTier: 2,
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
    evidenceTier: 3,
    commonSymptoms: ['Abdominal pain', 'Bloating', 'General wellbeing', 'Gut-Brain Axis Dysfunction', 'Increased symptom perception'],
    citation: { text: 'Gut-brain axis research highlights the impact of stress, sleep, and nervous system state on GI function and symptoms.', url: '' },
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
   Admin Dashboard Component
--------------------------------------- */
const AdminDashboard = ({ onBack }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const copyToClipboard = (sub) => {
    const codeSnippet = `
  {
    id: ${Date.now()}, // Replace with a unique ID
    title: '${sub.title.replace(/'/g, "\\'")}',
    summary: '${sub.summary.replace(/'/g, "\\'")}',
    evidenceTier: 3, // Default to Tier 3 for new user submissions
    commonSymptoms: [${Array.isArray(sub.symptoms) ? sub.symptoms.map(s => `'${s.replace(/'/g, "\\'")}'`).join(', ') : `'${sub.symptoms}'`}],
    citation: { text: 'Community submission', url: '${sub.sourceLink || ''}' },
    sampleDay: { title: 'Sample Day', schedule: [] }, // You may need to format this manually
    protocol: [{ phase: 'Phase 1', steps: [{ title: 'Protocol Details', description: \`${sub.protocol}\` }] }] 
  },`;
    navigator.clipboard.writeText(codeSnippet);
    alert('Copied code snippet to clipboard! You can now paste it into the siboMethodsData array in App.jsx.');
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <button onClick={onBack} className="mb-8 flex items-center font-semibold text-blue-600 hover:text-blue-800">
        &larr; Back to Home
      </button>
      <h1 className="mb-6 text-3xl font-extrabold text-gray-900">Pending Submissions</h1>
      
      {loading ? <p>Loading...</p> : (
        <div className="space-y-6">
          {submissions.length === 0 && <p className="text-gray-500">No pending submissions.</p>}
          {submissions.map(sub => (
            <div key={sub.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm relative">
              <div className="flex justify-between border-b pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold">{sub.title}</h3>
                  <p className="text-xs text-gray-500">Submitted: {sub.submittedAt?.toDate().toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 h-fit">
                    {sub.status || 'Pending'}
                    </span>
                    <button 
                        onClick={() => copyToClipboard(sub)}
                        className="px-3 py-1 text-xs font-bold rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    >
                        Copy Code
                    </button>
                </div>
              </div>
              
              <div className="grid gap-4 text-sm text-gray-700">
                <div><span className="font-bold">Summary:</span> {sub.summary}</div>
                <div><span className="font-bold">Symptoms:</span> {Array.isArray(sub.symptoms) ? sub.symptoms.join(', ') : sub.symptoms}</div>
                <div className="bg-gray-50 p-3 rounded">
                  <span className="font-bold block mb-1">Protocol:</span>
                  <pre className="whitespace-pre-wrap font-sans">{sub.protocol}</pre>
                </div>
                <div><span className="font-bold">Sample Day:</span> {sub.sampleDay}</div>
                {sub.sourceLink && (
                  <div><span className="font-bold">Source:</span> <a href={sub.sourceLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">{sub.sourceLink}</a></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------------------------------------
   Header
--------------------------------------- */
function Header({ user, onGoHome, onSubmitMethod, onFeedback, isAdmin, onOpenAdmin }) {
  const [busy, setBusy] = useState(false);

  const doGoogleSignIn = async () => {
    if (!auth || !googleProvider) return;
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Google sign-in failed:', e);
      if (e.code !== 'auth/popup-closed-by-user') {
        alert("Could not sign in with Google. Please try again.");
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
    } catch(e) {
      console.error("Sign out failed:", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button onClick={onGoHome} className="text-xl font-extrabold tracking-tight text-indigo-700 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-sm" aria-label="Go to homepage">
          SIBO Recovery Hub
        </button>
        <nav className="flex items-center gap-3">
          <button
            onClick={onSubmitMethod}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Submit Method
          </button>
          <button
            onClick={onFeedback}
            className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Feedback
          </button>
          
          {/* Admin Button - Only visible to Admins */}
          {user && isAdmin && (
            <button
                onClick={onOpenAdmin}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
                Admin Panel
            </button>
          )}

          {user ? (
            <button
              disabled={busy}
              onClick={doSignOut}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign out {user.isAnonymous ? '(Guest)' : ''}
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={doGoogleSignIn}
              className="rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
    className="flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    onClick={() => onSelect(method.id)}
    role="button" 
    tabIndex={0} 
    onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(method.id)}
    aria-labelledby={`method-title-${method.id}`}
  >
    <div className="p-6">
      <div className="mb-3">
        <EvidenceTierBadge tier={method.evidenceTier} />
      </div>
      <h3 id={`method-title-${method.id}`} className="mb-2 text-xl font-bold text-gray-800">{method.title}</h3>
      <p className="mb-4 text-sm text-gray-600 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'}}>
        {method.summary}
      </p>
    </div>
    <div className="flex items-center justify-end space-x-4 border-t border-gray-100 bg-gray-50 px-6 py-4">
      <button
        onClick={(e) => { e.stopPropagation(); onVote(method.id, 'like'); }}
        className={`flex items-center space-x-1 rounded-md p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${userVote === 'like' ? 'font-semibold text-green-600' : 'text-gray-500 hover:text-green-600'}`}
        aria-label={`Like ${method.title}. Current count: ${votes?.likes ?? 0}`}
        aria-pressed={userVote === 'like'}
      >
        <ThumbsUpIcon isSelected={userVote === 'like'} />
        <span className="text-sm font-medium">{votes?.likes ?? 0}</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onVote(method.id, 'dislike'); }}
        className={`flex items-center space-x-1 rounded-md p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${userVote === 'dislike' ? 'font-semibold text-red-600' : 'text-gray-500 hover:text-red-600'}`}
        aria-label={`Dislike ${method.title}. Current count: ${votes?.dislikes ?? 0}`}
        aria-pressed={userVote === 'dislike'}
      >
        <ThumbsDownIcon isSelected={userVote === 'dislike'} />
        <span className="text-sm font-medium">{votes?.dislikes ?? 0}</span>
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
        Explore recovery methods, evidence summaries, and community experiences. Vote on what you've tried.
      </p>
      <button
        onClick={onOpenAdvisor}
        className="mt-6 inline-flex items-center gap-2 transform rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
        AI Protocol Advisor
      </button>
    </header>

    <div className="mb-6 flex justify-end">
       <label htmlFor="sort-order" className="sr-only">Sort methods by</label>
      <select
        id="sort-order"
        onChange={(e) => onSortChange(e.target.value)}
        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
      >
        <option value="evidence">Sort: Evidence Tier</option>
        <option value="likes">Sort: Most Likes</option>
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
        <p className="text-center text-gray-500">Loading methods or none found.</p>
    )}

    <AiPatternAnalysis />
    <AudioSection />
    <EvidenceTierExplanation />

    <footer className="mt-16 border-t border-gray-200 px-4 pt-8 text-center text-sm text-gray-500">
       <p className="mb-2 font-semibold">
        **Disclaimer:** This site is for informational purposes only and does not constitute medical advice.
        Always consult with a qualified healthcare professional regarding any health concerns or before making any decisions related to your health or treatment.
      </p>
       <p>&copy; {new Date().getFullYear()} SIBO Recovery Hub.</p>
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
      className="mb-8 inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2 h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back to All Methods
    </button>

    <article>
      <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
        {method.title}
      </h1>

      <section aria-labelledby={`evidence-heading-${method.id}`} className="mb-8 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-800">
        <h3 id={`evidence-heading-${method.id}`} className="mb-2 text-lg font-bold">Evidence & Research</h3>
        <div className="mb-2">
          <EvidenceTierBadge tier={method.evidenceTier} />
        </div>
        <p className="text-sm">{method.citation?.text || 'Citation details not available.'}</p>
        {method.citation?.url && (
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
          <section aria-labelledby={`symptoms-heading-${method.id}`} className="mb-8">
              <h3 id={`symptoms-heading-${method.id}`} className="mb-2 text-lg font-bold text-gray-800">
                  Potentially Helpful For:
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
            <section aria-labelledby={`sample-day-heading-${method.id}`} className="mb-8 rounded-lg bg-gray-100 p-6">
                <h3 id={`sample-day-heading-${method.id}`} className="mb-4 text-lg font-bold text-gray-800">
                    {method.sampleDay.title || "A Sample Day"}
                </h3>
                <dl className="space-y-4">
                {method.sampleDay.schedule.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row">
                    <dt className="w-full shrink-0 sm:w-1/4 font-semibold text-gray-700">{item.time}:</dt>
                    <dd className="w-full text-gray-600 sm:pl-2">{item.action}</dd>
                    </div>
                ))}
                </dl>
            </section>
      )}

      <p className="mb-8 text-lg text-gray-600">{method.summary}</p>

      {method.protocol && method.protocol.length > 0 && (
            <section aria-labelledby={`protocol-heading-${method.id}`} className="space-y-8">
                <h2 id={`protocol-heading-${method.id}`} className="sr-only">Protocol Details</h2>
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
  const tag = uid.slice(-4) || String(Math.floor(1000 + Math.random() * 9000));
  return `${a} ${b} #${tag}`;
}

async function getOrCreateNickname(db, uid) {
  if (!uid || !db) return `User #${String(Math.random()).slice(2, 6)}`;
  const uref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(uref);
    if (snap.exists() && snap.data()?.nickname) {
      return snap.data().nickname;
    }
    const nickname = generateNickname(uid);
    await setDoc(uref, { nickname }, { merge: true });
    return nickname;
  } catch (error) {
    console.error("Error fetching or creating nickname for UID:", uid, error);
    return `User #${uid.slice(-4) || 'Err'}`;
  }
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
  const [nicknames, setNicknames] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !methodId) { setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    const qref = query(collection(db, `methods/${methodId}/comments`), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(qref, async (querySnapshot) => {
      const fetchedComments = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComments(fetchedComments);
      // Efficiently fetch missing nicknames
      const userIdsToFetch = fetchedComments
          .map(c => c.userId)
          .filter((id, index, self) => id && self.indexOf(id) === index && !nicknames[id]); // Unique, non-cached IDs
      
      if (userIdsToFetch.length > 0) {
        const nicknamePromises = userIdsToFetch.map(userId =>
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
        } catch (nickError) { console.error("Error fetching some nicknames:", nickError); }
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching comments snapshot:", err);
      setError('Could not load comments. Please check your connection and try again.');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [methodId, db]); // Rerun if methodId or db changes

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) return;
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) {
      console.error("Google Sign-in failed in Comments:", e);
      if(e.code !== 'auth/popup-closed-by-user') alert("Sign-in failed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !db || user.isAnonymous) {
        alert("Please sign in with Google to post a comment.");
        return;
    }
    setError(null);
    try {
      await addDoc(collection(db, `methods/${methodId}/comments`), {
        text: newComment.trim(),
        userId: user.uid,
        timestamp: serverTimestamp(),
      });
      setNewComment('');
    } catch (err) {
      console.error("Error posting comment:", err);
      setError('Failed to post comment. Please try again.');
    }
  };

  const startEdit = (comment) => {
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
      const commentSnap = await getDoc(commentRef);
      if (commentSnap.exists() && commentSnap.data().userId === user.uid) {
        await updateDoc(commentRef, {
          text: editText.trim(),
          editedAt: serverTimestamp(),
        });
        cancelEdit();
      } else {
          setError("Could not save edit. Comment not found or permission denied.");
          cancelEdit();
      }
    } catch (e) {
      console.error("Failed to save comment edit:", e);
      setError('Failed to save changes. Please try again.');
    }
  };

  const remove = async (commentId, commentUserId) => {
    if (!user || !db) return;
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

  const canEdit = (commentUserId) => user && commentUserId === user.uid;
  const canDelete = (commentUserId) => (user && commentUserId === user.uid) || isAdmin;

  return (
    <section className="mt-12" aria-labelledby={`discussion-heading-${methodId}`}>
      <h2 id={`discussion-heading-${methodId}`} className="mb-6 text-2xl font-bold text-gray-800">Community Discussion</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        {user && !user.isAnonymous ? (
          <form onSubmit={handleSubmit} className="mb-6">
            <label htmlFor="new-comment" className="sr-only">Your Comment</label>
            <textarea
              id="new-comment"
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              rows="4"
              placeholder="Share your experience (keep it respectful)..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              required
            />
            <button
              type="submit"
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
              disabled={!newComment.trim()}
            >
              Post Comment
            </button>
          </form>
        ) : (
          <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
            <p className="text-gray-600">
              Want to share your experience?{' '}
              <button onClick={handleGoogleSignIn} className="font-semibold text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm">
                Sign in with Google
              </button>{' '}
              to join the discussion.
            </p>
          </div>
        )}

        {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

        {isLoading ? (
             <p className="text-center text-gray-500">Loading comments...</p>
        ) : (
            <div className="space-y-6">
            {comments.length > 0 ? (
                comments.map((c) => (
                <div key={c.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-semibold text-gray-800">
                            {nicknames[c.userId] || `User...`}
                        </p>
                        <p className="text-xs text-gray-500">
                            {c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleString() : 'Just now'}
                            {c.editedAt ? <span className="italic"> • edited</span> : ''}
                        </p>
                    </div>
                    {user && (
                        <div className="flex flex-shrink-0 gap-3">
                        {canEdit(c.userId) && editingId !== c.id && (
                            <button onClick={() => startEdit(c)} className="rounded-sm text-sm font-medium text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1">
                            Edit
                            </button>
                        )}
                        {canDelete(c.userId) && (
                            <button onClick={() => remove(c.id, c.userId)} className="rounded-sm text-sm font-medium text-red-600 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1">
                            Delete
                            </button>
                        )}
                        </div>
                    )}
                    </div>

                    {editingId === c.id ? (
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
                            className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
                            >Save</button>
                        <button onClick={cancelEdit} className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">Cancel</button>
                        </div>
                    </div>
                    ) : (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{c.text}</p>
                    )}
                </div>
                ))
            ) : (
                <p className="text-center text-gray-500">No comments yet. Be the first to share your experience!</p>
            )}
            </div>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------
   Submit & Feedback Pages
--------------------------------------- */
function SubmitMethodPage({ onBack, user }) {
  const [formData, setFormData] = useState({ title: '', summary: '', sourceLink: '', symptoms: '', protocol: '', sampleDay: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || user.isAnonymous || !db) { setError("Please sign in with Google to submit a method."); return; }
    setError(null); setIsSubmitting(true);
    try {
       const symptomsArray = formData.symptoms.split(',').map(s => s.trim()).filter(s => s);
      await addDoc(collection(db, 'submissions'), { ...formData, symptoms: symptomsArray, submittedBy: user.uid, submittedAt: serverTimestamp(), status: 'pending' });
      alert('Thank you for your submission! It will be reviewed shortly.');
      onBack();
    } catch (err) { console.error('Error submitting form: ', err); setError('Sorry, there was an error submitting your form. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  const handleGoogleSignInForSubmit = async () => {
      if (!auth || !googleProvider) return;
      setError(null);
      try { await signInWithPopup(auth, googleProvider); }
      catch (e) { console.error("Google sign-in failed:", e); setError("Sign-in failed. Please try again."); }
  };

  if (!user || user.isAnonymous) {
    return (
      <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
        <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit a Method</h1>
         {error && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{error}</p>}
        <p className="mb-8 text-lg text-gray-600">
          Please{' '}
          <button onClick={handleGoogleSignInForSubmit} className="font-semibold text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm">
            sign in with Google
          </button>{' '}
          to contribute a new method. This helps maintain the quality of submissions.
        </p>
        <button onClick={onBack} className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm">
             <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
            Back to All Methods
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <button onClick={onBack} className="mb-8 inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm">
         <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
        Back to All Methods
      </button>

      <h1 className="mb-6 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit a New Recovery Method</h1>
      <p className="mb-8 text-gray-600">
        Thank you for contributing! Provide details below. Submissions are reviewed before publishing.
      </p>
       {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
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
          <button type="submit" disabled={isSubmitting} className="w-full justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
    if (!feedback.trim() || !user || user.isAnonymous || !db) {
       setError("Please sign in with Google to submit feedback.");
       return;
    }
    setError(null); setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        feedbackText: feedback.trim(),
        submittedBy: user.uid,
        submittedAt: serverTimestamp(),
        userAgent: navigator.userAgent,
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

   const handleGoogleSignInForFeedback = async () => {
      if (!auth || !googleProvider) return;
      setError(null);
      try { await signInWithPopup(auth, googleProvider); }
      catch (e) { console.error("Google sign-in failed:", e); setError("Sign-in failed. Please try again."); }
   };

  if (!user || user.isAnonymous) {
    return (
      <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
        <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit Feedback</h1>
         {error && <p role="alert" className="mb-4 text-sm font-medium text-red-600">{error}</p>}
        <p className="mb-8 text-lg text-gray-600">
          Please{' '}
          <button onClick={handleGoogleSignInForFeedback} className="font-semibold text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm">
            sign in with Google
          </button>{' '}
          to share your feedback.
        </p>
         <button onClick={onBack} className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm">
             <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
            Back to All Methods
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <button onClick={onBack} className="mb-8 inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm">
         <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} > <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>
        Back to All Methods
      </button>
      <h1 className="mb-6 text-3xl font-extrabold text-gray-900 sm:text-4xl">Share Your Feedback</h1>
      <p className="mb-8 text-gray-600">
        Have an idea? Found a bug? Let us know! Your feedback helps improve this resource.
      </p>
       {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
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
            className="w-full justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
  const safeMethods = Array.isArray(methods) ? methods : [];
  const baseSymptoms = [ 'Constipation','Diarrhea','Bloating','Gas','Abdominal pain','Nausea','Belching','Brain fog','Fullness','Reflux/Heartburn' ];
  const allSymptoms = [...new Set([...baseSymptoms, ...safeMethods.flatMap(m => Array.isArray(m.commonSymptoms) ? m.commonSymptoms : [])])];
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [advice, setAdvice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleSymptom = (sym) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const getAdvice = async () => {
    if (selectedSymptoms.length === 0) {
      setError('Please select at least one symptom.');
      setAdvice('');
      return;
    }
    setIsLoading(true); setAdvice(''); setError(null);

    const simplified = safeMethods.map((m) => ({
      title: m.title,
      summary: m.summary,
      evidenceTier: m.evidenceTier,
      commonSymptoms: Array.isArray(m.commonSymptoms) ? m.commonSymptoms : [],
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
               // Note: Use 'system_instruction' based on current API docs, 'systemInstruction' may be deprecated
               system_instruction: { parts: [{ text: systemPrompt }] },
               contents: [{ role: 'user', parts: [{ text: userQuery }] }],
            }),
        }
      );

       if (!response.ok) {
           let errorDetails = `API call failed: ${response.status} ${response.statusText}`;
           try {
               const errorBody = await response.json();
               console.error("Gemini API Error Body:", errorBody);
               errorDetails += ` - ${errorBody?.error?.message || JSON.stringify(errorBody)}`;
           } catch (parseError) {
               errorDetails += ` - Could not parse error response.`;
           }
           throw new Error(errorDetails);
       }

      const result = await response.json();

       if (result?.promptFeedback?.blockReason) {
           console.warn("Gemini Response Blocked:", result.promptFeedback);
           setError(`The AI response was blocked due to: ${result.promptFeedback.blockReason}. Please adjust your query.`);
           setAdvice('');
       } else {
           const text = result?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n').trim();
           if (text) {
               setAdvice(text);
           } else {
               console.warn("Gemini response empty or structure unexpected:", result);
               setError("Received an empty or unexpected response from the AI.");
               setAdvice('');
           }
       }
    } catch (err) {
      console.error('Gemini API call failed:', err);
      setError(`Sorry, there was an error communicating with the AI Advisor: ${err.message}.`);
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
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
             <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Analyzing...</>
          ) : 'Get AI Advice'}
        </button>
         {error && (
             <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700">
                 {error}
             </div>
         )}
        {advice && !error && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-xl font-bold text-gray-800">Your Personalized Summary</h3>
            <div className="whitespace-pre-wrap text-sm text-gray-700 space-y-2">
                 {advice.split('\n').map((line, index) => (
                    line.trim() ? <p key={index}>{line}</p> : null // Render non-empty lines
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
   App Root Component
--------------------------------------- */
// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("ErrorBoundary caught:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center bg-red-50 text-red-700">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                    <p>Please refresh the page.</p>
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
  const [currentPage, setCurrentPage] = useState('list');
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('evidence');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFirebaseNotice] = useState(!isFirebaseConfigValid());

  useEffect(() => {
    if (!auth) { setAuthReady(true); return; }
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'votes'), snap => {
      const data = {};
      (siboMethodsData||[]).forEach(m=>data[String(m.id)]={likes:0,dislikes:0});
      snap.forEach(d=>data[d.id]=d.data());
      setVotes(data);
    }, e=>{console.error("Votes listener error:",e);});
    return unsub;
  }, [db]);

  useEffect(() => {
    if (user && db){
      const unsub = onSnapshot(collection(db,`users/${user.uid}/userVotes`),snap=>{
        const mine={}; snap.forEach(d=>mine[d.id]=d.data().vote); setUserVotes(mine);
      },e=>{console.error("User votes error:",e); setUserVotes({});});
      return unsub;
    } else { setUserVotes({}); }
  }, [user, db]);

  useEffect(() => {
    if (user && !user.isAnonymous && db){
      (async()=>{
        try {
          const snap = await getDoc(doc(db,'admins',user.uid)); setIsAdmin(snap.exists());
        } catch(e) { console.error("Admin check:",e); setIsAdmin(false); }
      })();
    } else { setIsAdmin(false); }
  }, [user, db]);

  const handleSelectMethod = id => { setSelectedMethodId(id); setCurrentPage('detail'); };
  const handleBack = () => { setSelectedMethodId(null); setCurrentPage('list'); };
  const handleGoHome = handleBack;
  const handleSubmitMethod = () => setCurrentPage('submit');
  const handleFeedback = () => setCurrentPage('feedback');
  const handleOpenAdvisor = () => setIsAdvisorOpen(true);
  const handleCloseAdvisor = () => setIsAdvisorOpen(false);
  const handleOpenAdmin = () => setCurrentPage('admin');
  
  const handleVote = async (id, voteType) => {
    if (!auth || !db) return;
    let currentUser = auth.currentUser;
    if (!currentUser || currentUser.isAnonymous){
      if(window.confirm("Please sign in with Google to vote.")){
        try {
          currentUser = (await signInWithPopup(auth, googleProvider)).user;
          if(!currentUser) return;
        } catch(e) { console.error(e); return; }
      } else { return; }
    }
    const methodId = String(id);
    const userId = currentUser.uid;
    const voteDocRef = doc(db,'votes',methodId);
    const userVoteDocRef = doc(db,`users/${userId}/userVotes`,methodId);
    try {
      await runTransaction(db, async tx => {
        const [vSnap, uVSnap] = await Promise.all([tx.get(voteDocRef), tx.get(userVoteDocRef)]);
        let {likes=0, dislikes=0} = vSnap.data() || {};
        const prev = uVSnap.data()?.vote;
        
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
    } catch(e) { console.error("Vote tx failed:", e); alert("Your vote failed. Please try again."); }
  };

  const methods = siboMethodsData;
  const sortedMethods = [...methods].sort((a,b) => {
    if (sortOrder === 'likes') {
      const lA = votes[String(a.id)]?.likes || 0;
      const lB = votes[String(b.id)]?.likes || 0;
      return lB - lA;
    }
    const tA = a.evidenceTier === 0 ? -1 : a.evidenceTier;
    const tB = b.evidenceTier === 0 ? -1 : b.evidenceTier;
    return tB - tA;
  });
  const selectedMethod = methods.find(m => m.id === selectedMethodId);

  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100"><p className="animate-pulse text-lg font-medium text-gray-600">Loading...</p></div>;
  }

  const renderPage = () => {
     if (showFirebaseNotice) {
       return <MethodListPage 
         methods={sortedMethods} 
         onSelectMethod={() => alert("Details unavailable in limited mode.")} 
         onVote={() => alert("Voting disabled in limited mode.")} 
         votes={votes} 
         userVotes={{}} 
         onSortChange={() => {}} 
         onOpenAdvisor={() => alert("Advisor unavailable in limited mode.")} 
        />;
     }
    switch (currentPage) {
      case 'detail': 
        return selectedMethod ? <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} isAdmin={isAdmin} /> : (handleBack(), null);
      case 'submit': 
        return <SubmitMethodPage onBack={handleBack} user={user} />;
      case 'feedback': 
        return <FeedbackPage onBack={handleBack} user={user} />;
      case 'admin': 
        return <AdminDashboard onBack={handleBack} />;
      case 'list': 
      default: 
        return <MethodListPage 
          methods={sortedMethods} 
          onSelectMethod={handleSelectMethod} 
          onVote={handleVote} 
          votes={votes} 
          userVotes={userVotes} 
          onSortChange={setSortOrder} 
          onOpenAdvisor={handleOpenAdvisor} 
        />;
    }
  };

  return (
    <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Header 
            user={user} 
            onGoHome={handleGoHome} 
            onSubmitMethod={handleSubmitMethod} 
            onFeedback={handleFeedback} 
            isAdmin={isAdmin} 
            onOpenAdmin={handleOpenAdmin} 
          />
          {showFirebaseNotice && (
            <div className="mx-auto mt-4 mb-4 max-w-6xl rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-900" role="alert">
                ⚠️ **Limited Mode:** Firebase not configured. Features disabled. Check Netlify env vars.
            </div>
          )}
          {isAdvisorOpen && <GeminiAdvisor methods={methods} onClose={handleCloseAdvisor} />}
          <main>
            {renderPage()}
          </main>
        </div>
    </ErrorBoundary>
  );
}