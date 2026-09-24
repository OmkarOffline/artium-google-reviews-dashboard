/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Monthly Summary Drill-down logic
   ========================================================================== */

let currentCentre = null;
let currentMonth = null;

document.addEventListener("DOMContentLoaded", async function () {
  if (!requireAuth()) return;
  await loadSnapshotData();
  document.getElementById("topbarSlot").innerHTML = renderTopbar("dashboard", SNAPSHOT);
  wireRefreshButton();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || SNAPSHOT.centres[0].id;
  currentCentre = centreById(SNAPSHOT, id);

  if (!currentCentre) {
    document.querySelector(".page").innerHTML =
      '<div class="card empty-note">Centre not found. <a href="dashboard.html" style="color:var(--accent)">Back to dashboard</a></div>';
    return;
  }

  currentMonth = params.get("month") || currentMonthKey(SNAPSHOT);

  renderTabs();
  renderMonth();
});

function renderTabs() {
  const months = currentCentre.monthlyBreakdown.map(function (m) { return m.month; });
  document.getElementById("monthTabs").innerHTML = months.map(function (m) {
    const entry = currentCentre.monthlyBreakdown.find(function (x) { return x.month === m; });
    const activeClass = m === currentMonth ? " active" : "";
    return '<button type="button" class="month-tab' + activeClass + '" data-month="' + m + '">' +
      monthLabel(m) + '<span class="n">' + entry.count + '</span></button>';
  }).join("");

  document.querySelectorAll(".month-tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentMonth = btn.dataset.month;
      history.replaceState(null, "", "month.html?id=" + currentCentre.id + "&month=" + currentMonth);
      renderTabs();
      renderMonth();
    });
  });
}

function renderMonth() {
  const centre = currentCentre;
  const monthEntry = centre.monthlyBreakdown.find(function (m) { return m.month === currentMonth; });
  const count = monthEntry ? monthEntry.count : 0;
  const summary = centre.monthlySummaries && centre.monthlySummaries[currentMonth];

  document.getElementById("breadcrumb").innerHTML =
    '<a href="dashboard.html">Dashboard</a><span>/</span>' +
    '<a href="centre.html?id=' + centre.id + '">' + centre.name + '</a><span>/</span>' +
    '<span class="current">' + monthLabel(currentMonth) + '</span>';

  document.getElementById("monthTitle").textContent = centre.name + " — " + monthLabel(currentMonth);
  document.getElementById("monthMeta").textContent =
    count + " reviews this month" + (centre.monthlyTarget ? " · target " + centre.monthlyTarget : "");

  if (!summary) {
    document.getElementById("monthContent").innerHTML =
      '<div class="card empty-note">AI summary not yet generated for ' + monthLabel(currentMonth) +
      '. Detailed summaries are currently available for the latest month — older months will fill in as we backfill the review history.</div>';
  } else {
    document.getElementById("monthContent").innerHTML = buildSummaryMarkup(summary);
  }

  renderMonthReviews();
}

function buildSummaryMarkup(summary) {
  const totalSentiment = summary.sentiment.positive + summary.sentiment.neutral + summary.sentiment.negative;
  const maxTopic = Math.max.apply(null, summary.topicMentions.map(function (t) { return t.count; }));

  return (
    '<div class="card" style="padding:20px;margin-bottom:var(--space-4);">' +
      '<div class="ai-label" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;">✦ AI summary</div>' +
      '<p style="font-size:13.5px;line-height:1.6;color:var(--text-secondary);margin:0;">' + summary.aiSummary + '</p>' +
    '</div>' +

    '<div class="two-col" style="margin-bottom:var(--space-4);">' +
      '<div class="card" style="padding:20px;">' +
        '<div class="went-card-heading well">✓ What went well</div>' +
        '<ul class="went-list well">' + summary.wentWell.map(function (w) { return '<li><span class="dot"></span>' + w + '</li>'; }).join("") + '</ul>' +
      '</div>' +
      '<div class="card" style="padding:20px;">' +
        '<div class="went-card-heading wrong">✕ What went wrong</div>' +
        '<ul class="went-list wrong">' + summary.wentWrong.map(function (w) { return '<li><span class="dot"></span>' + w + '</li>'; }).join("") + '</ul>' +
      '</div>' +
    '</div>' +

    '<div class="two-col">' +
      '<div class="card" style="padding:20px;">' +
        '<div class="section-heading" style="margin-bottom:14px;"><h2 style="font-size:14px;">Topic-wise mentions</h2></div>' +
        '<div class="topic-mentions-list">' +
          summary.topicMentions.map(function (t) {
            const w = Math.round((t.count / maxTopic) * 100);
            return '<div class="topic-row"><span class="label">' + t.topic + '</span>' +
              '<div class="bar-track"><div class="bar-fill" style="width:' + w + '%"></div></div>' +
              '<span class="n">' + t.count + '</span></div>';
          }).join("") +
        '</div>' +
      '</div>' +
      '<div class="card" style="padding:20px;">' +
        '<div class="section-heading" style="margin-bottom:14px;"><h2 style="font-size:14px;">Sentiment breakdown</h2></div>' +
        '<div class="sentiment-bar">' +
          '<div class="seg positive" style="width:' + (summary.sentiment.positive / totalSentiment * 100) + '%"></div>' +
          '<div class="seg neutral" style="width:' + (summary.sentiment.neutral / totalSentiment * 100) + '%"></div>' +
          '<div class="seg negative" style="width:' + (summary.sentiment.negative / totalSentiment * 100) + '%"></div>' +
        '</div>' +
        '<div class="sentiment-legend">' +
          '<div class="item"><span class="swatch positive"></span>Positive <span class="value">' + summary.sentiment.positive + '%</span></div>' +
          '<div class="item"><span class="swatch neutral"></span>Neutral <span class="value">' + summary.sentiment.neutral + '%</span></div>' +
          '<div class="item"><span class="swatch negative"></span>Negative <span class="value">' + summary.sentiment.negative + '%</span></div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function renderMonthReviews() {
  const reviews = SNAPSHOT.recentReviews.filter(function (r) {
    return r.centreId === currentCentre.id && r.date.slice(0, 7) === currentMonth;
  });

  const list = document.getElementById("monthReviewList");
  if (!reviews.length) {
    list.innerHTML = '<div class="card empty-note">No sample reviews logged for this month yet.</div>';
    return;
  }

  list.innerHTML = reviews.map(function (r) {
    return (
      '<div class="card review-row">' +
        '<div class="review-rating">' + r.rating + '★</div>' +
        '<div class="review-body">' +
          '<div class="review-meta">' + formatDate(r.date) + '</div>' +
          '<p class="review-text">' + r.text + '</p>' +
          '<div class="review-tags">' + r.tags.map(function (t) { return '<span class="theme-tag">' + t + '</span>'; }).join("") + '</div>' +
        '</div>' +
      '</div>'
    );
  }).join("");
}
