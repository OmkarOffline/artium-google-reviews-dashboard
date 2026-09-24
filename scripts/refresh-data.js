/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   The real data pipeline. Run on a schedule by
   .github/workflows/refresh-data.yml — pulls reviews for all 3 centres
   from the Google Business Profile API, computes the stats the dashboard
   needs, optionally asks Claude to write the AI summaries, and writes the
   result to data/snapshot.json (which the dashboard's js/data.js fetches
   on every page load).

   Requires (as environment variables / GitHub Secrets):
     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN  — required
     ANTHROPIC_API_KEY                                             — optional
       (without it, AI summaries are left unchanged from the previous run)

   Requires scripts/centres.config.json to be filled in with each centre's
   real Business Profile resource name (see scripts/list-locations.js).
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { getAccessToken } = require("./lib/google-auth");

const CENTRES_CONFIG_PATH = path.join(__dirname, "centres.config.json");
const SNAPSHOT_PATH = path.join(__dirname, "..", "data", "snapshot.json");
const DATA_JS_PATH = path.join(__dirname, "..", "js", "data.js");

const STAR_RATING_MAP = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const MONTHS_TO_KEEP = 6;

async function fetchAllReviews(locationName, accessToken) {
  let reviews = [];
  let pageToken = "";
  let averageRating = null;
  let totalReviewCount = null;

  do {
    const url =
      "https://mybusiness.googleapis.com/v4/" + locationName + "/reviews" +
      "?pageSize=50" + (pageToken ? "&pageToken=" + pageToken : "");
    const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
    const json = await res.json();

    if (!res.ok) {
      throw new Error("Reviews fetch failed for " + locationName + ": " + JSON.stringify(json));
    }

    reviews = reviews.concat(json.reviews || []);
    if (json.averageRating != null) averageRating = json.averageRating;
    if (json.totalReviewCount != null) totalReviewCount = json.totalReviewCount;
    pageToken = json.nextPageToken || "";
  } while (pageToken);

  return { reviews, averageRating, totalReviewCount };
}

function monthKeyOf(dateStr) {
  return dateStr.slice(0, 7); // "2026-09-22T..." -> "2026-09"
}

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
  // Average rating per month, computed only from that month's own reviews.
  // A month with zero reviews carries forward the previous month's average
  // (or the centre's current lifetime rating for the very first month) so
  // the trend line never misleadingly drops to zero for a quiet month.
  let carry = fallbackRating || 0;
  return months.map(function (m) {
    const rating = counts[m] > 0 ? Math.round((ratingSums[m] / counts[m]) * 10) / 10 : carry;
    carry = rating;
    return { month: m, count: counts[m], rating: rating };
  });
}

// Period-to-date vs the same date range last month (e.g. reviews from the
// 1st to today, compared with the 1st to the same day-of-month last month)
// — a fair apples-to-apples comparison rather than a full month vs a
// still-in-progress one. Computed from each review's real createTime, so
// it's exact once this pipeline is live; asOfDate is stored alongside the
// counts so the dashboard always labels them against the day they were
// actually counted to, not whatever day the browser happens to load on.
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

// Centre-specific fuzzy-ish matching: a teacher is only ever matched
// against reviews at their own centre, by case-insensitive name search
// against the review text.
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
  "teacher quality": ["teacher", "instructor", "faculty", "guru"],
  "teacher expertise": ["expert", "skilled", "talented", "knowledgeable"],
  "class quality": ["class", "lesson", "curriculum", "session"],
  "ambience": ["ambience", "ambiance", "environment", "clean", "space"],
  "pricing": ["price", "pricing", "fee", "expensive", "affordable", "cost"],
  "staff behavior": ["staff", "front desk", "reception", "behavior", "rude", "polite"],
  "tech-enabled experience": ["app", "technology", "tech", "online", "digital"],
  "app experience": ["app "],
  "learning environment": ["learning", "environment", "atmosphere"],
  "scheduling": ["schedule", "slot", "timing", "booking", "weekend"],
  "overall sentiment": []
};

function tagsFor(text) {
  const lower = text.toLowerCase();
  const tags = [];
  Object.keys(THEME_KEYWORDS).forEach(function (theme) {
    const hit = THEME_KEYWORDS[theme].some(function (kw) { return kw && lower.includes(kw); });
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

// Asks Claude to write the AI summary fields from real review text.
// Returns null (caller keeps previous values) if no API key is set or the
// call/parse fails — this pipeline should degrade gracefully, never crash
// the whole refresh over a summarization hiccup.
async function generateAiSummary(centreName, reviews, isMonthly) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !reviews.length) return null;

  const reviewText = reviews
    .slice(0, 60)
    .map(function (r) { return "- (" + (STAR_RATING_MAP[r.starRating] || "?") + "★) " + (r.comment || "(no text)"); })
    .join("\n");

  const schema = isMonthly
    ? '{"aiSummary": string, "wentWell": string[3], "wentWrong": string[2], "topicMentions": [{"topic": string, "count": number}], "sentiment": {"positive": number, "neutral": number, "negative": number}}'
    : '{"aiSummary": string, "topThemes": string[3]}';

  const prompt =
    "You are summarizing Google reviews for \"" + centreName + "\", a premium offline music education centre, for an internal operations dashboard. " +
    "Read the reviews below and respond with ONLY valid JSON matching this shape, no other text:\n" + schema + "\n\n" +
    "Reviews:\n" + reviewText;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const json = await res.json();
    const text = json.content && json.content[0] && json.content[0].text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.warn("AI summary generation failed for " + centreName + (isMonthly ? " (monthly)" : "") + ":", err.message);
    return null;
  }
}

async function main() {
  const { SNAPSHOT } = require(DATA_JS_PATH);
  const centresConfig = JSON.parse(fs.readFileSync(CENTRES_CONFIG_PATH, "utf8"));
  const previousSnapshot = fs.existsSync(SNAPSHOT_PATH)
    ? JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"))
    : { centres: {} };

  const missingConfig = SNAPSHOT.centres.filter(function (c) { return !centresConfig[c.id] || !centresConfig[c.id].name; });
  if (missingConfig.length) {
    console.error(
      "scripts/centres.config.json is missing a location for: " +
      missingConfig.map(function (c) { return c.id; }).join(", ") +
      ". Run scripts/list-locations.js to find the right values, fill them in, and re-run."
    );
    process.exit(1);
  }

  const accessToken = await getAccessToken();
  const now = new Date();
  const currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

  const outCentres = {};
  const allRecentReviews = [];

  for (const centre of SNAPSHOT.centres) {
    console.log("Fetching reviews for " + centre.name + "...");
    const locationName = centresConfig[centre.id].name;
    const { reviews, averageRating, totalReviewCount } = await fetchAllReviews(locationName, accessToken);

    const previous = previousSnapshot.centres[centre.id] || {};
    const monthlyBreakdown = computeMonthlyBreakdown(reviews, now, previous.rating);
    const currentMonthReviews = (monthlyBreakdown.find(function (m) { return m.month === currentMonthKey; }) || {}).count || 0;
    const thisMonthReviews = reviews.filter(function (r) { return monthKeyOf(r.createTime) === currentMonthKey; });
    const periodToDate = computePeriodToDate(reviews, now);

    const teachers = SNAPSHOT.teacherDirectory.filter(function (t) { return t.centreId === centre.id; });
    const teacherMentions = computeTeacherMentions(teachers, reviews);

    const lifetimeAi = await generateAiSummary(centre.name, reviews, false);
    const monthlyAi = await generateAiSummary(centre.name, thisMonthReviews, true);

    const monthlySummaries = Object.assign({}, previous.monthlySummaries || {});
    if (monthlyAi) {
      monthlySummaries[currentMonthKey] = monthlyAi;
    }

    outCentres[centre.id] = {
      rating: averageRating != null ? averageRating : (previous.rating || 0),
      totalReviews: totalReviewCount != null ? totalReviewCount : reviews.length,
      currentMonthReviews: currentMonthReviews,
      periodToDate: periodToDate,
      monthlyBreakdown: monthlyBreakdown,
      topThemes: lifetimeAi ? lifetimeAi.topThemes : (previous.topThemes || []),
      aiSummary: lifetimeAi ? lifetimeAi.aiSummary : (previous.aiSummary || ""),
      teacherMentions: teacherMentions,
      monthlySummaries: monthlySummaries
    };

    reviews.forEach(function (r) {
      allRecentReviews.push({
        centreId: centre.id,
        rating: STAR_RATING_MAP[r.starRating] || 0,
        date: r.createTime.slice(0, 10),
        text: r.comment || "",
        tags: tagsFor(r.comment || "")
      });
    });
  }

  allRecentReviews.sort(function (a, b) { return b.date.localeCompare(a.date); });

  const snapshot = {
    lastRefreshed: now.toISOString(),
    centres: outCentres,
    recentReviews: allRecentReviews.slice(0, 10)
  };

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log("Wrote " + SNAPSHOT_PATH);
}

main().catch(function (err) {
  console.error("Data refresh failed:", err);
  process.exit(1);
});
