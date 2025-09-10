import React, { useState, useEffect } from 'react';

// Mock data for SIBO methods (enhanced from original)
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
        ],
        votes: { likes: 127, dislikes: 23 },
        comments: [
            { id: 1, userName: "User abc123...", text: "Worked well for me after 3 failed herbal attempts. Side effects were minimal.", timestamp: new Date('2024-08-15') },
            { id: 2, userName: "User def456...", text: "Had to stop after 10 days due to severe nausea, but symptoms did improve.", timestamp: new Date('2024-08-20') }
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
        ],
        votes: { likes: 89, dislikes: 34 },
        comments: [
            { id: 3, userName: "User ghi789...", text: "Gentler than antibiotics but took longer to see results. Worth the patience!", timestamp: new Date('2024-07-28') },
            { id: 4, userName: "User jkl012...", text: "The oregano oil was hard on my stomach. Had to reduce the dose.", timestamp: new Date('2024-08-01') }
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
        ],
        votes: { likes: 156, dislikes: 67 },
        comments: [
            { id: 5, userName: "User mno345...", text: "Incredibly difficult but the most effective treatment I've tried. 80% symptom reduction.", timestamp: new Date('2024-08-10') },
            { id: 6, userName: "User pqr678...", text: "Made it 10 days before I couldn't handle it anymore. Still saw some improvement.", timestamp: new Date('2024-07-15') }
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
        ],
        votes: { likes: 45, dislikes: 18 },
        comments: [
            { id: 7, userName: "User stu901...", text: "Interesting approach. Helped with brain fog more than GI symptoms for me.", timestamp: new Date('2024-08-05') }
        ]
    }
];

// Helper Components
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

// Header Component
const Header = ({ user, onGoHome, onSubmitMethod, onFeedback }) => {
    const handleLogin = () => {
        // Mock login - in real app this would use Firebase auth
        const mockUser = {
            uid: 'user_' + Date.now(),
            email: 'anonymous@example.com'
        };
        // This would be handled by parent component state
        alert('In the real app, this would sign you in anonymously through Firebase!');
    };

    const handleLogout = () => {
        alert('In the real app, this would sign you out!');
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
                        <button onClick={handleLogout} className="font-semibold text-red-600 hover:text-red-800">
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

// Method Card Component
const MethodCard = ({ method, onSelect, onVote, userVote }) => (
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
                <span className="font-semibold">{method.votes.likes}</span>
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
                <span className="font-semibold">{method.votes.dislikes}</span>
            </button>
        </div>
    </div>
);

// Method List Page
const MethodListPage = ({ methods, onSelectMethod, onVote, userVotes, onSortChange, onOpenAdvisor }) => (
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
                    userVote={userVotes[method.id] || null}
                />
            ))}
        </div>

        <AiPatternAnalysis />
        <EvidenceTierExplanation />

        <footer className="mt-12 px-4 text-center text-sm text-gray-500">
            <p>
                Disclaimer: This information is for educational purposes only and is not medical advice. Always consult with a qualified
                healthcare professional before starting any new treatment.
            </p>
        </footer>
    </div>
);

// Method Detail Page
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

// Comments Section
const CommentsSection = ({ methodId, user }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        // Mock loading comments for the specific method
        const method = siboMethodsData.find(m => m.id === methodId);
        if (method) {
            setComments(method.comments || []);
        }
    }, [methodId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        const comment = {
            id: Date.now(),
            userName: `User ${user.uid.substring(0, 6)}...`,
            text: newComment,
            timestamp: new Date()
        };

        setComments(prev => [comment, ...prev]);
        setNewComment('');
        
        // In real app, this would save to Firebase
        alert('Comment posted! (In the real app, this would save to Firebase)');
    };

    const handleLogin = () => {
        alert('In the real app, this would sign you in anonymously!');
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
                            <button onClick={handleLogin} className="font-semibold text-blue-600 hover:underline">
                                Sign in
                            </button>{' '}
                            to join the discussion.
                        </p>
                    </div>
                )}
                
                <div className="space-y-6">
                    {comments.length > 0 ? (
                        comments.map((c) => (
                            <div key={c.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                                <p className="font-semibold text-gray-800">{c.userName}</p>
                                <p className="mb-2 text-xs text-gray-500">
                                    {c.timestamp.toLocaleString()}
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

// Submit Method Page
const SubmitMethodPage = ({ onBack, user }) => {
    const [formData, setFormData] = useState({ 
        title: '', 
        summary: '', 
        sourceLink: '', 
        symptoms: '', 
        protocol: '', 
        sampleDay: '' 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!user) return;
        
        setIsSubmitting(true);
        // Mock submission
        setTimeout(() => {
            alert('Thank you for your submission! It will be reviewed shortly. (In the real app, this would save to Firebase)');
            setIsSubmitting(false);
            onBack();
        }, 1500);
    };

    const handleLogin = () => {
        alert('In the real app, this would sign you in anonymously!');
    };

    if (!user) {
        return (
            <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit a Method</h1>
                <p className="mb-8 text-lg text-gray-600">
                    Please{' '}
                    <button onClick={handleLogin} className="font-semibold text-blue-600 hover:underline">
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
                Thank you for contributing to the community! Please provide as much detail as possible. Your submission will be reviewed before being published.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Method Title</label>
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
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Short Summary</label>
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
                    <label htmlFor="sourceLink" className="block text-sm font-medium text-gray-700">Link to Source (Optional)</label>
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
                    <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">What symptoms is this method best for?</label>
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
                    <label htmlFor="protocol" className="block text-sm font-medium text-gray-700">Full Protocol Details</label>
                    <textarea 
                        name="protocol" 
                        id="protocol" 
                        rows="8" 
                        required 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" 
                        placeholder="Describe the phases and steps in detail. Include dosages, timing, and duration." 
                        value={formData.protocol} 
                        onChange={handleChange} 
                    />
                </div>
                
                <div>
                    <label htmlFor="sampleDay" className="block text-sm font-medium text-gray-700">A Sample Day</label>
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
};

// Feedback Page
const FeedbackPage = ({ onBack, user }) => {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!feedback.trim() || !user) return;
        
        setIsSubmitting(true);
        setTimeout(() => {
            alert('Thank you for your feedback! (In the real app, this would save to Firebase)');
            setIsSubmitting(false);
            onBack();
        }, 1500);
    };

    const handleLogin = () => {
        alert('In the real app, this would sign you in anonymously!');
    };

    if (!user) {
        return (
            <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 md:p-8">
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Submit Feedback</h1>
                <p className="mb-8 text-lg text-gray-600">
                    Please{' '}
                    <button onClick={handleLogin} className="font-semibold text-blue-600 hover:underline">
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
                Have an idea to improve the site? Found a bug? Let us know! Your feedback is invaluable in making this a better resource for the community.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
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
};

// Gemini Advisor Component
const GeminiAdvisor = ({ methods, onClose }) => {
    const allSymptoms = [...new Set(methods.flatMap((m) => m.commonSymptoms))];
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [advice, setAdvice] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const toggleSymptom = (sym) => setSelectedSymptoms((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));

    const getAdvice = () => {
        if (selectedSymptoms.length === 0) {
            setAdvice('Please select at least one symptom to get advice.');
            return;
        }
        
        setIsLoading(true);
        setAdvice('');

        // Mock AI advice generation
        setTimeout(() => {
            const relevantMethods = methods.filter(m => 
                m.commonSymptoms.some(symptom => 
                    selectedSymptoms.some(selected => 
                        symptom.toLowerCase().includes(selected.toLowerCase()) ||
                        selected.toLowerCase().includes(symptom.toLowerCase())
                    )
                )
            );

            let mockAdvice = "This is not medical advice. Always consult with a qualified healthcare professional before starting any new treatment.\n\n";
            
            if (relevantMethods.length > 0) {
                mockAdvice += `Based on your selected symptoms (${selectedSymptoms.join(', ')}), here are the most relevant protocols to research and discuss with your doctor:\n\n`;
                
                relevantMethods.slice(0, 3).forEach((method, index) => {
                    const tierText = method.evidenceTier === 1 ? "strong scientific evidence" : 
                                   method.evidenceTier === 2 ? "promising evidence" : 
                                   "anecdotal reports";
                    mockAdvice += `${index + 1}. **${method.title}** (${tierText}): ${method.summary}\n\n`;
                });
                
                mockAdvice += "Remember, SIBO treatment often requires a two-phase approach: an initial eradication phase followed by prevention measures to avoid recurrence. Motility support and addressing underlying causes are crucial for long-term success.";
            } else {
                mockAdvice += "I couldn't find protocols specifically matching your symptoms. Please consult with a healthcare provider for personalized guidance.";
            }
            
            setAdvice(mockAdvice);
            setIsLoading(false);
        }, 2000);
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

// Main App Component
export default function App() {
    const [currentPage, setCurrentPage] = useState('list');
    const [selectedMethodId, setSelectedMethodId] = useState(null);
    const [userVotes, setUserVotes] = useState({});
    const [user, setUser] = useState(null);
    const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('evidence');

    // Mock user login
    const handleLogin = () => {
        const mockUser = { uid: 'user_' + Date.now() };
        setUser(mockUser);
    };

    const handleLogout = () => {
        setUser(null);
        setUserVotes({});
    };

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

    const handleVote = (methodId, voteType) => {
        if (!user) {
            handleLogin();
            return;
        }

        const currentVote = userVotes[methodId];
        let newVote = null;

        if (currentVote !== voteType) {
            newVote = voteType;
        }

        setUserVotes(prev => ({
            ...prev,
            [methodId]: newVote
        }));

        // Update the method's vote counts in the data
        const methodIndex = siboMethodsData.findIndex(m => m.id === methodId);
        if (methodIndex !== -1) {
            // Remove previous vote impact
            if (currentVote === 'like') {
                siboMethodsData[methodIndex].votes.likes = Math.max(0, siboMethodsData[methodIndex].votes.likes - 1);
            } else if (currentVote === 'dislike') {
                siboMethodsData[methodIndex].votes.dislikes = Math.max(0, siboMethodsData[methodIndex].votes.dislikes - 1);
            }

            // Apply new vote
            if (newVote === 'like') {
                siboMethodsData[methodIndex].votes.likes += 1;
            } else if (newVote === 'dislike') {
                siboMethodsData[methodIndex].votes.dislikes += 1;
            }
        }
    };
    
    // Sort methods based on user selection
    const sortedMethods = [...siboMethodsData].sort((a, b) => {
        if (sortOrder === 'likes') {
            return b.votes.likes - a.votes.likes;
        }
        // Evidence tier sort: high tiers first, but tier 0 (caution) last
        const tierA = a.evidenceTier === 0 ? -1 : a.evidenceTier;
        const tierB = b.evidenceTier === 0 ? -1 : b.evidenceTier;
        return tierB - tierA;
    });

    const selectedMethod = siboMethodsData.find((m) => m.id === selectedMethodId);

    // Page router
    const renderPage = () => {
        switch (currentPage) {
            case 'detail': 
                return <MethodDetailPage method={selectedMethod} onBack={handleBack} user={user} />;
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
                <GeminiAdvisor 
                    methods={siboMethodsData} 
                    onClose={() => setIsAdvisorOpen(false)} 
                />
            )}
            {renderPage()}
        </main>
    );
}