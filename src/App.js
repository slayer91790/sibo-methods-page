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
    
    // This function now correctly checks for missing or truly empty values.
    return firebaseConfig && Object.values(firebaseConfig).every(value => value && value.trim() !== '');
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
            },
            {
                phase: "Phase 2: Post-Antibiotic Recovery and Prevention (Ongoing)",
                steps: [
                    { title: "Diet", description: "A Low FODMAP or Specific Carbohydrate Diet (SCD) is typically initiated immediately after the antibiotic course for 4-6 weeks to manage symptoms and prevent a rapid relapse." },
                    { title: "Prokinetics", description: "Stimulating the MMC is crucial for long-term success. This is a critical step to prevent recurrence." },
                    { title: "Address the Root Cause", description: "Work with a healthcare provider to identify and manage the underlying cause of SIBO." },
                    { title: "Gut Healing Support", description: "Introduce gut-healing nutrients such as L-glutamine, zinc carnosine, and bone broth to help repair the intestinal lining." }
                ]
            }
        ]
    },
    {
        id: 1,
        title: "Herbal Antimicrobial Protocol",
        summary: "Focuses on using natural compounds with antimicrobial properties to reduce bacterial overgrowth in the small intestine. Often favored by those seeking a less aggressive alternative to prescription antibiotics.",
        evidenceTier: 2,
        commonSymptoms: ["Mixed SIBO (Hydrogen & Methane)", "Bloating", "General Dysbiosis", "Candida Overgrowth"],
        citation: {
            text: "A 2014 study showing herbal therapy (Candibactin-AR and Candibactin-BR) is as effective as Rifaximin for SIBO resolution in a non-controlled trial.",
            url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4030608/"
        },
        sampleDay: {
            title: "A Sample Day During the Herbal Protocol",
            schedule: [
                { time: "Morning (8 AM)", action: "Take first dose of herbal antimicrobials (e.g., Berberine, Oregano Oil) with a low-FODMAP breakfast. Take biofilm disruptor 30 minutes prior on an empty stomach." },
                { time: "Afternoon (2 PM)", action: "Low-FODMAP lunch. Ensure 4-5 hours of spacing between meals." },
                { time: "Evening (8 PM)", action: "Take second dose of herbal antimicrobials with a low-FODMAP dinner. Take biofilm disruptor 30 minutes prior." },
                { time: "Bedtime (10 PM)", action: "Take prokinetic (e.g., Ginger & Artichoke) on an empty stomach, at least 2 hours after dinner." }
            ]
        },
        protocol: [
            {
                phase: "Phase 1: Antimicrobial Treatment (4-6 weeks)",
                steps: [
                    {
                        title: "Herbal Combination",
                        description: "A rotating combination of two or three of the following herbal antimicrobials is taken daily with meals.",
                        items: [
                            "Berberine: 500mg, 2-3 times per day.",
                            "Oregano Oil (enteric-coated): 100-200mg of carvacrol, 2-3 times per day.",
                            "Neem Extract: 400-500mg, 2-3 times per day.",
                            "Allicin (from garlic extract): 400-500mg, 2-3 times per day.",
                        ],
                    },
                    {
                        title: "Biofilm Disruptors",
                        description: "Taken 30 minutes before each dose of antimicrobials, these enzymes may help to break down the protective shields of the bacteria.",
                    },
                ]
            },
            {
                phase: "Phase 2: Dietary Management",
                steps: [
                    {
                        title: "Low FODMAP Diet",
                        description: "Strictly adhere to a diet low in Fermentable Oligosaccharides, Disaccharides, Monosaccharides, and Polyols to reduce the food source for the bacteria.",
                    }
                ]
            },
            {
                phase: "Phase 3: Prevention and Gut Healing (Ongoing)",
                steps: [
                    {
                        title: "Prokinetics",
                        description: "To stimulate the migrating motor complex (MMC). Options include ginger & artichoke extract or prescription medications.",
                    },
                    {
                        title: "Stomach Acid and Digestive Enzymes",
                        description: "Supplementing with Betaine HCl with meals to ensure proper protein digestion.",
                    },
                    {
                        title: "Gradual Food Reintroduction",
                        description: "Slowly and systematically reintroduce FODMAP foods to identify personal triggers.",
                    }
                ]
            }
        ]
    },
    {
        id: 3,
        title: "The Elemental Diet",
        summary: "A more intensive, short-term approach that involves consuming a liquid-only diet of pre-digested nutrients to starve bacteria while nourishing the individual.",
        evidenceTier: 2,
        commonSymptoms: ["Severe/Stubborn Cases", "High Gas Levels", "Multiple Food Intolerances", "Need for a Gut Reset"],
        citation: {
            text: "A pilot study from 2004 showing an 80% success rate in normalizing SIBO breath tests after a 14-day elemental diet.",
            url: "https://pubmed.ncbi.nlm.nih.gov/14992438/"
        },
        sampleDay: {
            title: "A Sample Day During the Elemental Diet",
            schedule: [
                { time: "Throughout the Day", action: "Sip the elemental formula slowly and continuously. Aim to consume the total daily amount spread out over many hours. No other food or drink is consumed except for water." },
                { time: "Flavoring", action: "If flavor is needed, only use a small amount of pure stevia or monk fruit extract. Avoid any other additives." }
            ]
        },
        protocol: [
            {
                phase: "Phase 1: The Elemental Diet (14-21 days)",
                steps: [
                    { title: "Exclusive Consumption", description: "For the entire duration, only the elemental formula and water are consumed. No other food, drink, or supplements are taken unless specified by a healthcare provider." },
                    { title: "Formula Options", description: "Both commercially available formulas and homemade versions exist. It is crucial that the formula contains amino acids, simple carbohydrates, and fats in an easily absorbable form." }
                ]
            },
            {
                phase: "Phase 2: Reintroduction of Food (Slow and Careful)",
                steps: [
                    { title: "Day 1 Post-Diet", description: "Begin with well-cooked, single-ingredient, low-FODMAP foods in small portions (e.g., steamed carrots, plain chicken broth)." },
                    { title: "Subsequent Days", description: "Slowly introduce one new, simple food each day, monitoring closely for any reaction." }
                ]
            },
            {
                phase: "Phase 3: Long-Term Prevention (Ongoing)",
                steps: [
                    { title: "Dietary Strategy", description: "Continue with a modified diet based on the successful reintroduction of foods, paying close attention to personal triggers." },
                    { title: "Prokinetics and Gut Support", description: "Implementing prokinetics and other gut-healing strategies is essential to prevent a recurrence." }
                ]
            }
        ]
    },
    {
        id: 8,
        title: "Atrantil & Berberine Complex Protocol",
        summary: "A user-reported protocol for high methane SIBO (IMO) using a slow titration of Atrantil and a specific Berberine Complex, combined with motility support.",
        evidenceTier: 3,
        commonSymptoms: ["High Methane SIBO (IMO)", "Chronic Constipation", "Bloating", "Candida Overgrowth"],
        citation: {
            text: "This is a detailed success story shared by a user on Reddit. The specific combination and titration schedule are anecdotal.",
            url: null
        },
        sampleDay: {
            title: "A Sample Day on the Atrantil & Berberine Protocol",
            schedule: [
                { time: "Morning", action: "Take current dose of Atrantil and Berberine Complex with a low-FODMAP/Candida diet breakfast. (e.g., start with 1 pill of each)." },
                { time: "During Day", action: "Take motility medications as prescribed (e.g., Motegrity, Amitiza). Continue Candida/Low-FODMAP diet." },
                { time: "Evening", action: "Take final dose of Atrantil and Berberine Complex with dinner." },
                { time: "Bedtime", action: "Take nightly motility medication on an empty stomach." }
            ]
        },
        protocol: [
            {
                phase: "Phase 1: Eradication (Slow Titration)",
                steps: [
                    { title: "Start Slow", description: "Begin with 1 pill of Atrantil and 1 pill of Integrative Therapeutics Berberine Complex daily." },
                    { title: "Increase Dosage", description: "Increase dosage slowly every 5-7 days (e.g., to 2 pills of each, then 3, etc.) until reaching the full dosage of 6 pills of each per day." },
                    { title: "Maintain Full Dosage", description: "Stay at the full dosage for approximately 2.5 months or until bloating resolves." },
                    { title: "Support Motility", description: "Concurrently manage constipation with motility aids (prescription or OTC like MagO7) as this is a key factor." },
                    { title: "Diet", description: "Follow a combined Candida Diet and Low FODMAP Diet during treatment." }
                ]
            },
            {
                phase: "Phase 2: Relapse Prevention (Maintenance)",
                steps: [
                    { title: "Taper Down", description: "After symptoms resolve, begin to taper down the dosage. This user took 1 pill of each daily for one year." },
                    { title: "Further Reduction", description: "Reduce to 1 pill of each every other day for another 8 months before stopping." },
                    { title: "Long-Term Motility", description: "Continue long-term prescription motility support (e.g., Motegrity, Amitiza) as needed for underlying slow transit." }
                ]
            }
        ]
    },
    {
        id: 4,
        title: "Probiotic and Prokinetic Protocol",
        summary: "Emphasizes the combination of a specific probiotic with a prokinetic to manage symptoms and restore gut function, particularly in cases linked to post-infectious IBS.",
        evidenceTier: 3,
        commonSymptoms: ["Post-Infectious IBS", "Motility Issues", "Relapse Prevention"],
        citation: {
            text: "This protocol is based on a user's experience. While specific probiotics and prokinetics have been studied individually, this particular combination is anecdotal.",
            url: null
        },
        sampleDay: {
            title: "A Sample Day on the Probiotic/Prokinetic Protocol",
            schedule: [
                { time: "Morning (with breakfast)", action: "Take one dose of the chosen probiotic (e.g., KefirLabs coconut shot)." },
                { time: "Between Meals", action: "Maintain meal spacing of 4-5 hours with no snacking to support motility." },
                { time: "Bedtime", action: "Take prokinetic (e.g., 2mg prucalopride) on an empty stomach, at least 2-3 hours after the last meal." }
            ]
        },
        protocol: [
            {
                phase: "Daily Regimen (Post-Antibiotic or Maintenance)",
                steps: [
                    { title: "Prerequisite", description: "This user began this protocol a couple of weeks after a course of Rifaximin. It may be considered a post-antibiotic or maintenance strategy." },
                    { title: "Probiotic", description: "One KefirLabs brand coconut creamy probiotic shot taken daily with breakfast." },
                    { title: "Prokinetic", description: "2mg of prucalopride taken nightly to improve gut motility." },
                    { title: "Diet", description: "The user reported being able to return to a normal diet with minimal discomfort while on this protocol." }
                ]
            }
        ]
    },
    {
        id: 7,
        title: "Aggressive Multi-Phase Protocol",
        summary: "An aggressive protocol for stubborn SIBO. It operates on a multi-pronged, rotational attack using the elemental diet, pharmaceuticals, and herbals to prevent microbial resistance.",
        evidenceTier: 3,
        commonSymptoms: ["Stubborn/Recurrent SIBO", "High Methane/Hydrogen Levels", "Biofilm-Related Issues"],
        citation: {
            text: "This is a community-derived protocol based on anecdotal reports. It combines several methods (Elemental, Pharmaceutical, Herbal) which have individual scientific backing (see other methods). The combined protocol itself has not been studied.",
            url: null
        },
        sampleDay: {
            title: "A Sample Day (Example during Herbal Phase)",
            schedule: [
                { time: "Morning", action: "Take biofilm disruptor on empty stomach. 30-60 mins later, take first dose of herbal antimicrobials with low-FODMAP breakfast." },
                { time: "Afternoon", action: "Low-FODMAP lunch. Ensure 4-5 hours of spacing between meals to promote MMC." },
                { time: "Evening", action: "Take biofilm disruptor on empty stomach. 30-60 mins later, take second dose of herbals with low-FODMAP dinner." },
                { time: "Bedtime", action: "Take prokinetic (e.g., MotilPro) at least 2 hours after dinner." }
            ]
        },
        protocol: [
            {
                phase: "Phase 1: 'Shock and Awe' - Elemental Diet (14-21 Days)",
                steps: [ { title: "Objective & Execution", description: "Commit to a 16-21 day course of an elemental diet formula to starve the microbes. Sip the formula slowly over an hour." } ]
            },
            {
                phase: "Phase 2: The Main Offensive - Rotational Antimicrobials (8-10 weeks)",
                steps: [
                    { title: "Round 1 - Pharmaceutical (4 weeks)", description: "Use Rifaximin (Xifaxan), often paired with Neomycin or Metronidazole for methane. Enhance with Partially Hydrolyzed Guar Gum (PHGG)." },
                    { title: "Round 2 - Herbal (4-6 weeks)", description: "Switch to a broad-spectrum herbal combination like Candibactin-AR/BR or Dysbiocide/FC Cidal." }
                ]
            },
            {
                phase: "Phase 3: Breaking Down Defenses - Biofilm Disruption",
                steps: [ { title: "Objective & Execution", description: "Take a biofilm disrupting agent (e.g., Biofilm Defense) 30-60 minutes before each dose of antibiotics or herbs to break down protective shields." } ]
            },
            {
                phase: "Phase 4: Relapse Prevention & Gut Rebuilding (Long-Term)",
                steps: [
                    { title: "Prokinetics", description: "Essential for stimulating the MMC. Options include prescription (Motegrity) or herbal (MotilPro, Iberogast)." },
                    { title: "Dietary Strategy", description: "Meal spacing is crucial (4-5 hours between meals, 12+ hour overnight fast). Start with a SIBO Specific or Low FODMAP diet." }
                ]
            }
        ]
    },
    {
        id: 5,
        title: "Intestinal Transit & Motility Protocol",
        summary: "Centers on the core belief that SIBO is fundamentally a problem of slow intestinal transit. The primary goal is to speed up digestion and motility.",
        evidenceTier: 3,
        commonSymptoms: ["Chronic Constipation", "Slow Transit Time", "Bloating After Meals"],
        citation: {
            text: "This protocol is based on the well-established concept of the Migrating Motor Complex (MMC). While the components (like ginger & artichoke prokinetics) have some studies, this specific comprehensive protocol is anecdotal.",
            url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3290399/"
        },
        sampleDay: {
            title: "A Sample Day for Improving Motility",
            schedule: [
                { time: "Waking Up", action: "Drink a large glass of warm water. Practice deep breathing or vagus nerve stimulation exercises." },
                { time: "Breakfast", action: "Take Betaine HCL with a protein-rich, low-FODMAP breakfast. Chew every bite thoroughly." },
                { time: "Between Meals", action: "No snacking. Drink plenty of water. Go for a short walk after meals." },
                { time: "Bedtime", action: "Take prokinetic (Ginger & Artichoke) on an empty stomach, at least 2-3 hours after your last meal." }
            ]
        },
        protocol: [
            {
                phase: "Phase 1: Assessment and Monitoring",
                steps: [
                    { title: "Bowel Transit Time Test", description: "Perform an at-home transit test (e.g., using sesame seeds) to measure how long it takes for food to pass through your system." },
                    { title: "Symptom & Stool Journal", description: "Keep a detailed log of foods eaten, symptoms experienced, and stool quality to identify patterns and track progress." }
                ]
            },
            {
                phase: "Phase 2: Improving Motility and Digestion",
                steps: [
                    { title: "Prokinetics", description: "A combination of Artichoke and Ginger Extract is taken on an empty stomach to stimulate the MMC." },
                    { title: "Stomach Acid Support", description: "Use Betaine HCL to increase the acidity of the stomach, aiding in the initial breakdown of food." },
                ]
            },
            {
                phase: "Phase 3: Stress Management and Vagus Nerve Stimulation",
                steps: [
                    { title: "De-Stress Protocol", description: "A consistent routine is crucial. The user recommends daily meditation and yoga." },
                    { title: "Vagus Nerve Stimulation", description: "Stimulating the vagus nerve is key to improving digestion. Techniques include gratitude, empathy, connecting with nature, deep breathing, singing, and yoga." }
                ]
            }
        ]
    },
    {
        id: 6,
        title: "Colon Hydrotherapy & Digestive Reset",
        summary: "Posits that the root cause can be old fecal deposits. The core of the treatment is to physically clean the colon while rebuilding healthy digestive habits.",
        evidenceTier: 0,
        commonSymptoms: ["Severe Constipation", "Feeling of 'Fullness' or Blockage", "Systemic Issues"],
        citation: {
            text: "There is no peer-reviewed evidence to support colon hydrotherapy as a treatment for SIBO. Major medical institutions like the Mayo Clinic advise that it is unnecessary and carries potential risks.",
            url: "https://www.mayoclinic.org/healthy-lifestyle/consumer-health/expert-answers/colon-cleansing/faq-20058435"
        },
        sampleDay: {
            title: "A Sample Day for Digestive Reset",
            schedule: [
                { time: "Morning", action: "Start the day with 2-3 large glasses of filtered water. Take Betaine HCL with a well-chewed, simple breakfast." },
                { time: "Throughout Day", action: "Focus on hydration, aiming for 2-3 liters of water. Avoid snacking. Eat slowly and mindfully." },
                { time: "Evening", action: "Take TUDCA or Ox Bile with dinner if fats are difficult to digest. Practice relaxation techniques before bed." }
            ]
        },
        protocol: [
            {
                phase: "Phase 1: The 'Clean Out' (Use with Caution)",
                steps: [
                    { title: "Colon Hydrotherapy", description: "This user reported success with 3 sessions. This therapy is not supported by scientific evidence for SIBO and should be discussed with a medical professional due to potential risks." }
                ]
            },
            {
                phase: "Phase 2: Rebuilding the Digestive Cascade (Ongoing Habits)",
                steps: [
                    { title: "Mindful Eating", description: "Chew food ~30 times per bite. Eat slowly and without stress or distractions." },
                    { title: "Stomach Acid & Bile Support", description: "Use Betaine HCL for stomach acid. Use TUDCA or Ox Bile for bile flow. Quit alcohol and junk food." },
                    { title: "Hydration", description: "Drink 2-3 Liters of filtered water daily." },
                ]
            },
        ]
    },
];

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
                            <p className="text-gray-600 text-sm">{tierItem.description