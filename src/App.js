/* global __firebase_config */
import React, { useState, useEffect } from 'react';
// --- Firebase SDKs ---
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
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

/**
 * SIBO Recovery Hub — single-file React SPA
 * This version uses a hybrid configuration loader to work in both
 * the development canvas and on a live Netlify site.
 */

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
let app;
let db;
let auth;
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
    const handleLogin = () => {
        if (auth) signInAnonymously(auth).catch((e) => console.error('Anonymous sign-in failed:', e));
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
                            Welcome, User {user.uid.substring(0, 6)}...
                        </span>
                        <button onClick={() => auth && signOut(auth)} className="font-semibold text-red-600 hover:text-red-800">
                            Log Out
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin} className="font-semibold text-blue-600 hover:text-blue-800">
                        Sign In to Vote & Comment
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

const MethodDetailPage = ({ method, onBack, user }) => (
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

        <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">{method.title}</h1>

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
                <h3 className="mb-2 text-lg font-bold text-gray-800">Best For These Symptoms:</h3>
                <div className="flex flex-wrap gap-2">
                    {method.commonSymptoms.map((symptom, index) => (
                        <span key={index} className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700">
                            {symptom}
                        </span>
                    ))}
                </div>
            </div>
        )}

        {method.sampleDay && (
            <div className="mb-8 rounded-lg bg-gray-100 p-6">
                <h3 className="mb-4 text-lg font-bold text-gray-800">{method.sampleDay.title}</h3>
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

        <div className="space-y-8">
            {method.protocol.map((phase, phaseIndex) => (
                <div key={phaseIndex} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                    <div className="border-b border-gray-200 bg-gray-100 p-4">
                        <h2 className="text-2xl font-bold text-gray-800">{phase.phase}</h2>
                    </div>
                    <div className="space-y-6 p-6">
                        {phase.steps.map((step, stepIndex) => (
                            <div key={stepIndex}>
                                <h4 className="mb-2 text-xl font-semibold text-gray-700">{step.title}</h4>
                                {step.description && <p className="mb-3 text-gray-600">{step.description}</p>}
                                {step.items && (
                                    <ul className="list-inside list-disc space-y-1 pl-4 text-gray-600">
                                        {step.items.map((item, itemIndex) => (
                                            <li key={itemIndex}>{item}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <CommentsSection methodId={method.id} user={user} />
    </div>
);

// ---------------- Comments ----------------
const CommentsSection = ({ methodId, user }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!db) return;
        const commentsQuery = query(collection(db, `methods/${methodId}/comments`), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(
            commentsQuery,
            (snapshot) => {
                const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                setComments(fetched);
            },
            (err) => {
                console.error('Error fetching comments:', err);
                setError('Could not load comments. Please try again later.');
            }
        );
        return () => unsubscribe();
    }, [methodId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user || !db) return;
        try {
            await addDoc(collection(db, `methods/${methodId}/comments`), {
                text: newComment,
                userName: `User ${user.uid.substring(0, 6)}...`,
                userId: user.uid,
                timestamp: serverTimestamp(),
            });
            setNewComment('');
        } catch (err) {
            console.error('Error posting comment:', err);
            setError('Failed to post comment.');
        }
    };

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
                            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                            disabled={!newComment.trim()}
                        >
                            Post Comment
                        </button>
                    </form>
                ) : (
                    <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
                        <p className="text-gray-600">
                            Want to share your experience?{' '}
                            <button onClick={() => auth && signInAnonymously(auth)} className="font-semibold text-blue-600 hover:underline">
                                Sign in
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
                                <p className="font-semibold text-gray-800">{c.userName}</p>
                                <p className="mb-2 text-xs text-gray-500">
                                    {c.timestamp ? new Date(c.timestamp.toDate()).toLocaleString() : 'Just now'}
                                </p>
                                <p className="whitespace-pre-wrap text-gray-700">{c.text}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500">No comments yet. Be the first to share your experience!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ---------------- Submit Method ----------------
const SubmitMethodPage = ({ onBack, user }) => {
    const [formData, setFormData] = useState({ title: '', summary: '', sourceLink: '', symptoms: '', protocol: '', sampleDay: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

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
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit a Method</h1>
                <p className="mb-8 text-lg text-gray-600">
                    Please{' '}
                    <button onClick={() => auth && signInAnonymously(auth)} className="font-semibold text-blue-600 hover:underline">
                        sign in
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
            <button onClick={onBack} className="mb-8 flex items-center font-semibold text-blue-600 hover:text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to All Methods
            </button>
            <h1 className="mb-6 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit a New Recovery Method</h1>
            <p className="mb-8 text-gray-600">
                Thank you for contributing to the community! Please provide as much detail as possible. Your submission will be reviewed before being
                published.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Method Title</label>
                    <input type="text" name="title" id="title" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., Low-Dose Naltrexone (LDN) Protocol" value={formData.title} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Short Summary</label>
                    <textarea name="summary" id="summary" rows="3" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Briefly describe the method and its main principle." value={formData.summary} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="sourceLink" className="block text-sm font-medium text-gray-700">Link to Source (Optional)</label>
                    <input type="url" name="sourceLink" id="sourceLink" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., Reddit post, blog, or article URL" value={formData.sourceLink} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">What symptoms is this method best for?</label>
                    <textarea name="symptoms" id="symptoms" rows="3" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="e.g., Methane-dominant SIBO, Chronic Constipation, Brain Fog" value={formData.symptoms} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="protocol" className="block text-sm font-medium text-gray-700">Full Protocol Details</label>
                    <textarea name="protocol" id="protocol" rows="8" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Describe the phases and steps in detail. Include dosages, timing, and duration." value={formData.protocol} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="sampleDay" className="block text-sm font-medium text-gray-700">A Sample Day</label>
                    <textarea name="sampleDay" id="sampleDay" rows="5" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Describe a typical day following this protocol from morning to night." value={formData.sampleDay} onChange={handleChange} />
                </div>
                <div>
                    <button type="submit" disabled={isSubmitting} className="w-full justify-center rounded-md bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400">
                        {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ---------------- Feedback ----------------
const FeedbackPage = ({ onBack, user }) => {
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
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit Feedback</h1>
                <p className="mb-8 text-lg text-gray-600">
                    Please{' '}
                    <button onClick={() => auth && signInAnonymously(auth)} className="font-semibold text-blue-600 hover:underline">
                        sign in
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
    const allSymptoms = [...new Set(methods.flatMap((m) => m.commonSymptoms))];
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
            setAdvice('Gemini API key is not configured. Set REACT_APP_GEMINI_API_KEY, VITE_GEMINI_API_KEY, or GEMINI_API_KEY in your environment variables.');
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
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                setUser(null);
                // Note: We no longer auto-sign in users
                // Users must explicitly click "Sign in with Google"
            }
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    // Aggregate votes (per method id)
    useEffect(() => {
        if (!db) return;
        const votesCollection = collection(db, 'votes');
        const unsub = onSnapshot(votesCollection, (snapshot) => {
            const data = {};
            siboMethodsData.forEach((m) => (data[String(m.id)] = { likes: 0, dislikes: 0 }));
            snapshot.forEach((d) => {
                data[d.id] = d.data();
            });
            setVotes(data);
        });
        return () => unsub();
    }, []);

    // Current user's votes
    useEffect(() => {
        if (user && db) {
            const userVotesCollection = collection(db, `users/${user.uid}/userVotes`);
            const unsub = onSnapshot(userVotesCollection, (snapshot) => {
                const mine = {};
                snapshot.forEach((d) => {
                    mine[d.id] = d.data().vote;
                });
                setUserVotes(mine);
            });
            return () => unsub();
        }
        setUserVotes({});
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

    // Voting with transaction that reads the user's previous vote atomically
    const handleVote = async (id, voteType) => {
        if (!auth || !db) return;
        let currentUser = auth.currentUser;
        if (!currentUser) {
            try {
                currentUser = (await signInAnonymously(auth)).user;
            } catch (e) {
                console.error('Sign-in for vote failed', e);
                return;
            }
        }

        const methodId = String(id);
        const voteDocRef = doc(db, 'votes', methodId);
        const userVoteDocRef = doc(db, `users/${currentUser.uid}/userVotes`, methodId);

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
            case 'detail': return <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} />;
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