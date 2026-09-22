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
      ]
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
      ]
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
      ]
    }
  ],

  recentReviews: [
    { centreId: "borewell-road", rating: 5, date: "2026-09-20", text: "Amazing experience for my daughter's Carnatic classes. The teacher is patient and skilled.", tags: ["teacher mentioned", "class quality"] },
    { centreId: "alwarpet", rating: 5, date: "2026-09-19", text: "Lovely ambience and well-organized front desk. Scheduling a trial class was smooth.", tags: ["ambience", "staff behavior"] },
    { centreId: "thoraipakkam", rating: 4, date: "2026-09-18", text: "Good classes, app could be more intuitive for tracking attendance.", tags: ["app experience"] },
    { centreId: "borewell-road", rating: 5, date: "2026-09-17", text: "Best decision to enroll here. Highly recommend the guitar program.", tags: ["general"] },
    { centreId: "alwarpet", rating: 4, date: "2026-09-15", text: "Great teachers, though weekend slots fill up fast.", tags: ["scheduling", "teacher mentioned"] }
  ]
};
