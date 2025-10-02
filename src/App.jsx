/* global __firebase_config */
import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, runTransaction, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

let firebaseConfig;
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  try { firebaseConfig = JSON.parse(__firebase_config); } catch {}
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
const GEMINI_API_KEY = typeof process !== 'undefined' ? process.env.REACT_APP_GEMINI_API_KEY : '';

const isFirebaseConfigValid = () => firebaseConfig && Object.values(firebaseConfig).every((v) => v && String(v).trim() !== '');

let app = null, db = null, auth = null, googleProvider = null;
if (isFirebaseConfigValid()) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

const EvidenceTierBadge = ({ tier }) => {
  const tiers = {1:{text:'Tier 1: Strong', color:'bg-green-100 text-green-800'},2:{text:'Tier 2: Promising', color:'bg-yellow-100 text-yellow-800'},3:{text:'Tier 3: Anecdotal', color:'bg-blue-100 text-blue-800'},0:{text:'Caution', color:'bg-red-100 text-red-800'}};
  const t = tiers[tier] || {text:'N/A', color:'bg-gray-100 text-gray-800'};
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.color}`}>{t.text}</span>;
};

const methodsData = [
  { id:1, title:'Elemental Diet (short term)', summary:'Liquid formula under clinical guidance.', evidenceTier:1, citation:{text:'Discuss with clinician', url:''}, commonSymptoms:['Bloating','Pain'], protocol:[{phase:'Phase 1', steps:[{title:'Overview'}]}]},
  { id:2, title:'Herbal Antimicrobials', summary:'Botanical protocols in cycles.', evidenceTier:2, citation:{text:'Pilot studies; quality varies', url:''}, commonSymptoms:['Gas','Bloating'], protocol:[{phase:'Phase 1', steps:[{title:'Baseline'}]}]},
];

const MethodCard = ({ method, onSelect }) => (
  <div className="rounded-xl border p-6 bg-white shadow hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => onSelect(method.id)}>
    <div className="mb-2"><EvidenceTierBadge tier={method.evidenceTier} /></div>
    <h3 className="text-xl font-bold">{method.title}</h3>
    <p className="text-gray-600">{method.summary}</p>
  </div>
);

const List = ({ methods, onSelect }) => (
  <div className="p-6 max-w-5xl mx-auto">
    <h1 className="text-4xl font-extrabold text-center">Community-Sourced SIBO Protocols</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {methods.map(m => <MethodCard key={m.id} method={m} onSelect={onSelect} />)}
    </div>
  </div>
);

export default function App() {
  const [page, setPage] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const handleSelect = (id) => { setSelectedId(id); setPage('detail'); };
  const selected = methodsData.find(m => m.id === selectedId);
  return (
    <main className="min-h-screen bg-gray-50">
      {page === 'list' && <List methods={methodsData} onSelect={handleSelect} />}
      {page === 'detail' && (
        <div className="max-w-3xl mx-auto p-6">
          <button onClick={() => setPage('list')} className="text-blue-600 mb-4">← Back</button>
          <h1 className="text-3xl font-bold mb-2">{selected.title}</h1>
          <div className="mb-4"><EvidenceTierBadge tier={selected.evidenceTier} /></div>
          <p className="text-gray-700">{selected.summary}</p>
        </div>
      )}
      <footer className="text-center text-sm text-gray-500 p-6">For education only; not medical advice.</footer>
    </main>
  );
}
