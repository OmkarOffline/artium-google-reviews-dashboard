/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Main Dashboard view logic
   All rendering reads from the in-memory SNAPSHOT object (js/data.js).
   Changing a filter re-renders from that same object — no new "API calls".
   ========================================================================== */

const state = {
  scope: "lifetime",       // 'lifetime' | 'month'
  centreId: "all",         // 'all' | centre id
  monthKey: null,
  rangeMonths: 6
};

document.addEventListener("DOMContentLoaded", async function () {
  if (!requireAuth()) return;
  await loadSnapshotData();
  state.monthKey = currentMonthKey(SNAPSHOT);
  document.getElementById("sidebarSlot").innerHTML = renderSidebar("dashboard", SNAPSHOT);
  document.getElementById("topbarSlot").innerHTML = renderTopbar('<h1 class="topbar-title">Dashboard</h1>', SNAPSHOT);
  wireRefreshButton();
  populateMonthSelect();
  wireFilters();
  renderAll();
});

function populateMonthSelect() {
  const sel = document.getElementById("monthSelect");
  const months = SNAPSHOT.centres[0].monthlyBreakdown.map(function (m) { return m.month; });
  sel.innerHTML = months.map(function (m) {
    return '<option value="' + m + '"' + (m === state.monthKey ? " selected" : "") + '>' + monthLabel(m) + '</option>';
  }).join("");
}

function wireFilters() {
  document.querySelectorAll("#scopePills button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#scopePills button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      state.scope = btn.dataset.scope;
      renderAll();
    });
  });

  document.getElementById("centreSelect").addEventListener("change", function (e) {
    state.centreId = e.target.value;
    renderAll();
  });

  document.getElementById("monthSelect").addEventListener("change", function (e) {
    state.monthKey = e.target.value;
    renderAll();
  });

  document.getElementById("rangeSelect").addEventListener("change", function (e) {
    state.rangeMonths = parseInt(e.target.value, 10);
    renderAll();
  });
}

function selectedCentres() {
  if (state.centreId === "all") return SNAPSHOT.centres;
  return SNAPSHOT.centres.filter(function (c) { return c.id === state.centreId; });
}

function monthCountFor(centre, monthKey) {
  const entry = centre.monthlyBreakdown.find(function (m) { return m.month === monthKey; });
  return entry ? entry.count : 0;
}

function monthEntryFor(centre, monthKey) {
  return centre.monthlyBreakdown.find(function (m) { return m.month === monthKey; });
}

function prevMonthKey(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-based; -2 lands one month back
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function renderAll() {
  renderStatTiles();
  renderCentreCards();
  renderChart();
  renderRecentReviews();
}

/* ---- KPI tiles ---- */

function renderStatTiles() {
  const centres = selectedCentres();
  const totalReviews = centres.reduce(function (s, c) { return s + c.totalReviews; }, 0);
  const weighted = centres.reduce(function (s, c) { return s + c.rating * c.totalReviews; }, 0);
  const avgRating = totalReviews ? (weighted / totalReviews) : 0;
  const monthReviews = centres.reduce(function (s, c) { return s + monthCountFor(c, state.monthKey); }, 0);
  const monthTarget = centres.reduce(function (s, c) { return s + c.monthlyTarget; }, 0);
  const targetPct = monthTarget ? Math.round((monthReviews / monthTarget) * 100) : 0;

  // Deltas, computed from the same monthly-breakdown data already on the
  // snapshot (not invented) — the month immediately before the one shown.
  const prevKey = prevMonthKey(state.monthKey);
  const prevReviews = centres.reduce(function (s, c) { const e = monthEntryFor(c, prevKey); return s + (e ? e.count : 0); }, 0);
  const prevRatingWeighted = centres.reduce(function (s, c) { const e = monthEntryFor(c, prevKey); return s + (e ? e.rating * e.count : 0); }, 0);
  const prevRatingCount = centres.reduce(function (s, c) { const e = monthEntryFor(c, prevKey); return s + (e ? e.count : 0); }, 0);
  const prevAvgRating = prevRatingCount ? (prevRatingWeighted / prevRatingCount) : null;
  const hasPrevMonth = centres.length > 0 && centres.every(function (c) { return !!monthEntryFor(c, prevKey); });

  const ratingDelta = (hasPrevMonth && prevAvgRating !== null)
    ? (Math.round((avgRating - prevAvgRating) * 10) / 10)
    : null;

  // "New reviews" — a true period-to-date comparison (e.g. 1–22 Sep vs
  // 1–22 Aug), not a hardcoded label: both counts and the date they're
  // cut off at come from the snapshot's periodToDate field, computed by
  // the data pipeline against real review timestamps at refresh time. It
  // only shows once every selected centre has that field.
  const hasPeriodData = centres.length > 0 && centres.every(function (c) { return !!c.periodToDate; });
  const periodCurrent = hasPeriodData ? centres.reduce(function (s, c) { return s + c.periodToDate.currentCount; }, 0) : monthReviews;
  const periodAsOf = hasPeriodData ? centres[0].periodToDate.asOfDate : null;
  const periodDelta = hasPeriodData
    ? periodCurrent - centres.reduce(function (s, c) { return s + c.periodToDate.priorCount; }, 0)
    : null;

  document.getElementById("statGrid").innerHTML =
    statTile({
      label: "Average rating", value: avgRating.toFixed(1),
      icon: starIcon("#eda100"), iconBg: "#fdf3d9", tint: "#fdf3d9cc",
      delta: ratingDelta === null ? null : deltaFrom(ratingDelta, Math.abs(ratingDelta).toFixed(1), monthLabel(prevKey))
    }) +
    statTile({
      label: "Total reviews", value: totalReviews.toLocaleString("en-IN"),
      icon: reviewsIcon(), iconBg: "var(--accent-light)", tint: "#eaf1ffcc",
      caption: (monthReviews > 0 ? "+" + monthReviews + " this month" : "No new reviews this month") + " · Lifetime"
    }) +
    statTile({
      label: "New reviews", value: periodCurrent,
      icon: trendIcon(), iconBg: "#e4f7ec", tint: "#e4f7eccc",
      delta: (periodDelta === null || !periodAsOf) ? null : deltaFrom(periodDelta, Math.abs(periodDelta), periodRangeLabel(periodAsOf, -1)),
      caption: (periodDelta === null || !periodAsOf) ? monthLabel(state.monthKey) + " so far" : periodRangeLabel(periodAsOf, 0)
    }) +
    statTile({
      label: "Target completion", value: targetPct, unit: "%",
      icon: targetChipIcon(), iconBg: "#f2e9ff", tint: "#f2e9ffcc",
      caption: monthReviews + " of " + monthTarget + " target · " + centres.length + " centre" + (centres.length === 1 ? "" : "s"),
      progressPct: targetPct
    });
}


/* ---- Centre cards ---- */

function renderCentreCards() {
  const centres = selectedCentres();
  document.getElementById("centreGrid").innerHTML = centres.map(function (c) {
    const monthCount = monthCountFor(c, state.monthKey);
    const pct = Math.min(100, Math.round((monthCount / c.monthlyTarget) * 100));
    const over = monthCount >= c.monthlyTarget;
    const barColor = targetBandColor(pct);

    const monthSummary = c.monthlySummaries && c.monthlySummaries[state.monthKey];
    const topics = monthSummary && monthSummary.topicMentions
      ? monthSummary.topicMentions.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, 5)
      : c.topThemes.map(function (t) { return { topic: t, count: null }; });

    return (
      '<div class="card centre-card">' +
        '<div class="centre-card-head">' +
          '<div class="name">' + c.name + '</div>' +
          '<div class="city">' + c.city + '</div>' +
        '</div>' +
        '<div class="centre-card-hero-stats">' +
          '<div class="hero-stat">' +
            '<div class="hv rating">' + c.rating.toFixed(1) + ' ' + starIcon("#eda100") + '</div>' +
            '<div class="hl">Google rating</div>' +
          '</div>' +
          '<div class="hero-stat">' +
            '<div class="hv reviews">' + c.totalReviews.toLocaleString("en-IN") + '</div>' +
            '<div class="hl">Total reviews</div>' +
          '</div>' +
        '</div>' +
        '<div class="centre-card-target-row">' +
          '<span class="target-count">' + monthCount + '<span class="muted">/' + c.monthlyTarget + '</span></span>' +
          '<span class="target-sub">' + monthLabel(state.monthKey) + ' target</span>' +
          '<div class="meter"><div class="meter-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>' +
          '<span class="target-pct" style="color:' + barColor + '">' + pct + '%</span>' +
        '</div>' +
        (over ? '<div class="target-met-note">Target met</div>' : "") +
        '<div class="centre-card-summary">' +
          '<div class="ai-label">✦ AI summary</div>' +
          c.aiSummary +
          '<div class="trending-topics-label">' + trendUpIcon() + '<span>Trending topics</span></div>' +
          '<div class="theme-tags">' + topics.map(function (t) { return '<span class="theme-tag">' + t.topic + (t.count !== null ? ' <span class="n">' + t.count + '</span>' : '') + '</span>'; }).join("") + '</div>' +
        '</div>' +
        '<div class="centre-card-footer">' +
          '<a class="link-arrow" href="centre.html?id=' + c.id + '">View centre details →</a>' +
        '</div>' +
      '</div>'
    );
  }).join("");
}

/* ---- Month-on-month chart ---- */

function renderChart() {
  const centres = selectedCentres();
  const allMonths = SNAPSHOT.centres[0].monthlyBreakdown.map(function (m) { return m.month; });
  const months = allMonths.slice(Math.max(0, allMonths.length - state.rangeMonths));

  const palette = ["#2a78d6", "#eb6834", "#1baf7a"];
  const series = centres.map(function (c, i) {
    return {
      name: c.name,
      color: palette[SNAPSHOT.centres.indexOf(c) % palette.length],
      values: months.map(function (m) { return monthCountFor(c, m); })
    };
  });

  document.getElementById("chartLegend").innerHTML = series.map(function (s) {
    return '<div class="item"><span class="swatch" style="background:' + s.color + '"></span>' + s.name + '</div>';
  }).join("");

  renderGroupedBarChart(document.getElementById("chartContainer"), {
    categories: months.map(monthLabel),
    series: series
  });
}

/* ---- Recent reviews ---- */

function renderRecentReviews() {
  const centreIds = selectedCentres().map(function (c) { return c.id; });
  let reviews = SNAPSHOT.recentReviews.filter(function (r) { return centreIds.indexOf(r.centreId) !== -1; });

  if (state.scope === "month") {
    reviews = reviews.filter(function (r) { return r.date.slice(0, 7) === state.monthKey; });
  }

  const list = document.getElementById("reviewList");
  if (!reviews.length) {
    list.innerHTML = '<div class="card" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No reviews in this view.</div>';
    return;
  }

  list.innerHTML = reviews.map(function (r) {
    const centre = centreById(SNAPSHOT, r.centreId);
    return (
      '<div class="card review-row">' +
        '<div class="review-rating">' + r.rating + '★</div>' +
        '<div class="review-body">' +
          '<div class="review-meta"><span class="centre-name">' + centre.name + '</span> &middot; ' + formatDate(r.date) + '</div>' +
          '<p class="review-text">' + r.text + '</p>' +
          '<div class="review-tags">' + r.tags.map(function (t) { return '<span class="theme-tag">' + t + '</span>'; }).join("") + '</div>' +
        '</div>' +
      '</div>'
    );
  }).join("");
}
