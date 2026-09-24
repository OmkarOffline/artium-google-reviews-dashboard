/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Centre Detail View logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async function () {
  if (!requireAuth()) return;
  await loadSnapshotData();
  document.getElementById("topbarSlot").innerHTML = renderTopbar("dashboard", SNAPSHOT);
  wireRefreshButton();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || SNAPSHOT.centres[0].id;
  const centre = centreById(SNAPSHOT, id);

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

  document.getElementById("statGrid").innerHTML =
    statTile("Google rating", centre.rating.toFixed(1), starIcon("#eda100"), null) +
    statTile("Total reviews", centre.totalReviews.toLocaleString("en-IN"), null, null) +
    statTile(monthLabel(monthKey) + " reviews", monthCount + ' <span class="unit">/ ' + centre.monthlyTarget + '</span>', null, null) +
    statTile("Target completion", pct + "<span class=\"unit\">%</span>", null,
      over ? { text: "Target met", up: true } : { text: (centre.monthlyTarget - monthCount) + " to go", up: false });

  document.getElementById("aiSummaryText").textContent = centre.aiSummary;
  document.getElementById("themeTags").innerHTML = centre.topThemes.map(function (t) {
    return '<span class="theme-tag">' + t + '</span>';
  }).join("");

  // Review trend chart (single series)
  document.getElementById("chartLegend").innerHTML =
    '<div class="item"><span class="swatch" style="background:#2a78d6"></span>' + centre.name + '</div>';
  renderGroupedBarChart(document.getElementById("chartContainer"), {
    categories: centre.monthlyBreakdown.map(function (m) { return monthLabel(m.month); }),
    series: [{ name: centre.name, color: "#2a78d6", values: centre.monthlyBreakdown.map(function (m) { return m.count; }) }]
  });

  // Monthly review breakdown (compact bar-in-list)
  const maxCount = Math.max.apply(null, centre.monthlyBreakdown.map(function (m) { return m.count; }));
  document.getElementById("monthBreakdownList").innerHTML = centre.monthlyBreakdown.map(function (m) {
    const w = Math.round((m.count / maxCount) * 100);
    return (
      '<div class="month-breakdown-row">' +
        '<span class="m">' + monthLabel(m.month) + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + w + '%"></div></div>' +
        '<span class="n">' + m.count + '</span>' +
      '</div>'
    );
  }).join("");

  // Ownership
  document.getElementById("ownerInfo").innerHTML =
    '<div class="info-row"><span class="k">Owner</span><span class="v">' + centre.owner.name + '</span></div>' +
    '<div class="info-row"><span class="k">Email</span><span class="v">' + centre.owner.email + '</span></div>' +
    '<div class="info-row"><span class="k">Role</span><span class="v">' + centre.owner.role + '</span></div>' +
    '<div class="info-row"><span class="k">Cadence</span><span class="cadence-chip">' + centre.owner.cadence + '</span></div>';

  // Teacher mentions
  document.getElementById("mentionsList").innerHTML = centre.teacherMentions.map(function (t) {
    const initials = t.name === "Not Applicable" ? "—" : t.name.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("");
    return (
      '<div class="mention-row">' +
        '<div class="avatar">' + initials + '</div>' +
        '<div class="info"><div class="name">' + t.name + '</div><div class="course">' + t.course + '</div></div>' +
        '<span class="count">' + t.mentions + ' mentions</span>' +
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
