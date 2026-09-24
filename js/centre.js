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
  const reviewsDelta = prevEntry ? (monthCount - prevEntry.count) : null;

  document.getElementById("statGrid").innerHTML =
    statTile({
      label: "Google rating", value: centre.rating.toFixed(1),
      icon: starIcon("#eda100"), iconBg: "#fdf3d9",
      delta: ratingDelta === null ? null : deltaFrom(ratingDelta, Math.abs(ratingDelta).toFixed(1), monthLabel(prevEntry.month))
    }) +
    statTile({
      label: "Total reviews", value: centre.totalReviews.toLocaleString("en-IN"),
      icon: reviewsIcon(), iconBg: "var(--accent-light)",
      caption: (monthCount > 0 ? "+" + monthCount + " this month" : "No new reviews this month") + " · Lifetime"
    }) +
    statTile({
      label: monthLabel(monthKey) + " reviews", value: monthCount, unit: "/ " + centre.monthlyTarget,
      icon: trendIcon(), iconBg: "#e4f7ec",
      delta: reviewsDelta === null ? null : deltaFrom(reviewsDelta, Math.abs(reviewsDelta), monthLabel(prevEntry.month))
    }) +
    statTile({
      label: "Monthly target", value: centre.monthlyTarget,
      icon: targetChipIcon(), iconBg: "#f2e9ff",
      caption: "Owned by " + centre.owner.name + " · " + centre.owner.role,
      progressPct: pct
    });

  document.getElementById("aiSummaryText").textContent = centre.aiSummary;

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
  document.getElementById("chartLegend").innerHTML =
    '<div class="item"><span class="swatch" style="background:#2a78d6"></span>' + centre.name + '</div>';
  renderGroupedBarChart(document.getElementById("chartContainer"), {
    categories: centre.monthlyBreakdown.map(function (m) { return monthLabel(m.month); }),
    series: [{ name: centre.name, color: "#2a78d6", values: centre.monthlyBreakdown.map(function (m) { return m.count; }) }]
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

  // Ownership
  document.getElementById("ownerInfo").innerHTML =
    '<div class="info-row"><span class="k">Owner</span><span class="v">' + centre.owner.name + '</span></div>' +
    '<div class="info-row"><span class="k">Email</span><span class="v">' + centre.owner.email + '</span></div>' +
    '<div class="info-row"><span class="k">Role</span><span class="v">' + centre.owner.role + '</span></div>' +
    '<div class="info-row"><span class="k">Cadence</span><span class="cadence-chip">' + centre.owner.cadence + '</span></div>';

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

  // Recent reviews for this centre
  const reviews = SNAPSHOT.recentReviews.filter(function (r) { return r.centreId === centre.id; });
  const list = document.getElementById("reviewList");
  if (!reviews.length) {
    list.innerHTML = '<div class="card" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No recent reviews for this centre.</div>';
  } else {
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

  // Month navigation → Monthly Summary Drill-down (built next)
  document.getElementById("monthDrilldownLink").href = "month.html?id=" + centre.id + "&month=" + monthKey;
}
