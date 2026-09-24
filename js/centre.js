/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Centre Detail View logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async function () {
  if (!requireAuth()) return;
  await loadSnapshotData();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || SNAPSHOT.centres[0].id;
  const centre = centreById(SNAPSHOT, id);

  document.getElementById("sidebarSlot").innerHTML = renderSidebar("centre", SNAPSHOT, id);
  document.getElementById("topbarSlot").innerHTML = renderTopbar('<h1 class="topbar-title">' + (centre ? centre.name : "Centre") + '</h1>', SNAPSHOT);
  wireRefreshButton();

  if (!centre) {
    document.querySelector(".page").innerHTML =
      '<div class="card" style="padding:32px;text-align:center;color:var(--text-muted)">Centre not found. <a href="dashboard.html" style="color:var(--accent)">Back to dashboard</a></div>';
    return;
  }

  renderCentre(centre);
});

function renderCentre(centre) {
  const monthKey = currentMonthKey(SNAPSHOT);
  const monthCount = centre.monthlyBreakdown.find(function (m) { return m.month === monthKey; }).count;
  const pct = Math.min(100, Math.round((monthCount / centre.monthlyTarget) * 100));
  const over = monthCount >= centre.monthlyTarget;

  document.getElementById("breadcrumb").innerHTML =
    '<a href="dashboard.html">Dashboard</a><span>/</span><span class="current">' + centre.name + '</span>';

  document.getElementById("centreTitle").textContent = centre.name;
  document.getElementById("centreLocation").textContent = centre.location;
  document.getElementById("gmbLink").href = centre.gmbUrl;

  const monthIdx = centre.monthlyBreakdown.findIndex(function (m) { return m.month === monthKey; });
  const prevEntry = monthIdx > 0 ? centre.monthlyBreakdown[monthIdx - 1] : null;
  const ratingDelta = prevEntry ? Math.round((centre.rating - prevEntry.rating) * 10) / 10 : null;

  // "New reviews" — period-to-date vs the same date range last month,
  // computed by the data pipeline from real review timestamps (see
  // dashboard.js for the matching logic/comment). Falls back to the plain
  // month-so-far count until periodToDate exists on the snapshot.
  const hasPeriodData = !!centre.periodToDate;
  const periodCurrent = hasPeriodData ? centre.periodToDate.currentCount : monthCount;
  const periodDelta = hasPeriodData ? (centre.periodToDate.currentCount - centre.periodToDate.priorCount) : null;

  document.getElementById("statGrid").innerHTML =
    statTile({
      label: "Google rating", value: centre.rating.toFixed(1),
      icon: starIcon("#eda100"), iconBg: "#fdf3d9", tint: "#fdf3d9cc",
      delta: ratingDelta === null ? null : deltaFrom(ratingDelta, Math.abs(ratingDelta).toFixed(1), monthLabel(prevEntry.month))
    }) +
    statTile({
      label: "Total reviews", value: centre.totalReviews.toLocaleString("en-IN"),
      icon: reviewsIcon(), iconBg: "var(--accent-light)", tint: "#eaf1ffcc",
      caption: (monthCount > 0 ? "+" + monthCount + " this month" : "No new reviews this month") + " · Lifetime"
    }) +
    statTile({
      label: "New reviews", value: periodCurrent,
      icon: trendIcon(), iconBg: "#e4f7ec", tint: "#e4f7eccc",
      delta: (periodDelta === null || !hasPeriodData) ? null : deltaFrom(periodDelta, Math.abs(periodDelta), periodRangeLabel(centre.periodToDate.asOfDate, -1)),
      caption: hasPeriodData ? null : monthLabel(monthKey) + " so far"
    }) +
    // The headline number here is the completion %, not the static target
    // constant — a tile whose big number never changes isn't telling the
    // reader anything a caption couldn't, and it matches how the Dashboard's
    // own "Target completion" tile is built.
    statTile({
      label: "Target completion", value: pct, unit: "%",
      icon: targetChipIcon(), iconBg: "#f2e9ff", tint: "#f2e9ffcc",
      caption: monthCount + " of " + centre.monthlyTarget + " target · Owned by " + centre.owner.name,
      progressPct: pct
    });

  document.getElementById("aiSummaryText").textContent = centre.aiSummary;

  // Team — centre manager + academic counsellor. Only rendered for centres
  // where those names have actually been provided; no placeholder names.
  const teamEntries = [];
  if (centre.team) {
    if (centre.team.manager) teamEntries.push({ role: "Centre Manager", name: centre.team.manager });
    if (centre.team.counsellor) teamEntries.push({ role: "Academic Counsellor", name: centre.team.counsellor });
  }
  document.getElementById("teamInfo").innerHTML = teamEntries.length
    ? teamEntries.map(function (t) {
        const initials = t.name.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("");
        return (
          '<div class="team-row">' +
            '<div class="avatar">' + initials + '</div>' +
            '<div class="info"><div class="name">' + t.name + '</div><div class="role">' + t.role + '</div></div>' +
          '</div>'
        );
      }).join("")
    : '<div class="team-empty">Team details not yet added.</div>';

  // "Trending topics" — this month's topic mentions (already counted, so
  // "trending" means most-discussed right now, not a fabricated up/down
  // trend we don't have data for). Falls back to the plain theme list for
  // a month with no structured breakdown yet.
  const monthSummary = centre.monthlySummaries && centre.monthlySummaries[monthKey];
  const topics = monthSummary && monthSummary.topicMentions
    ? monthSummary.topicMentions.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, 5)
    : centre.topThemes.map(function (t) { return { topic: t, count: null }; });

  const trendingLabel = document.getElementById("trendingTopicsLabel");
  trendingLabel.style.display = "flex";
  trendingLabel.innerHTML = trendUpIcon() + '<span>Trending topics this month</span>';
  document.getElementById("themeTags").innerHTML = topics.map(function (t) {
    return '<span class="theme-tag">' + t.topic + (t.count !== null ? ' <span class="n">' + t.count + '</span>' : '') + '</span>';
  }).join("");

  // Review trend chart (single series)
  const chartColor = centreColor(centre.id);
  document.getElementById("chartLegend").innerHTML =
    '<div class="item"><span class="swatch" style="background:' + chartColor + '"></span>' + centre.name + '</div>';
  renderGroupedBarChart(document.getElementById("chartContainer"), {
    categories: centre.monthlyBreakdown.map(function (m) { return monthLabel(m.month); }),
    series: [{ name: centre.name, color: chartColor, values: centre.monthlyBreakdown.map(function (m) { return m.count; }) }]
  });

  // Monthly review breakdown (compact bar-in-list, with that month's average rating)
  const maxCount = Math.max.apply(null, centre.monthlyBreakdown.map(function (m) { return m.count; }));
  document.getElementById("monthBreakdownList").innerHTML = centre.monthlyBreakdown.map(function (m) {
    const w = Math.round((m.count / maxCount) * 100);
    return (
      '<div class="month-breakdown-row">' +
        '<span class="m">' + monthLabel(m.month) + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + w + '%"></div></div>' +
        '<span class="n">' + m.count + '</span>' +
        '<span class="r">' + (m.rating ? m.rating.toFixed(1) + '★' : '—') + '</span>' +
      '</div>'
    );
  }).join("");


  // Teacher mentions — ranked by mention count, with a bar showing relative share
  const rankedMentions = centre.teacherMentions.slice().sort(function (a, b) { return b.mentions - a.mentions; });
  const maxMentions = Math.max.apply(null, rankedMentions.map(function (t) { return t.mentions; }).concat([1]));
  document.getElementById("mentionsList").innerHTML = rankedMentions.map(function (t) {
    const initials = t.name === "Not Applicable" ? "—" : t.name.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("");
    const w = Math.round((t.mentions / maxMentions) * 100);
    return (
      '<div class="mention-item">' +
        '<div class="mention-row">' +
          '<div class="avatar">' + initials + '</div>' +
          '<div class="info"><div class="name">' + t.name + '</div><div class="course">' + t.course + '</div></div>' +
          '<span class="count">' + t.mentions + ' mentions</span>' +
        '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + w + '%"></div></div>' +
      '</div>'
    );
  }).join("");

  // Recent reviews for this centre — same markup/behaviour as the main
  // Dashboard's Recent reviews section (renderRecentReviews() in
  // dashboard.js), minus the per-card centre-name label, which would just
  // repeat this page's own title.
  const reviews = SNAPSHOT.recentReviews.filter(function (r) { return r.centreId === centre.id; });
  const list = document.getElementById("reviewList");
  const accent = centreColor(centre.id);
  const initials = centre.name.split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("");
  const tagBg = mixHex("#ffffff", accent, 0.12);
  if (!reviews.length) {
    list.innerHTML = '<div class="card" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No recent reviews for this centre.</div>';
  } else {
    list.innerHTML = reviews.map(function (r) {
      return (
        '<div class="card review-row" style="border-left-color:' + accent + '">' +
          '<div class="review-avatar" style="background:' + mixHex("#ffffff", accent, 0.16) + ';color:' + accent + '">' + initials + '</div>' +
          '<div class="review-body">' +
            '<div class="review-meta">' + starsRow(r.rating) + '<span class="review-date">' + formatDate(r.date) + '</span></div>' +
            '<p class="review-text">“' + r.text + '”</p>' +
            '<div class="review-tags">' + r.tags.map(function (t) { return '<span class="theme-tag" style="background:' + tagBg + ';color:' + accent + '">' + t + '</span>'; }).join("") + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  // Month navigation → Monthly Summary Drill-down (built next)
  document.getElementById("monthDrilldownLink").href = "month.html?id=" + centre.id + "&month=" + monthKey;
}
