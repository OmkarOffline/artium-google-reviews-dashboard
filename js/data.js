/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   SAMPLE / PLACEHOLDER DATA
   --------------------------------------------------------------------------
   This file stands in for the real "last refreshed snapshot" that will
   eventually be pulled from the Google My Business API and cached here.
   The shape (fields, nesting) is deliberately final so that swapping in
   real data later is a drop-in replacement, not a rebuild.

   snapshot.lastRefreshed = when this data was last pulled from Google.
   Every filter on the dashboard reads from this object only — changing
   a filter never triggers a new API call.
   ========================================================================== */

const SNAPSHOT = {
  lastRefreshed: "2026-09-22T09:00:00+05:30",

  centres: [
    {
      id: "alwarpet",
      name: "Alwarpet",
      city: "Chennai",
      location: "Alwarpet, Chennai",
      gmbUrl: "https://maps.app.goo.gl/jeTg64JXCfN9ZZ2e8",
      rating: 4.8,
      totalReviews: 312,
      currentMonthReviews: 14,
      monthlyTarget: 20,
      monthlyBreakdown: [
        { month: "2026-04", count: 11 },
        { month: "2026-05", count: 15 },
        { month: "2026-06", count: 9 },
        { month: "2026-07", count: 18 },
        { month: "2026-08", count: 16 },
        { month: "2026-09", count: 14 }
      ],
      topThemes: ["teacher quality", "ambience", "scheduling"],
      aiSummary: "Reviewers consistently praise teacher expertise and the calm, well-maintained ambience at Alwarpet. A recurring minor complaint is scheduling flexibility for working parents.",
      owner: { name: "Monika", email: "monika@artiumacademy.com", role: "Operations Owner", cadence: "Weekly" },
      teacherMentions: [
        { name: "Priya Ramanathan", course: "Carnatic Classical", mentions: 9 },
        { name: "Arjun Nair", course: "Guitar", mentions: 5 },
        { name: "Divya Krishnan", course: "PFM - Tamil", mentions: 3 }
      ],
      monthlySummaries: {
        "2026-09": {
          aiSummary: "September reviews at Alwarpet lean strongly positive, driven by praise for teacher expertise and the centre's calm ambience. Scheduling flexibility remains the one recurring friction point, mentioned by a handful of working parents.",
          wentWell: [
            "Teacher expertise called out by name in over half of reviews",
            "Ambience and cleanliness praised consistently",
            "Front-desk responsiveness improved from August"
          ],
          wentWrong: [
            "Weekend slot availability still tight for working parents",
            "One review flagged a delayed fee-receipt follow-up"
          ],
          topicMentions: [
            { topic: "teacher quality", count: 8 },
            { topic: "ambience", count: 6 },
            { topic: "scheduling", count: 4 },
            { topic: "staff behavior", count: 3 },
            { topic: "pricing", count: 1 }
          ],
          sentiment: { positive: 79, neutral: 14, negative: 7 }
        }
      }
    },
    {
      id: "thoraipakkam",
      name: "Thoraipakkam",
      city: "Chennai",
      location: "Thoraipakkam, Chennai",
      gmbUrl: "https://maps.app.goo.gl/NojWW5T3S64eqqUk9",
      rating: 4.6,
      totalReviews: 187,
      currentMonthReviews: 9,
      monthlyTarget: 15,
      monthlyBreakdown: [
        { month: "2026-04", count: 8 },
        { month: "2026-05", count: 10 },
        { month: "2026-06", count: 7 },
        { month: "2026-07", count: 12 },
        { month: "2026-08", count: 11 },
        { month: "2026-09", count: 9 }
      ],
      topThemes: ["class quality", "app experience", "pricing"],
      aiSummary: "Strong sentiment around class quality and the tech-enabled learning experience. A few reviews mention pricing as a consideration relative to nearby alternatives.",
      owner: { name: "Padma", email: "padma@artiumacademy.com", role: "Operations Owner", cadence: "Fortnightly" },
      teacherMentions: [
        { name: "Karthik Subramaniam", course: "Keyboard", mentions: 6 },
        { name: "Sneha Iyer", course: "Western Vocals", mentions: 4 },
        { name: "Not Applicable", course: "—", mentions: 2 }
      ],
      monthlySummaries: {
        "2026-09": {
          aiSummary: "Thoraipakkam's September reviews centre on class quality and the app-based learning experience, both rated positively. Pricing comes up more often here than at other centres, usually as a comparison point rather than an outright complaint.",
          wentWell: [
            "Class quality and structure praised across course types",
            "Tech-enabled attendance tracking called out as a plus"
          ],
          wentWrong: [
            "App experience still described as 'clunky' by 2 reviewers",
            "Pricing questioned relative to nearby centres in 3 reviews"
          ],
          topicMentions: [
            { topic: "class quality", count: 5 },
            { topic: "app experience", count: 4 },
            { topic: "pricing", count: 3 },
            { topic: "tech-enabled experience", count: 2 }
          ],
          sentiment: { positive: 68, neutral: 21, negative: 11 }
        }
      }
    },
    {
      id: "borewell-road",
      name: "Borewell Road",
      city: "Bangalore",
      location: "Borewell Road, Bangalore",
      gmbUrl: "https://maps.app.goo.gl/RF4yssx7sJh6tUuk6",
      rating: 4.9,
      totalReviews: 245,
      currentMonthReviews: 19,
      monthlyTarget: 18,
      monthlyBreakdown: [
        { month: "2026-04", count: 13 },
        { month: "2026-05", count: 16 },
        { month: "2026-06", count: 14 },
        { month: "2026-07", count: 17 },
        { month: "2026-08", count: 15 },
        { month: "2026-09", count: 19 }
      ],
      topThemes: ["teacher quality", "learning environment", "staff behavior"],
      aiSummary: "Consistently the highest-rated centre. Reviewers highlight individual teacher mentions frequently and describe the learning environment as premium and welcoming.",
      owner: { name: "Monika", email: "monika@artiumacademy.com", role: "Operations Owner", cadence: "Weekly" },
      teacherMentions: [
        { name: "Ananya Rao", course: "Hindustani Classical", mentions: 11 },
        { name: "Vikram Shetty", course: "Guitar", mentions: 6 },
        { name: "Meera Pillai", course: "Carnatic Classical", mentions: 4 }
      ],
      monthlySummaries: {
        "2026-09": {
          aiSummary: "Borewell Road had its strongest month yet, exceeding its review target. Sentiment is overwhelmingly positive, with individual teachers named frequently and the learning environment repeatedly described as premium.",
          wentWell: [
            "Monthly target exceeded for the first time this quarter",
            "Individual teachers named and praised in most reviews",
            "Learning environment described as 'premium' by multiple reviewers"
          ],
          wentWrong: [
            "A single review mentioned parking availability near the centre"
          ],
          topicMentions: [
            { topic: "teacher quality", count: 10 },
            { topic: "learning environment", count: 7 },
            { topic: "staff behavior", count: 4 },
            { topic: "overall sentiment", count: 3 }
          ],
          sentiment: { positive: 88, neutral: 9, negative: 3 }
        }
      }
    }
  ],

  recentReviews: [
    { centreId: "borewell-road", rating: 5, date: "2026-09-20", text: "Amazing experience for my daughter's Carnatic classes. The teacher is patient and skilled.", tags: ["teacher mentioned", "class quality"] },
    { centreId: "alwarpet", rating: 5, date: "2026-09-19", text: "Lovely ambience and well-organized front desk. Scheduling a trial class was smooth.", tags: ["ambience", "staff behavior"] },
    { centreId: "thoraipakkam", rating: 4, date: "2026-09-18", text: "Good classes, app could be more intuitive for tracking attendance.", tags: ["app experience"] },
    { centreId: "borewell-road", rating: 5, date: "2026-09-17", text: "Best decision to enroll here. Highly recommend the guitar program.", tags: ["general"] },
    { centreId: "alwarpet", rating: 4, date: "2026-09-15", text: "Great teachers, though weekend slots fill up fast.", tags: ["scheduling", "teacher mentioned"] }
  ],

  // Operations Directory — the people responsible for review targets.
  // PLACEHOLDER: replace with your actual team list. One row per
  // person-per-centre assignment (a person covering 2 centres gets 2 rows).
  operationsDirectory: [
    { id: 1, name: "Omkar", email: "omkar@artiumacademy.com", centreId: "all", role: "Admin", cadence: "Weekly", ownsTarget: false },
    { id: 2, name: "Monika", email: "monika@artiumacademy.com", centreId: "alwarpet", role: "Operations Owner", cadence: "Weekly", ownsTarget: true },
    { id: 3, name: "Monika", email: "monika@artiumacademy.com", centreId: "borewell-road", role: "Operations Owner", cadence: "Weekly", ownsTarget: true },
    { id: 4, name: "Padma", email: "padma@artiumacademy.com", centreId: "thoraipakkam", role: "Operations Owner", cadence: "Fortnightly", ownsTarget: true }
  ],

  // Course dropdown values (fixed list from the brief).
  courseOptions: [
    "PFM - Tamil", "PFM - Hindi", "Carnatic Classical", "Hindustani Classical",
    "Western Vocals", "Guitar", "Keyboard"
  ],

  // Teacher Directory — PLACEHOLDER: replace with your real teacher roster.
  // Mention counts are looked up live from each centre's teacherMentions
  // list (matched by name, scoped to the teacher's own centre only — this
  // is the "centre-specific matching" the brief calls for, so a teacher at
  // one centre never picks up mentions meant for a same-named teacher
  // elsewhere).
  teacherDirectory: [
    { id: 1, name: "Priya Ramanathan", email: "priya.ramanathan@artiumacademy.com", centreId: "alwarpet", course1: "Carnatic Classical", course2: "Not Applicable" },
    { id: 2, name: "Arjun Nair", email: "arjun.nair@artiumacademy.com", centreId: "alwarpet", course1: "Guitar", course2: "Not Applicable" },
    { id: 3, name: "Divya Krishnan", email: "divya.krishnan@artiumacademy.com", centreId: "alwarpet", course1: "PFM - Tamil", course2: "Not Applicable" },
    { id: 4, name: "Karthik Subramaniam", email: "karthik.subramaniam@artiumacademy.com", centreId: "thoraipakkam", course1: "Keyboard", course2: "Western Vocals" },
    { id: 5, name: "Sneha Iyer", email: "sneha.iyer@artiumacademy.com", centreId: "thoraipakkam", course1: "Western Vocals", course2: "Not Applicable" },
    { id: 6, name: "Ananya Rao", email: "ananya.rao@artiumacademy.com", centreId: "borewell-road", course1: "Hindustani Classical", course2: "Not Applicable" },
    { id: 7, name: "Vikram Shetty", email: "vikram.shetty@artiumacademy.com", centreId: "borewell-road", course1: "Guitar", course2: "Not Applicable" },
    { id: 8, name: "Meera Pillai", email: "meera.pillai@artiumacademy.com", centreId: "borewell-road", course1: "Carnatic Classical", course2: "PFM - Hindi" }
  ]
};
