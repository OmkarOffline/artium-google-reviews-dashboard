/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Static configuration + the loader that merges in the real data snapshot.
   --------------------------------------------------------------------------
   This file holds two kinds of data:

   1. STATIC config — things a human sets, not Google: which centres exist,
      their targets, who owns them, the Operations/Teacher directories, the
      course list. This is the source of truth for that data (edit it here,
      or through the Operations/Teacher directory screens).

   2. REVIEW data placeholders — rating, review counts, AI summaries, recent
      reviews. These start as zeroed/empty placeholders below, then get
      filled in by loadSnapshotData(), which fetches data/snapshot.json —
      the file the scheduled GitHub Action overwrites with real numbers
      pulled from Google (see scripts/refresh-data.js). Every page must
      `await loadSnapshotData()` before rendering.
   ========================================================================== */

const SNAPSHOT = {
  lastRefreshed: null,

  centres: [
    {
      id: "alwarpet",
      name: "Alwarpet",
      city: "Chennai",
      location: "Alwarpet, Chennai",
      gmbUrl: "https://maps.app.goo.gl/jeTg64JXCfN9ZZ2e8",
      monthlyTarget: 20,
      owner: { name: "Monika", email: "monika@artiumacademy.com", role: "Operations Owner", cadence: "Weekly" },
      team: { manager: "Mahalakshmi", counsellor: "Poojalakshmi" },
      // -- filled in by loadSnapshotData() --
      rating: 0, totalReviews: 0, currentMonthReviews: 0,
      monthlyBreakdown: [], topThemes: [], aiSummary: "", teacherMentions: [], monthlySummaries: {}, periodToDate: null
    },
    {
      id: "thoraipakkam",
      name: "Thoraipakkam",
      city: "Chennai",
      location: "Thoraipakkam, Chennai",
      gmbUrl: "https://maps.app.goo.gl/NojWW5T3S64eqqUk9",
      monthlyTarget: 15,
      owner: { name: "Padma", email: "padma@artiumacademy.com", role: "Operations Owner", cadence: "Fortnightly" },
      team: { manager: "Padma Priya", counsellor: "Devika" },
      rating: 0, totalReviews: 0, currentMonthReviews: 0,
      monthlyBreakdown: [], topThemes: [], aiSummary: "", teacherMentions: [], monthlySummaries: {}, periodToDate: null
    },
    {
      id: "borewell-road",
      name: "Borewell Road",
      city: "Bangalore",
      location: "Borewell Road, Bangalore",
      gmbUrl: "https://maps.app.goo.gl/RF4yssx7sJh6tUuk6",
      monthlyTarget: 18,
      owner: { name: "Monika", email: "monika@artiumacademy.com", role: "Operations Owner", cadence: "Weekly" },
      team: { manager: "Dipali Modhvadia", counsellor: "Sneha KS" },
      rating: 0, totalReviews: 0, currentMonthReviews: 0,
      monthlyBreakdown: [], topThemes: [], aiSummary: "", teacherMentions: [], monthlySummaries: {}, periodToDate: null
    }
  ],

  recentReviews: [],

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
    "South Vocals", "North Vocals", "Western Vocals", "Guitar", "Keyboard"
  ],

  // Teacher Directory — real roster provided by Omkar (Sep 2026). No email
  // addresses were provided, so those are left blank rather than guessed —
  // update via the Teacher Directory screen once real addresses are known.
  // Mention counts are looked up live from each centre's teacherMentions
  // list (matched by name, scoped to the teacher's own centre only — this
  // is the "centre-specific matching" the brief calls for, so a teacher at
  // one centre never picks up mentions meant for a same-named teacher
  // elsewhere).
  teacherDirectory: [
    { id: 1, name: "Pooja Jagan", email: "", centreId: "alwarpet", course1: "South Vocals", course2: "Not Applicable" },
    { id: 2, name: "Rajashree", email: "", centreId: "alwarpet", course1: "South Vocals", course2: "Not Applicable" },
    { id: 3, name: "Anila", email: "", centreId: "alwarpet", course1: "South Vocals", course2: "Not Applicable" },
    { id: 4, name: "Vishnu", email: "", centreId: "alwarpet", course1: "South Vocals", course2: "Not Applicable" },
    { id: 5, name: "Boja", email: "", centreId: "alwarpet", course1: "Guitar", course2: "Not Applicable" },
    { id: 6, name: "Suriya Kumar", email: "", centreId: "alwarpet", course1: "Keyboard", course2: "Not Applicable" },
    { id: 7, name: "Alex George", email: "", centreId: "thoraipakkam", course1: "South Vocals", course2: "Not Applicable" },
    { id: 8, name: "Sobitha", email: "", centreId: "thoraipakkam", course1: "South Vocals", course2: "Not Applicable" },
    { id: 9, name: "Jisna", email: "", centreId: "thoraipakkam", course1: "South Vocals", course2: "Not Applicable" },
    { id: 10, name: "Dharshana", email: "", centreId: "thoraipakkam", course1: "South Vocals", course2: "Not Applicable" },
    { id: 11, name: "Shradhha", email: "", centreId: "thoraipakkam", course1: "Western Vocals", course2: "Not Applicable" },
    { id: 12, name: "Shiva", email: "", centreId: "thoraipakkam", course1: "Guitar", course2: "Not Applicable" },
    { id: 13, name: "Balu", email: "", centreId: "thoraipakkam", course1: "Keyboard", course2: "Not Applicable" },
    { id: 14, name: "Vrinda Pillai", email: "", centreId: "borewell-road", course1: "South Vocals", course2: "Not Applicable" },
    { id: 15, name: "Prachita Patil", email: "", centreId: "borewell-road", course1: "North Vocals", course2: "Not Applicable" },
    { id: 16, name: "Konoak Phom", email: "", centreId: "borewell-road", course1: "Western Vocals", course2: "Not Applicable" },
    { id: 17, name: "Gagan Kumar", email: "", centreId: "borewell-road", course1: "Guitar", course2: "Not Applicable" },
    { id: 18, name: "Joel Devraj", email: "", centreId: "borewell-road", course1: "Keyboard", course2: "Not Applicable" }
  ]
};

// Fetches data/snapshot.json and merges its review-derived fields into
// SNAPSHOT. Every protected page calls `await loadSnapshotData()` before
// rendering. Falls back to the zeroed placeholders above (with a console
// warning) if the fetch fails — e.g. when opening a page directly from
// disk, where the browser blocks fetching local files.
async function loadSnapshotData() {
  try {
    const res = await fetch("data/snapshot.json", { cache: "no-store" });
    if (!res.ok) throw new Error("snapshot.json responded " + res.status);
    const snap = await res.json();

    SNAPSHOT.lastRefreshed = snap.lastRefreshed;
    SNAPSHOT.recentReviews = snap.recentReviews || [];

    SNAPSHOT.centres.forEach(function (centre) {
      const data = snap.centres && snap.centres[centre.id];
      if (data) Object.assign(centre, data);
    });
  } catch (err) {
    console.warn("Could not load data/snapshot.json — showing empty placeholders.", err);
    SNAPSHOT.lastRefreshed = SNAPSHOT.lastRefreshed || new Date().toISOString();
  }
}

// Lets Node scripts (e.g. scripts/refresh-data.js) `require("../js/data.js")`
// to reuse the same static config (teacherDirectory, centre list) — no-op
// in the browser, where `module` doesn't exist.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SNAPSHOT };
}
