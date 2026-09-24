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

// statTile now takes a single options object so callers can attach an
// icon chip, a caption line, and/or a progress bar without every call
// site having to pass a long list of positional nulls.
//   { label, value, unit, icon, iconBg, delta, caption, progressPct }
// Builds the { text, up } object statTile's delta option expects, from a
// raw numeric difference (already computed by the caller from real data).
// diff === 0 reads as "No change" rather than a slightly odd "↓ 0".
function deltaFrom(diff, formattedAbs, prevLabel) {
  if (diff === 0) return { text: "No change vs " + prevLabel, up: null };
  const arrow = diff > 0 ? "↑" : "↓";
  return { text: arrow + " " + formattedAbs + " vs " + prevLabel, up: diff > 0 };
}

function statTile(opts) {
  const iconChip = opts.icon
    ? '<div class="stat-tile-icon" style="background:' + (opts.iconBg || "var(--accent-light)") + '">' + opts.icon + '</div>'
    : "";
  const unit = opts.unit ? '<span class="unit">' + opts.unit + '</span>' : "";
  const delta = opts.delta
    ? '<div class="delta ' + (opts.delta.up ? "up" : (opts.delta.up === false ? "down" : "flat")) + '">' + opts.delta.text + '</div>'
    : "";
  const caption = opts.caption ? '<div class="stat-tile-caption">' + opts.caption + '</div>' : "";
  const progress = (opts.progressPct !== undefined && opts.progressPct !== null)
    ? '<div class="stat-tile-progress"><div class="fill" style="width:' + Math.min(100, Math.max(0, opts.progressPct)) + '%;background:' + targetBandColor(opts.progressPct) + '"></div></div>'
    : "";
  return (
    '<div class="card stat-tile">' +
      iconChip +
      '<div class="label">' + opts.label + '</div>' +
      '<div class="value">' + opts.value + unit + '</div>' +
      (delta || caption) +
      progress +
    '</div>'
  );
}

function reviewsIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg>';
}

// Target-completion progress bars share this 3-band colour scale everywhere
// they appear (Dashboard centre cards, both "Monthly target" stat tiles):
// 0–40% red, 41–70% yellow, 71–100% green — each band going from a punchy/
// dark shade at its low end to a lighter shade at its high end, except the
// green band which intensifies as it climbs (so 100% reads as the most
// "done" colour, not the palest).
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(hex1, hex2, t) {
  const a = hexToRgb(hex1), b = hexToRgb(hex2);
  return "rgb(" + lerp(a[0], b[0], t) + "," + lerp(a[1], b[1], t) + "," + lerp(a[2], b[2], t) + ")";
}
function targetBandColor(pct) {
  pct = Math.max(0, Math.min(100, pct));
  if (pct <= 40) return mixHex("#b91c1c", "#fca5a5", pct / 40);
  if (pct <= 70) return mixHex("#92400e", "#fde68a", (pct - 40) / 30);
  return mixHex("#86efac", "#15803d", (pct - 70) / 30);
}

function trendUpIcon() {
  return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>';
}

function trendIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>';
}

function targetChipIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>';
}

function refreshIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
}

/* ==========================================================================
   Shared sidebar + slim utility topbar — injected into every logged-in page
   ========================================================================== */

function navIcon(name) {
  const icons = {
    dashboard: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>',
    centres: '<path d="M3 21V8l9-5 9 5v13h-6v-7H9v7H3z"/>',
    reviews: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>',
    insights: '<path d="M12 2a1 1 0 0 1 1 1v1.06a8 8 0 0 1 6.94 6.94H21a1 1 0 1 1 0 2h-1.06A8 8 0 0 1 13 19.94V21a1 1 0 1 1-2 0v-1.06A8 8 0 0 1 4.06 13H3a1 1 0 1 1 0-2h1.06A8 8 0 0 1 11 4.06V3a1 1 0 0 1 1-1zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/>',
    targets: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z"/>',
    people: '<path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 0a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm0 2c-2.7 0-8 1.35-8 4.05V19h9.5v-1.95c0-1.14.5-2.06 1.29-2.79C9.86 13.45 8.87 13 8 13zm8 0c-.29 0-.62.02-.96.06 1.24.96 2.06 2.2 2.06 3.94V19h7v-1.95C24 14.35 18.7 13 16 13z"/>',
    teachers: '<path d="M12 2 1 7l11 5 9-4.09V17h2V7L12 2zM5 13.18v3.64L12 20l7-3.18v-3.64L12 16l-7-2.82z"/>',
    leaderboards: '<path d="M8 21h8v-2H8v2zM6 3v6a6 6 0 0 0 5 5.92V17H9v2h6v-2h-2v-2.08A6 6 0 0 0 18 9V3H6zM4 5h2v3a3 3 0 0 1-2-2.82V5zm16 .18V8a3 3 0 0 1-2 2.82V5h2z"/>',
    reports: '<path d="M6 2h9l5 5v15H6V2zm8 1.5V8h4.5L14 3.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h4v2H8V9z"/>',
    settings: '<path d="M19.4 13a7.97 7.97 0 0 0 0-2l2.1-1.6a.5.5 0 0 0 .12-.65l-2-3.4a.5.5 0 0 0-.6-.22l-2.5 1a8 8 0 0 0-1.73-1L14.4.5a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.63a8 8 0 0 0-1.73 1l-2.5-1a.5.5 0 0 0-.6.22l-2 3.4a.5.5 0 0 0 .12.65L4.6 11a7.97 7.97 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.12.65l2 3.4c.14.24.42.32.6.22l2.5-1c.53.44 1.11.78 1.73 1l.4 2.63c.05.24.26.4.5.4h4c.24 0 .45-.16.5-.4l.4-2.63a8 8 0 0 0 1.73-1l2.5 1c.24.1.46 0 .6-.22l2-3.4a.5.5 0 0 0-.12-.65L19.4 13zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>'
  };
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">' + (icons[name] || "") + '</svg>';
}

// A small self-authored flat-vector "desk scene" — laptop with a growth
// graph, guitar, plant, the real Artium mark on a mug, headphones and a
// notebook — sitting above the sidebar footer. Stands in for a photoreal
// illustration (no image-generation tool is available in this session);
// built entirely from inline shapes so it needs no external asset.
function sidebarIllustration() {
  return (
    '<div class="sidebar-illustration">' +
      '<svg viewBox="0 0 208 96" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<clipPath id="mugLogoClip"><circle cx="171" cy="72" r="6.5"/></clipPath>' +
        '</defs>' +

        '<line x1="0" y1="88" x2="208" y2="88" stroke="var(--border)" stroke-width="1.5"/>' +

        // guitar, leaning behind the laptop
        '<g transform="translate(20,20) rotate(18)" opacity="0.9">' +
          '<rect x="-2" y="-34" width="5" height="34" rx="2.5" fill="#c8894a"/>' +
          '<circle cx="0" cy="6" r="12" fill="#e3a86b"/>' +
          '<circle cx="0" cy="24" r="16" fill="#dc9a57"/>' +
          '<circle cx="0" cy="24" r="5.5" fill="#8a5a2b"/>' +
          '<line x1="0" y1="-34" x2="0" y2="38" stroke="#5c3a1a" stroke-width="0.8"/>' +
        '</g>' +

        // notebook + pen, front-left
        '<g transform="translate(10,70)">' +
          '<rect x="0" y="0" width="34" height="18" rx="2" fill="var(--surface)" stroke="var(--border)" stroke-width="1.2"/>' +
          '<line x1="5" y1="6" x2="29" y2="6" stroke="var(--border)" stroke-width="1.2"/>' +
          '<line x1="5" y1="10.5" x2="24" y2="10.5" stroke="var(--border)" stroke-width="1.2"/>' +
          '<line x1="5" y1="15" x2="27" y2="15" stroke="var(--border)" stroke-width="1.2"/>' +
          '<rect x="26" y="-10" width="3" height="20" rx="1.5" fill="#2563eb" transform="rotate(28 27.5 0)"/>' +
        '</g>' +

        // laptop, centre
        '<g transform="translate(64,28)">' +
          '<rect x="0" y="0" width="58" height="40" rx="3" fill="#1f2937"/>' +
          '<rect x="3" y="3" width="52" height="34" rx="1.5" fill="#111827"/>' +
          '<polyline points="8,28 18,20 27,24 37,12 49,8" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="49" cy="8" r="2.4" fill="#60a5fa"/>' +
          '<path d="M-4 40 L62 40 L57 47 L1 47 Z" fill="#cbd5e1"/>' +
        '</g>' +

        // headphones draped near the laptop
        '<g transform="translate(96,4)" opacity="0.9">' +
          '<path d="M2 16 A14 14 0 0 1 30 16" fill="none" stroke="#9aa4b2" stroke-width="2.4" stroke-linecap="round"/>' +
          '<rect x="-1" y="14" width="7" height="11" rx="3" fill="#9aa4b2"/>' +
          '<rect x="26" y="14" width="7" height="11" rx="3" fill="#9aa4b2"/>' +
        '</g>' +

        // mug with the real Artium mark
        '<g transform="translate(158,52)">' +
          '<rect x="0" y="8" width="26" height="24" rx="4" fill="var(--surface)" stroke="var(--border)" stroke-width="1.4"/>' +
          '<path d="M26 14 h6 a5 5 0 0 1 0 10 h-6" fill="none" stroke="var(--border)" stroke-width="1.4"/>' +
        '</g>' +
        '<g clip-path="url(#mugLogoClip)">' +
          '<image href="assets/logo-mark.jpg" x="164.5" y="65.5" width="13" height="13"/>' +
        '</g>' +
        '<circle cx="171" cy="72" r="6.5" fill="none" stroke="var(--surface)" stroke-width="1.4"/>' +

        // small plant, far right
        '<g transform="translate(188,58)">' +
          '<path d="M0 26 L4 10 L14 10 L18 26 Z" fill="#cbd5e1"/>' +
          '<path d="M9 10 C 2 4, 2 -6, 9 -10 C 12 -3, 11 5, 9 10 Z" fill="#4c9a5f"/>' +
          '<path d="M9 10 C 15 5, 17 -3, 14 -9 C 9 -6, 7 1, 9 10 Z" fill="#3f8552"/>' +
        '</g>' +
      '</svg>' +
    '</div>'
  );
}

function sidebarLink(href, iconName, label, active, extraRight) {
  return (
    '<a class="sidebar-link' + (active ? " active" : "") + '" href="' + href + '">' +
      navIcon(iconName) + '<span>' + label + '</span>' + (extraRight || "") +
    '</a>'
  );
}

// activePage: "dashboard" | "centre" | "operations" | "teachers" | "leaderboards"
//             | "ai-insights" | "targets" | "reports" | "settings"
// activeCentreId: set only when activePage === "centre", to highlight the
// right sub-link.
function renderSidebar(activePage, snapshot, activeCentreId) {
  const centreLinks = snapshot.centres.map(function (c) {
    const active = activePage === "centre" && c.id === activeCentreId;
    return '<a class="' + (active ? "active" : "") + '" href="centre.html?id=' + c.id + '">' + c.name + '</a>';
  }).join("");

  const soonBadge = '<span class="badge-soon">Soon</span>';

  return (
    '<aside class="sidebar">' +
      '<div class="sidebar-brand">' +
        '<img src="assets/logo-mark.jpg" alt="" />' +
        '<span class="name">Artium Academy</span>' +
      '</div>' +
      '<nav class="sidebar-nav">' +
        '<div class="sidebar-section">' +
          sidebarLink("dashboard.html", "dashboard", "Dashboard", activePage === "dashboard") +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-link' + (activePage === "centre" ? " active" : "") + '" style="cursor:default;">' +
            navIcon("centres") + '<span>Centres</span>' +
          '</div>' +
          '<div class="sidebar-subnav">' + centreLinks + '</div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          sidebarLink("reviews.html", "reviews", "Reviews", activePage === "reviews", soonBadge) +
          sidebarLink("ai-insights.html", "insights", "AI Insights", activePage === "ai-insights", soonBadge) +
          sidebarLink("targets.html", "targets", "Targets", activePage === "targets", soonBadge) +
        '</div>' +
        '<div class="sidebar-divider"></div>' +
        '<div class="sidebar-section">' +
          sidebarLink("operations.html", "people", "Operations Directory", activePage === "operations") +
          sidebarLink("teachers.html", "teachers", "Teachers", activePage === "teachers") +
          sidebarLink("teachers.html?view=leaderboards", "leaderboards", "Leaderboards", activePage === "leaderboards") +
        '</div>' +
        '<div class="sidebar-divider"></div>' +
        '<div class="sidebar-section">' +
          sidebarLink("reports.html", "reports", "Reports", activePage === "reports", soonBadge) +
          sidebarLink("settings.html", "settings", "Settings", activePage === "settings", soonBadge) +
        '</div>' +
      '</nav>' +
      sidebarIllustration() +
      '<div class="sidebar-footer">' +
        '<div class="tagline">Better Feedback<br/>Stronger Learning</div>' +
        '<div class="rule"></div>' +
        '<div class="links">PEOPLE &nbsp;·&nbsp; PROCESSES &nbsp;·&nbsp; PRODUCT</div>' +
      '</div>' +
    '</aside>'
  );
}

// titleHtml: left-hand content for the slim utility bar — usually a page
// title or a breadcrumb the page itself builds.
function renderTopbar(titleHtml, snapshot) {
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
      '<div class="topbar-left">' + (titleHtml || "") + '</div>' +
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

function hamburgerIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
}

function wireRefreshButton() {
  const btn = document.getElementById("refreshBtn");
  if (btn) {
    btn.addEventListener("click", function () {
      // This does NOT call Google live — that pull only happens on the
      // scheduled GitHub Action's cadence (see scripts/refresh-data.js).
      // This button just re-reads data/snapshot.json in case the Action has
      // run more recently than this page load, and re-renders from it.
      btn.classList.add("spinning");
      window.location.reload();
    });
  }
  const signOutBtn = document.getElementById("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", signOut);
  }
  wireSidebarToggle();
}

// Off-canvas sidebar for narrow viewports — a hamburger button (injected
// into the topbar's left slot) and a click-to-close overlay (injected once
// into the page) toggle a .open class on the sidebar itself.
function wireSidebarToggle() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  const topbarLeft = document.querySelector(".topbar-left");
  let toggleBtn = document.querySelector(".sidebar-toggle");
  if (!toggleBtn && topbarLeft) {
    toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "icon-btn sidebar-toggle";
    toggleBtn.title = "Menu";
    toggleBtn.innerHTML = hamburgerIcon();
    topbarLeft.insertBefore(toggleBtn, topbarLeft.firstChild);
  }

  function close() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  }
  function open() {
    sidebar.classList.add("open");
    overlay.classList.add("open");
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      sidebar.classList.contains("open") ? close() : open();
    });
  }
  overlay.addEventListener("click", close);
}

/* ==========================================================================
   Shared "coming soon" stub page — reviews.html, ai-insights.html,
   targets.html, reports.html, settings.html all just call this once
   they're logged in, so a nav click never dead-ends.
   ========================================================================== */
async function renderStubPage(activePage, title, description) {
  if (!requireAuth()) return;
  await loadSnapshotData();
  document.getElementById("sidebarSlot").innerHTML = renderSidebar(activePage, SNAPSHOT);
  document.getElementById("topbarSlot").innerHTML = renderTopbar('<h1 class="topbar-title">' + title + '</h1>', SNAPSHOT);
  wireRefreshButton();
  document.getElementById("stubContent").innerHTML =
    '<div class="card empty-state">' +
      '<div class="empty-state-icon">' + navIcon(activePage === "ai-insights" ? "insights" : activePage) + '</div>' +
      '<h2>' + title + ' is on the way</h2>' +
      '<p>' + description + '</p>' +
    '</div>';
}
