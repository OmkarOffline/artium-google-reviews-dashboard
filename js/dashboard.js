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
  document.getElementById("topbarSlot").innerHTML = renderTopbar("dashboard", SNAPSHOT);
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

  document.getElementById("statGrid").innerHTML =
    statTile("Average rating", avgRating.toFixed(1), starIcon("#eda100"), null) +
    statTile("Total reviews", totalReviews.toLocaleString("en-IN"), null, null) +
    statTile(monthLabel(state.monthKey) + " reviews", monthReviews, null, null) +
    statTile("Target completion", targetPct + "<span class=\"unit\">%</span>", null,
      targetPct >= 100 ? { text: "On target", up: true } : { text: (monthTarget - monthReviews) + " to go", up: false });
}

/* ---- Centre cards ---- */

function renderCentreCards() {
  const centres = selectedCentres();
  document.getElementById("centreGrid").innerHTML = centres.map(function (c) {
    const monthCount = monthCountFor(c, state.monthKey);
    const pct = Math.min(100, Math.round((monthCount / c.monthlyTarget) * 100));
    const over = monthCount >= c.monthlyTarget;
    return (
      '<div class="card centre-card">' +
        '<div class="centre-card-head">' +
          '<div>' +
            '<div class="name">' + c.name + '</div>' +
            '<div class="city">' + c.city + '</div>' +
          '</div>' +
          '<span class="rating-chip">' + starIcon("#b45900") + ' ' + c.rating.toFixed(1) + '</span>' +
        '</div>' +
        '<div class="centre-card-stats">' +
          '<div class="item"><div class="value">' + c.totalReviews + '</div><div class="label">Total reviews</div></div>' +
          '<div class="item"><div class="value">' + monthCount + ' / ' + c.monthlyTarget + '</div><div class="label">' + monthLabel(state.monthKey) + ' target</div></div>' +
        '</div>' +
        '<div>' +
          '<div class="meter"><div class="meter-fill' + (over ? " over" : "") + '" style="width:' + pct + '%"></div></div>' +
          '<div class="meter-caption"><span>' + pct + '% of target</span>' + (over ? '<span style="color:#006300">Target met</span>' : '') + '</div>' +
        '</div>' +
        '<div class="centre-card-summary">' +
          '<div class="ai-label">✦ AI summary</div>' +
          c.aiSummary +
          '<div class="theme-tags">' + c.topThemes.map(function (t) { return '<span class="theme-tag">' + t + '</span>'; }).join("") + '</div>' +
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
