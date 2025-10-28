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

// --- Error Boundary Component ---
// (Add this class definition at the top of your file)
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error){ return { hasError: true, error }; }
  componentDidCatch(error, errorInfo){
      console.error('UI Rendering Error:', error, errorInfo);
      this.setState({ errorInfo });
  }
  render(){
    if (this.state.hasError){
      return (
        <div className="p-6 max-w-4xl mx-auto my-10 rounded border border-red-300 bg-red-50 text-red-800 shadow-md">
          <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong.</h1>
          <p className="mb-2">We encountered an error trying to render this part of the application.</p>
          <details className="mt-4 text-sm bg-red-100 p-3 rounded">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
// --- End of Error Boundary ---


/* ---------------------------------------
    Firebase Configuration Handling
--------------------------------------- */
let firebaseConfig;
// Try reading from window.__firebase_config first (for dev environments like the canvas)
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  try {
    firebaseConfig = typeof __firebase_config === 'string'
      ? JSON.parse(__firebase_config)
      : __firebase_config; // Assume it's already an object if not a string
    // Basic validation
    if (!firebaseConfig || typeof firebaseConfig !== 'object' || !firebaseConfig.apiKey) {
        console.warn("Invalid __firebase_config structure detected.");
        firebaseConfig = null;
    }
  } catch (e) {
    console.error('Error parsing __firebase_config:', e);
    firebaseConfig = null; // Invalidate on parse error
  }
}

// If __firebase_config wasn't valid or present, try environment variables (for Netlify/CRA build)
if (!firebaseConfig) {
  const envConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
  // Check if ALL necessary env vars were found and non-empty
  if (Object.values(envConfig).every(v => v && String(v).trim() !== '')) {
      firebaseConfig = envConfig;
  }
}

const GEMINI_API_KEY =
  (typeof process !== 'undefined' ? process.env.REACT_APP_GEMINI_API_KEY : '') || ''; // Ensure it's always a string

// Function to check if the final config (from either source) is valid
const isFirebaseConfigValid = () =>
  firebaseConfig &&
  typeof firebaseConfig === 'object' && // Ensure it's an object
  Object.values(firebaseConfig).every((v) => v && String(v).trim() !== '');

let app = null;
let db = null;
let auth = null;
let googleProvider = null;

// Initialize Firebase SDKs only if the configuration is valid
if (isFirebaseConfigValid()) {
  try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      googleProvider = new GoogleAuthProvider();
      console.log("Firebase initialized successfully."); // Log success
  } catch (error) {
      console.error("Firebase Initialization Error:", error);
      // Invalidate config if initialization fails unexpectedly, ensuring banner shows
      firebaseConfig = null;
      // Also clear SDK variables to prevent potential issues
      app = null; db = null; auth = null; googleProvider = null;
  }
} else {
  // Warn if config is missing (this will trigger the banner in App component)
  console.warn(
    'Firebase configuration is missing or invalid. Database features (votes, comments, submissions) will be disabled.'
  );
}

/* ---------------------------------------
    Icons / small components (Keep existing)
--------------------------------------- */
const ThumbsUpIcon = ({ isSelected }) => ( /* ... SVG ... */ <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 18.734V6a2 2 0 012-2h4a2 2 0 012 2v4z" /></svg> );
const ThumbsDownIcon = ({ isSelected }) => ( /* ... SVG ... */ <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isSelected ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 5.266V18a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" /></svg> );

/* ---------------------------------------
    Evidence badges & explanations (Keep existing)
--------------------------------------- */
const EvidenceTierBadge = ({ tier }) => { /* ... JSX ... */ return <span />; };
const EvidenceTierExplanation = () => { /* ... JSX ... */ return <div />; };

/* ---------------------------------------
    Patterns section (Keep existing)
--------------------------------------- */
const AiPatternAnalysis = () => { /* ... JSX ... */ return <section />; };

/* ---------------------------------------
    Audio section (URL corrected)
--------------------------------------- */
const AudioSection = () => {
  const episodes = [
    {
      title: 'SIBO Unpacked: Your Gut Detective Guide',
      src: 'https://firebasestorage.googleapis.com/v0/b/sibo-recovery-app.appspot.com/o/SIBO%20Unpacked_%20Your%20Gut%20Detective%20Guide%20to%20Bloating%2C%20Pain%2C%20and%20Personalized%20Healing.mp3?alt=media&token=136277f0-b710-4f2c-91d2-5b889ca1b4e8'
    }
  ];
  if (!episodes.length) return null;
  return ( <section> {/* ... Player JSX ... */} </section> ); // Keep existing JSX
};

/* ---------------------------------------
    Methods data (Keep existing data)
--------------------------------------- */
const siboMethodsData = [ /* ... Your full array of method objects ... */ ];

/* ---------------------------------------
    Header (Keep existing component)
--------------------------------------- */
function Header({ user, onGoHome, onSubmitMethod, onFeedback }) { /* ... Component Logic ... */ return <header />; }

/* ---------------------------------------
    Cards & List page (Keep existing components)
--------------------------------------- */
const MethodCard = ({ method, onSelect, onVote, votes, userVote }) => ( /* ... JSX ... */ <div></div> );
const MethodListPage = ({ methods, onSelectMethod, onVote, votes, userVotes, onSortChange, onOpenAdvisor, }) => ( /* ... JSX ... */ <div></div> );

/* ---------------------------------------
    Detail page (Keep existing component)
--------------------------------------- */
const MethodDetailPage = ({ method, onBack, user, isAdmin }) => ( /* ... JSX ... */ <div></div> );

/* ---------------------------------------
    NICKNAMES helpers (Keep existing helpers)
--------------------------------------- */
const ADJECTIVES = [ /* ... */ ]; const ANIMALS = [ /* ... */ ];
function generateNickname(uid = '') { /* ... */ }
async function getOrCreateNickname(db, uid) { /* ... */ }

/* ---------------------------------------
    Comments (Keep existing, improved component)
--------------------------------------- */
function CommentsSection({ methodId, user, isAdmin }) { /* ... Component Logic ... */ return <section />; }

/* ---------------------------------------
    Submit & Feedback Pages (Keep existing components)
--------------------------------------- */
function SubmitMethodPage({ onBack, user }) { /* ... Component Logic ... */ return <div></div>; }
function FeedbackPage({ onBack, user }) { /* ... Component Logic ... */ return <div></div>; }

/* ---------------------------------------
    Gemini Advisor (Keep existing component)
--------------------------------------- */
function GeminiAdvisor({ methods, onClose }) { /* ... Component Logic ... */ return <div></div>; }


/* ---------------------------------------
    App Root (Main Component - Banner logic applied)
--------------------------------------- */
export default function App() {
  const [currentPage, setCurrentPage] = useState('list');
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [user, setUser] = useState(null);
  // Initialize authReady based on whether 'auth' was successfully initialized earlier
  const [authReady, setAuthReady] = useState(!!auth);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('evidence');
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Determine if Firebase notice should be shown ---
  // This check now happens *after* attempting initialization
  const showFirebaseNotice = !isFirebaseConfigValid();

  // --- Effects (Keep existing useEffect hooks) ---
  // Initialize Auth Listener
  useEffect(() => {
    // Only set up listener if auth was initialized
    if (!auth) {
        setAuthReady(true); // Mark ready even if auth failed init
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Ensure authReady is set to true *after* the first check completes
      if (!authReady) {
          setAuthReady(true);
      }
    });
    // Cleanup function
    return () => unsubscribe();
  }, [auth]); // Depend on auth object

  // Fetch Aggregate Votes
  useEffect(() => {
    if (!db) return; // Guard: No DB
    const votesRef = collection(db, 'votes');
    const unsubscribe = onSnapshot(votesRef, (snapshot) => {
        const aggregateVotes = {};
        siboMethodsData.forEach(m => aggregateVotes[String(m.id)] = { likes: 0, dislikes: 0 });
        snapshot.forEach((doc) => {
            aggregateVotes[doc.id] = { likes: doc.data().likes || 0, dislikes: doc.data().dislikes || 0 };
        });
        setVotes(aggregateVotes);
    }, (error) => console.error("Error fetching aggregate votes:", error));
    return () => unsubscribe();
  }, [db]);

  // Fetch User's Votes
  useEffect(() => {
    if (!user || !db) { setUserVotes({}); return; } // Guard: No User or DB
    const userVotesRef = collection(db, `users/${user.uid}/userVotes`);
    const unsubscribe = onSnapshot(userVotesRef, (snapshot) => {
        const currentUserVotes = {};
        snapshot.forEach((doc) => { currentUserVotes[doc.id] = doc.data().vote; });
        setUserVotes(currentUserVotes);
    }, (error) => { console.error("Error fetching user votes:", error); setUserVotes({}); });
    return () => unsubscribe();
  }, [user, db]);

  // Check Admin Status
  useEffect(() => {
    if (!user || user.isAnonymous || !db) { setIsAdmin(false); return; } // Guard
    const checkAdminStatus = async () => {
        const adminRef = doc(db, 'admins', user.uid);
        try {
            const adminSnap = await getDoc(adminRef);
            setIsAdmin(adminSnap.exists());
        } catch (error) { console.error("Error checking admin status:", error); setIsAdmin(false); }
    };
    checkAdminStatus();
  }, [user, db]);


  // --- Event Handlers (Add guards for Firebase notice) ---
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
      if (!auth || !db) return; // Should already be covered by notice, but good guard
      let currentUser = auth.currentUser;
      if (!currentUser || currentUser.isAnonymous) {
          if (window.confirm("Please sign in with Google to vote. Sign in now?")) {
              try {
                  const result = await signInWithPopup(auth, googleProvider);
                  currentUser = result.user;
                  if (!currentUser) return; // Exit if still no user
              } catch (e) { console.error('Sign-in for vote failed:', e); alert("Sign-in failed."); return; }
          } else { return; } // User cancelled sign-in
      }
      // --- Proceed with vote transaction (keep existing logic) ---
      const methodId = String(id); const userId = currentUser.uid;
      const voteDocRef = doc(db, 'votes', methodId); const userVoteDocRef = doc(db, `users/${userId}/userVotes`, methodId);
      try { await runTransaction(db, async (tx) => { /* ... vote logic ... */ }); }
      catch (e) { console.error('Vote transaction failed: ', e); alert("Vote failed."); }
  };


  // --- Sorting (Keep existing logic) ---
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

  // Handle Auth Loading State
  // Render loading indicator *only* if Firebase was expected to init AND auth state isn't ready yet
  // If showFirebaseNotice is true, we skip the loading state and show the banner instead.
  if (!showFirebaseNotice && !authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg font-medium text-gray-600 animate-pulse">Loading Community Hub...</p>
      </div>
    );
  }


  // --- Page Router Logic (Keep existing) ---
  const renderPage = () => {
    switch (currentPage) {
      case 'detail': return selectedMethod ? <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} isAdmin={isAdmin} /> : ( handleBack(), null );
      case 'submit': return <SubmitMethodPage onBack={handleBack} user={user} />; // Internal component handles notice/auth
      case 'feedback': return <FeedbackPage onBack={handleBack} user={user} />; // Internal component handles notice/auth
      case 'list': default:
        return ( <MethodListPage methods={sortedMethods} onSelectMethod={handleSelectMethod} onVote={handleVote} votes={votes} userVotes={userVotes} onSortChange={setSortOrder} onOpenAdvisor={handleOpenAdvisor} /> );
    }
  };

  // --- Final Render ---
  return (
    // Wrap main content in ErrorBoundary defined earlier in this file
    <ErrorBoundary>
        <div className="min-h-screen font-sans bg-gray-50 text-gray-900">
        <Header
            user={user}
            onGoHome={handleGoHome}
            onSubmitMethod={handleSubmitMethod}
            onFeedback={handleFeedback}
        />

        {/* Conditionally render the Firebase Notice Banner */}
        {showFirebaseNotice && (
            <div role="alert" className="mx-auto max-w-6xl px-4 py-3 mt-4 mb-4 rounded-md border border-yellow-400 bg-yellow-50 text-yellow-900 text-sm font-medium shadow-sm">
            Notice: Real-time features (votes, comments, submissions) are disabled. Please ensure Firebase is correctly configured via environment variables or script.
            </div>
        )}

        {isAdvisorOpen && (
            <GeminiAdvisor methods={methods} onClose={handleCloseAdvisor} />
        )}
        <main>
            {renderPage()}
        </main>
        </div>
    </ErrorBoundary>
  );
}