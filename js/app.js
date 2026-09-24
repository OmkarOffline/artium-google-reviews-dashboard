/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Shared app logic — helpers used across every view
   ========================================================================== */

const MONTH_LABELS = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
};

function monthLabel(monthKey) {
  // monthKey looks like "2026-09"
  const [year, month] = monthKey.split("-");
  return MONTH_LABELS[month] + " " + year.slice(2);
}

function currentMonthKey(snapshot) {
  return snapshot.lastRefreshed.slice(0, 7);
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatRelativeRefresh(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

function centreById(snapshot, id) {
  return snapshot.centres.find(function (c) { return c.id === id; });
}

function overallStats(snapshot) {
  const centres = snapshot.centres;
  const totalReviews = centres.reduce(function (sum, c) { return sum + c.totalReviews; }, 0);
  const weightedRating = centres.reduce(function (sum, c) { return sum + c.rating * c.totalReviews; }, 0);
  const avgRating = totalReviews ? (weightedRating / totalReviews) : 0;
  const currentMonthReviews = centres.reduce(function (sum, c) { return sum + c.currentMonthReviews; }, 0);
  const currentMonthTarget = centres.reduce(function (sum, c) { return sum + c.monthlyTarget; }, 0);
  const targetPct = currentMonthTarget ? Math.round((currentMonthReviews / currentMonthTarget) * 100) : 0;
  return { totalReviews: totalReviews, avgRating: avgRating, currentMonthReviews: currentMonthReviews, currentMonthTarget: currentMonthTarget, targetPct: targetPct };
}

// Small inline star icon (filled) — used next to ratings.
function starIcon(colorVar) {
  return '<svg width="12" height="12" viewBox="0 0 20 20" fill="' + (colorVar || 'currentColor') + '"><path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z"/></svg>';
}

function statTile(label, value, icon, delta) {
  return (
    '<div class="card stat-tile">' +
      '<div class="label">' + label + '</div>' +
      '<div class="value">' + value + (icon ? ' ' + icon : '') + '</div>' +
      (delta ? '<div class="delta ' + (delta.up ? "up" : "down") + '">' + delta.text + '</div>' : '') +
    '</div>'
  );
}

function refreshIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
}

/* ==========================================================================
   Shared topbar — injected into every logged-in page
   ========================================================================== */

function renderTopbar(activePage, snapshot) {
  const nav = [
    { href: "dashboard.html", label: "Dashboard", key: "dashboard" },
    { href: "operations.html", label: "Operations Directory", key: "operations" },
    { href: "teachers.html", label: "Teachers", key: "teachers" }
  ];

  const navHtml = nav.map(function (item) {
    const activeClass = item.key === activePage ? " active" : "";
    return '<a class="' + activeClass.trim() + '" href="' + item.href + '">' + item.label + '</a>';
  }).join("");

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const userHtml = user ? (
    '<div class="user-chip" title="' + user.email + '">' +
      (user.picture
        ? '<img class="user-avatar" src="' + user.picture + '" alt="" referrerpolicy="no-referrer" />'
        : '<span class="user-avatar user-avatar-fallback">' + user.name.charAt(0) + '</span>') +
      '<span class="user-name">' + user.name.split(" ")[0] + '</span>' +
      '<button class="icon-btn" id="signOutBtn" title="Sign out" type="button">' + signOutIcon() + '</button>' +
    '</div>'
  ) : "";

  return (
    '<header class="topbar">' +
      '<div class="topbar-brand">' +
        '<span class="name">Artium Academy</span>' +
        '<span class="subtitle">Reviews Dashboard</span>' +
      '</div>' +
      '<nav class="topbar-nav">' + navHtml + '</nav>' +
      '<div class="topbar-right">' +
        '<div class="refresh-meta">' +
          '<span class="label">Last refreshed</span>' +
          '<span style="font-size:12.5px;font-weight:500;color:var(--text-primary)">' + formatRelativeRefresh(snapshot.lastRefreshed) + '</span>' +
        '</div>' +
        '<button class="icon-btn" id="refreshBtn" title="Refresh data" type="button">' + refreshIcon() + '</button>' +
        userHtml +
      '</div>' +
    '</header>'
  );
}

function signOutIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
}

function wireRefreshButton() {
  const btn = document.getElementById("refreshBtn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    // This does NOT call Google live — that pull only happens on the
    // scheduled GitHub Action's cadence (see scripts/refresh-data.js).
    // This button just re-reads data/snapshot.json in case the Action has
    // run more recently than this page load, and re-renders from it.
    btn.classList.add("spinning");
    window.location.reload();
  });
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", signOut);
  }
}
