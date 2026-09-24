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
      // -- filled in by loadSnapshotData() --
      rating: 0, totalReviews: 0, currentMonthReviews: 0,
      monthlyBreakdown: [], topThemes: [], aiSummary: "", teacherMentions: [], monthlySummaries: {}
    },
    {
      id: "thoraipakkam",
      name: "Thoraipakkam",
      city: "Chennai",
      location: "Thoraipakkam, Chennai",
      gmbUrl: "https://maps.app.goo.gl/NojWW5T3S64eqqUk9",
      monthlyTarget: 15,
      owner: { name: "Padma", email: "padma@artiumacademy.com", role: "Operations Owner", cadence: "Fortnightly" },
      rating: 0, totalReviews: 0, currentMonthReviews: 0,
      monthlyBreakdown: [], topThemes: [], aiSummary: "", teacherMentions: [], monthlySummaries: {}
    },
    {
      id: "borewell-road",
      name: "Borewell Road",
      city: "Bangalore",
      location: "Borewell Road, Bangalore",
      gmbUrl: "https://maps.app.goo.gl/RF4yssx7sJh6tUuk6",
      monthlyTarget: 18,
      owner: { name: "Monika", email: "monika@artiumacademy.com", role: "Operations Owner", cadence: "Weekly" },
      rating: 0, totalReviews: 0, currentMonthReviews: 0,
      monthlyBreakdown: [], topThemes: [], aiSummary: "", teacherMentions: [], monthlySummaries: {}
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
