/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   ONE-TIME snapshot builder from a manually downloaded Google Takeout
   export ("Google Business Profile" data only), used as a stopgap while
   live Google Business Profile API access (case 2-7550000041066) is still
   pending approval.

   This is NOT the scheduled pipeline (that's scripts/refresh-data.js, which
   still needs scripts/centres.config.json filled in + live API access +
   GitHub secrets). This script is run manually, once, against a Takeout
   export folder, and reuses refresh-data.js's exact computation logic
   (monthly breakdown, period-to-date, teacher mentions, topic tagging,
   sentiment) so the two pipelines produce directly comparable output.

   Difference from the live pipeline: Takeout has no averageRating/
   totalReviewCount API fields, so averageRating here is computed as the
   mean of each review's own star rating. And since there is no
   ANTHROPIC_API_KEY call available in this environment, the aiSummary /
   topThemes / monthly wentWell/wentWrong fields below are written by hand,
   grounded in an actual read of every real review comment in this export
   (not fabricated) — see the _comment field in the output snapshot for
   details.

   Usage: node scripts/build-snapshot-from-takeout.js <path-to-Takeout-Google-Business-Profile-folder>
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const takeoutRoot = process.argv[2];
if (!takeoutRoot) {
  console.error("Usage: node build-snapshot-from-takeout.js <path-to-Takeout/Google Business Profile>");
  process.exit(1);
}

const SNAPSHOT_PATH = path.join(__dirname, "..", "data", "snapshot.json");
const DATA_JS_PATH = path.join(__dirname, "..", "js", "data.js");
const { SNAPSHOT } = require(DATA_JS_PATH);

const STAR_RATING_MAP = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const MONTHS_TO_KEEP = 6;

// Maps each Takeout location folder to our internal centreId, established
// by matching each location's data.json title/storefrontAddress against
// our known centres.
const LOCATION_TO_CENTRE = {
  "location-9668499767989773296": "alwarpet",
  "location-16069504495888815508": "thoraipakkam",
  "location-3807248102121437894": "borewell-road"
};

function findAccountDir(root) {
  const entries = fs.readdirSync(root).filter(function (f) { return f.startsWith("account-"); });
  if (!entries.length) throw new Error("No account-* directory found under " + root);
  return path.join(root, entries[0]);
}

function loadReviewsForLocation(locationDir) {
  const files = fs.readdirSync(locationDir).filter(function (f) {
    return f === "reviews.json" || /^reviews-.*\.json$/.test(f);
  });
  const byId = {};
  files.forEach(function (f) {
    const data = JSON.parse(fs.readFileSync(path.join(locationDir, f), "utf8"));
    (data.reviews || []).forEach(function (r) { byId[r.name] = r; });
  });
  return Object.values(byId).sort(function (a, b) { return a.createTime.localeCompare(b.createTime); });
}

function monthKeyOf(dateStr) { return dateStr.slice(0, 7); }

function lastNMonthKeys(n, fromDate) {
  const keys = [];
  const d = new Date(fromDate);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"));
  }
  return keys;
}

function computeMonthlyBreakdown(reviews, now, fallbackRating) {
  const months = lastNMonthKeys(MONTHS_TO_KEEP, now);
  const counts = {};
  const ratingSums = {};
  months.forEach(function (m) { counts[m] = 0; ratingSums[m] = 0; });
  reviews.forEach(function (r) {
    const mk = monthKeyOf(r.createTime);
    if (counts[mk] === undefined) return;
    counts[mk]++;
    ratingSums[mk] += STAR_RATING_MAP[r.starRating] || 0;
  });
  let carry = fallbackRating || 0;
  return months.map(function (m) {
    const rating = counts[m] > 0 ? Math.round((ratingSums[m] / counts[m]) * 10) / 10 : carry;
    carry = rating;
    return { month: m, count: counts[m], rating: rating };
  });
}

function computePeriodToDate(reviews, now) {
  const day = now.getDate();
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const priorMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const priorCutoff = new Date(now.getFullYear(), now.getMonth() - 1, day, 23, 59, 59, 999);
  let currentCount = 0, priorCount = 0;
  reviews.forEach(function (r) {
    const d = new Date(r.createTime);
    if (d >= curMonthStart && d <= now) currentCount++;
    else if (d >= priorMonthStart && d <= priorCutoff) priorCount++;
  });
  const asOfDate = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  return { asOfDate: asOfDate, currentCount: currentCount, priorCount: priorCount };
}

function computeTeacherMentions(teachers, reviews) {
  return teachers
    .filter(function (t) { return t.name !== "Not Applicable"; })
    .map(function (t) {
      const nameLower = t.name.toLowerCase();
      const firstNameLower = t.name.split(" ")[0].toLowerCase();
      const mentions = reviews.filter(function (r) {
        const text = (r.comment || "").toLowerCase();
        return text.includes(nameLower) || text.includes(firstNameLower);
      }).length;
      return { name: t.name, course: t.course1, mentions: mentions };
    })
    .sort(function (a, b) { return b.mentions - a.mentions; });
}

const THEME_KEYWORDS = {
  "teacher expertise": ["expert", "skilled", "skill", "talented", "knowledgeable", "technique", "mastery", "proficient", "experienced"],
  "teacher soft skills": ["patient", "patience", "kind", "encouraging", "friendly", "approachable", "caring", "supportive", "motivating", "warm", "calm", "attentive"],
  "teaching style": ["engaging", "fun", "interactive", "personalized", "personalised", "disciplined", "teaching style"],
  "teaching methods": ["teaching method", "hands-on", "hands on", "practical", "step-by-step", "step by step"],
  "curriculum": ["curriculum", "syllabus", "course content", "program", "programme", "structured course"],
  "ambience": ["ambience", "ambiance", "environment", "clean", "space", "atmosphere"],
  "staff support & communication": ["front desk", "reception", "staff", "coordinator", "communication", "responsive", "admin support"],
  "app experience": ["app", "online portal", "digital", "tracking attendance", "mobile app"],
  "performances": ["performance", "recital", "concert", "stage", "showcase", "annual day"],
  "exams": ["exam", "certification", "assessment", "grading test", "grade exam"],
  "scheduling": ["schedule", "scheduling", "slot", "slots", "timing", "booking", "weekend", "reschedule"],
  "pricing": ["price", "pricing", "fee", "expensive", "affordable", "cost"]
};

function hasKeyword(lowerText, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("\\b" + escaped + "\\b", "i").test(lowerText);
}

function tagsFor(text) {
  const lower = text.toLowerCase();
  const tags = [];
  Object.keys(THEME_KEYWORDS).forEach(function (theme) {
    const hit = THEME_KEYWORDS[theme].some(function (kw) { return kw && hasKeyword(lower, kw); });
    if (hit) tags.push(theme);
  });
  return tags.length ? tags.slice(0, 3) : ["general"];
}

function computeTopicMentions(reviews) {
  const counts = {};
  reviews.forEach(function (r) {
    tagsFor(r.comment || "").forEach(function (tag) {
      if (tag === "general") return;
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return Object.keys(counts)
    .map(function (topic) { return { topic: topic, count: counts[topic] }; })
    .sort(function (a, b) { return b.count - a.count; })
    .slice(0, 6);
}

function computeSentiment(reviews) {
  if (!reviews.length) return { positive: 0, neutral: 0, negative: 0 };
  let pos = 0, neu = 0, neg = 0;
  reviews.forEach(function (r) {
    const stars = STAR_RATING_MAP[r.starRating] || 0;
    if (stars >= 4) pos++;
    else if (stars === 3) neu++;
    else neg++;
  });
  const total = reviews.length;
  return {
    positive: Math.round((pos / total) * 100),
    neutral: Math.round((neu / total) * 100),
    negative: Math.round((neg / total) * 100)
  };
}

function averageRatingOf(reviews) {
  if (!reviews.length) return 0;
  const sum = reviews.reduce(function (acc, r) { return acc + (STAR_RATING_MAP[r.starRating] || 0); }, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

// Hand-written, grounded in an actual read of every commented review in
// /tmp/all_comments.txt for this export (Sep 2026). Not generated by an
// AI summarizer call (no ANTHROPIC_API_KEY available in this environment) —
// these are my own read of the real text, kept honest and specific rather
// than generic filler.
const HAND_WRITTEN = {
  alwarpet: {
    topThemes: ["teacher soft skills (patience with beginners)", "teacher continuity / staffing turnover", "carnatic & film-music vocal coaching"],
    aiSummary: "Alwarpet's reviews are dominated by praise for individual teachers' patience with beginners — Minija, Pooja and Ashwath are named by name in dozens of reviews, almost always for patient, encouraging carnatic and film-music vocal coaching. The recurring complaint, seen in a handful of low-star reviews spread across the last two years, is teacher continuity: one parent describes a child's teacher changing roughly every 2 months, and two detailed reviews (Dec 2024) allege paying for many classes with little progress. A few reviews also flag app/dashboard and OTP login issues.",
    monthly: {
      wentWell: [
        "Minija and Pooja both named and praised repeatedly for patient, encouraging teaching of beginners",
        "Several reviews describe visible vocal improvement over months of carnatic/film-music training",
        "Trial-class and demo experience described positively"
      ],
      wentWrong: [
        "One review (Mar 2026) raised concern about frequent teacher changes disrupting a young student's progress",
        "One review (Feb 2026) called teachers 'poorly qualified' and pricing too high"
      ]
    }
  },
  thoraipakkam: {
    topThemes: ["broad, friendly teaching staff (Balu, Shiva, Alex, Shobitha)", "trial-class rescheduling friction", "flexible scheduling for working adults"],
    aiSummary: "Thoraipakkam's praise is spread across a wider set of named teachers than Alwarpet — Balu (keyboard), Shiva (guitar), Alex (carnatic) and Shobitha/Prashanthini (vocals) are each called out for patience and clear teaching. The main friction point is the trial-class booking process: a Feb 2026 review and a similar one from Alwarpet both describe trial classes being repeatedly rescheduled by the academy. A Mar 2025 review also describes a difficult mid-course discontinuation/refund experience, and one Dec 2025 review alleges fake reviews affecting the centre's rating.",
    monthly: {
      wentWell: [
        "Balu, Shiva and Alex each individually praised for patient, clear teaching this period",
        "New enrollees describe demo/trial classes as informative and well-explained"
      ],
      wentWrong: [
        "One review (Feb 2026) describes a trial class being rescheduled multiple times",
        "One review (Dec 2025) raised a concern about suspected fake reviews affecting the centre's rating"
      ]
    }
  },
  "borewell-road": {
    topThemes: ["all-positive early reviews (new centre)", "Gagan (guitar) and Vrinda (carnatic) named repeatedly", "beginner-friendly onboarding"],
    aiSummary: "Borewell Road is a new location (first review Aug 2026) with only 18 reviews so far, all 4-5 stars and no negative reviews yet. A cluster of reviews from late Sept 2026 — likely following a review-collection push — praise Gagan sir (guitar) and Vrinda ma'am (carnatic) by name for being patient with complete beginners, and several parents mention young children (4-7 years old) enjoying their first classes.",
    monthly: {
      wentWell: [
        "Strong burst of 9 new 5-star reviews in the last week of September, most naming Gagan or Vrinda directly",
        "Multiple parents of young children (4-7yo) describe a positive first-class experience",
        "No negative reviews recorded yet at this centre"
      ],
      wentWrong: [
        "Sample size is still small (18 reviews total) — too early to identify a recurring complaint"
      ]
    }
  }
};

function main() {
  const accountDir = findAccountDir(takeoutRoot);
  const previousSnapshot = fs.existsSync(SNAPSHOT_PATH)
    ? JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"))
    : { centres: {} };

  const now = new Date();
  const currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

  const outCentres = {};
  const allRecentReviews = [];

  Object.keys(LOCATION_TO_CENTRE).forEach(function (locationDirName) {
    const centreId = LOCATION_TO_CENTRE[locationDirName];
    const centreConfig = SNAPSHOT.centres.find(function (c) { return c.id === centreId; });
    const locationDir = path.join(accountDir, locationDirName);
    const reviews = loadReviewsForLocation(locationDir);

    const previous = previousSnapshot.centres[centreId] || {};
    const averageRating = averageRatingOf(reviews);
    const monthlyBreakdown = computeMonthlyBreakdown(reviews, now, averageRating);
    const currentMonthReviews = (monthlyBreakdown.find(function (m) { return m.month === currentMonthKey; }) || {}).count || 0;
    const thisMonthReviews = reviews.filter(function (r) { return monthKeyOf(r.createTime) === currentMonthKey; });
    const periodToDate = computePeriodToDate(reviews, now);

    const teachers = SNAPSHOT.teacherDirectory.filter(function (t) { return t.centreId === centreId; });
    const teacherMentions = computeTeacherMentions(teachers, reviews);

    const hand = HAND_WRITTEN[centreId];
    const monthlySummaries = Object.assign({}, previous.monthlySummaries || {});
    monthlySummaries[currentMonthKey] = {
      aiSummary: hand.aiSummary,
      wentWell: hand.monthly.wentWell,
      wentWrong: hand.monthly.wentWrong,
      topicMentions: computeTopicMentions(thisMonthReviews),
      sentiment: computeSentiment(thisMonthReviews)
    };

    outCentres[centreId] = {
      rating: averageRating,
      totalReviews: reviews.length,
      currentMonthReviews: currentMonthReviews,
      periodToDate: periodToDate,
      monthlyBreakdown: monthlyBreakdown,
      topThemes: hand.topThemes,
      aiSummary: hand.aiSummary,
      teacherMentions: teacherMentions,
      monthlySummaries: monthlySummaries
    };

    reviews.forEach(function (r) {
      allRecentReviews.push({
        centreId: centreId,
        rating: STAR_RATING_MAP[r.starRating] || 0,
        date: r.createTime.slice(0, 10),
        text: r.comment || "",
        tags: tagsFor(r.comment || "")
      });
    });

    console.log(centreConfig.name + ": " + reviews.length + " reviews, avg rating " + averageRating);
  });

  allRecentReviews.sort(function (a, b) { return b.date.localeCompare(a.date); });

  const snapshot = {
    _comment:
      "This snapshot was built manually from a Google Takeout export (\"Google Business Profile\" data only), downloaded by Omkar on " + now.toISOString().slice(0, 10) + ", NOT from the live Google Business Profile API (case 2-7550000041066 is still pending Google's approval — see scripts/refresh-data.js / .github/workflows/refresh-data.yml for the real pipeline, which will take over once that's approved and scripts/centres.config.json + the GitHub secrets are filled in). " +
      "This is a one-time snapshot, not an auto-refreshing one — running it again requires a fresh Takeout export. " +
      "rating is the mean of each review's own star rating (Takeout has no averageRating/totalReviewCount API field, unlike the live API). " +
      "aiSummary/topThemes/monthlySummaries.wentWell/wentWrong were written by hand after actually reading every commented review in this export (see /tmp/all_comments.txt on the machine this was built on) — not generated by an AI summarizer call, since no ANTHROPIC_API_KEY is available in this environment; topicMentions/sentiment/teacherMentions/monthlyBreakdown/periodToDate are all computed programmatically from the real review data, reusing refresh-data.js's exact logic. " +
      "KNOWN GAP: several teachers named frequently in real Alwarpet reviews (most notably 'Minija', plus 'Ashwath', 'Krishna'/'Krishna Sai', 'Sylvester', 'Anjali', 'Sooraj') are not in js/data.js's teacherDirectory, so they score 0 mentions below even though they are clearly current, actively-reviewed teachers — the teacherMentions numbers only reflect the 18 teachers currently in the roster. Worth updating the roster before trusting teacherMentions.",
    lastRefreshed: now.toISOString(),
    centres: outCentres,
    recentReviews: allRecentReviews.slice(0, 10)
  };

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log("Wrote " + SNAPSHOT_PATH);
}

main();
