/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Teacher Directory + Leaderboards logic
   --------------------------------------------------------------------------
   Mention counts are looked up from each centre's teacherMentions list,
   matched by name and scoped to the teacher's own centre only (centre-
   specific matching — a teacher never picks up another centre's mentions).
   Directory edits are in-memory only for now, same as Operations Directory.
   ========================================================================== */

let editingId = null;
let nextId = Math.max.apply(null, SNAPSHOT.teacherDirectory.map(function (t) { return t.id; })) + 1;

const requestedView = new URLSearchParams(window.location.search).get("view") === "leaderboards" ? "leaderboards" : "directory";
const state = { role: "Admin", view: requestedView };

// Leaderboard filters — separate from the directory's own state since they
// only affect the three leaderboard lists.
const lbState = { scope: "lifetime", monthKey: null, centreId: "all" };

document.addEventListener("DOMContentLoaded", async function () {
  if (!requireAuth()) return;
  await loadSnapshotData();
  lbState.monthKey = currentMonthKey(SNAPSHOT);
  const activePage = state.view === "leaderboards" ? "leaderboards" : "teachers";
  document.getElementById("sidebarSlot").innerHTML = renderSidebar(activePage, SNAPSHOT);
  document.getElementById("topbarSlot").innerHTML = renderTopbar('<h1 class="topbar-title">' + (state.view === "leaderboards" ? "Leaderboards" : "Teacher Directory") + '</h1>', SNAPSHOT);
  wireRefreshButton();
  populateSelects();
  populateLbMonthSelect();
  wireTabs();
  wireRoleSwitcher();
  wireModal();
  wireLbFilters();
  if (state.view === "leaderboards") {
    document.querySelectorAll("#viewTabs button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === "leaderboards");
    });
    document.getElementById("directorySection").style.display = "none";
    document.getElementById("leaderboardSection").style.display = "block";
  }
  render();
});

function populateLbMonthSelect() {
  const sel = document.getElementById("lbMonthSelect");
  const months = SNAPSHOT.centres[0].monthlyBreakdown.map(function (m) { return m.month; });
  sel.innerHTML = months.map(function (m) {
    return '<option value="' + m + '"' + (m === lbState.monthKey ? " selected" : "") + '>' + monthLabel(m) + '</option>';
  }).join("");
}

function wireLbFilters() {
  document.querySelectorAll("#lbScopePills button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#lbScopePills button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      lbState.scope = btn.dataset.scope;
      renderLeaderboards();
    });
  });
  document.getElementById("lbMonthSelect").addEventListener("change", function (e) {
    lbState.monthKey = e.target.value;
    renderLeaderboards();
  });
  document.getElementById("lbCentreSelect").addEventListener("change", function (e) {
    lbState.centreId = e.target.value;
    renderLeaderboards();
  });
}

function populateSelects() {
  const centreSel = document.getElementById("fieldCentre");
  centreSel.innerHTML = SNAPSHOT.centres.map(function (c) {
    return '<option value="' + c.id + '">' + c.name + '</option>';
  }).join("");

  [document.getElementById("fieldCourse1"), document.getElementById("fieldCourse2")].forEach(function (sel, idx) {
    let opts = SNAPSHOT.courseOptions.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join("");
    if (idx === 1) opts += '<option value="Not Applicable">Not Applicable</option>';
    sel.innerHTML = opts;
  });
}

function wireTabs() {
  document.querySelectorAll("#viewTabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#viewTabs button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      state.view = btn.dataset.view;
      document.getElementById("directorySection").style.display = state.view === "directory" ? "block" : "none";
      document.getElementById("leaderboardSection").style.display = state.view === "leaderboards" ? "block" : "none";
    });
  });
}

function wireRoleSwitcher() {
  document.getElementById("roleSwitcher").addEventListener("change", function (e) {
    state.role = e.target.value;
    render();
  });
}

function isAdmin() {
  return state.role === "Admin";
}

function mentionsFor(teacher) {
  const centre = centreById(SNAPSHOT, teacher.centreId);
  if (!centre || !centre.teacherMentions) return 0;
  const match = centre.teacherMentions.find(function (m) {
    return m.name.toLowerCase() === teacher.name.toLowerCase();
  });
  return match ? match.mentions : 0;
}

function render() {
  renderDirectory();
  renderLeaderboards();
}

/* ---- Directory ---- */

function renderDirectory() {
  const canEdit = isAdmin();
  document.getElementById("addTeacherBtn").style.display = canEdit ? "inline-flex" : "none";
  document.getElementById("readonlyNote").style.display = canEdit ? "none" : "block";

  const rows = SNAPSHOT.teacherDirectory.map(function (t) {
    const centre = centreById(SNAPSHOT, t.centreId);
    return (
      '<tr>' +
        '<td><div class="person-name">' + t.name + '</div><div class="person-email">' + t.email + '</div></td>' +
        '<td>' + (centre ? centre.name : "—") + '</td>' +
        '<td>' + t.course1 + '</td>' +
        '<td>' + (canEdit
          ? '<div class="row-actions">' +
              '<button type="button" data-edit="' + t.id + '">Edit</button>' +
              '<button type="button" class="danger" data-delete="' + t.id + '">Remove</button>' +
            '</div>'
          : '') + '</td>' +
      '</tr>'
    );
  }).join("");

  document.getElementById("directoryTableBody").innerHTML = rows;

  if (canEdit) {
    document.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { openModal(parseInt(btn.dataset.edit, 10)); });
    });
    document.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteTeacher(parseInt(btn.dataset.delete, 10)); });
    });
  }
}

function deleteTeacher(id) {
  const idx = SNAPSHOT.teacherDirectory.findIndex(function (t) { return t.id === id; });
  if (idx !== -1) {
    SNAPSHOT.teacherDirectory.splice(idx, 1);
    render();
  }
}

function wireModal() {
  document.getElementById("addTeacherBtn").addEventListener("click", function () { openModal(null); });
  document.getElementById("modalCancelBtn").addEventListener("click", closeModal);
  document.getElementById("modalOverlay").addEventListener("click", function (e) {
    if (e.target === document.getElementById("modalOverlay")) closeModal();
  });
  document.getElementById("teacherForm").addEventListener("submit", function (e) {
    e.preventDefault();
    saveTeacher();
  });
}

function openModal(id) {
  editingId = id;
  const teacher = id ? SNAPSHOT.teacherDirectory.find(function (t) { return t.id === id; }) : null;

  document.getElementById("modalTitle").textContent = teacher ? "Edit teacher" : "Add teacher";
  document.getElementById("fieldName").value = teacher ? teacher.name : "";
  document.getElementById("fieldEmail").value = teacher ? teacher.email : "";
  document.getElementById("fieldCentre").value = teacher ? teacher.centreId : SNAPSHOT.centres[0].id;
  document.getElementById("fieldCourse1").value = teacher ? teacher.course1 : SNAPSHOT.courseOptions[0];
  document.getElementById("fieldCourse2").value = teacher ? teacher.course2 : "Not Applicable";

  document.getElementById("modalOverlay").classList.add("visible");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("visible");
  editingId = null;
}

function saveTeacher() {
  const data = {
    name: document.getElementById("fieldName").value.trim(),
    email: document.getElementById("fieldEmail").value.trim(),
    centreId: document.getElementById("fieldCentre").value,
    course1: document.getElementById("fieldCourse1").value,
    course2: document.getElementById("fieldCourse2").value
  };

  if (!data.name || !data.email) return;

  if (editingId) {
    const teacher = SNAPSHOT.teacherDirectory.find(function (t) { return t.id === editingId; });
    Object.assign(teacher, data);
  } else {
    data.id = nextId++;
    SNAPSHOT.teacherDirectory.push(data);
  }

  closeModal();
  render();
}

/* ---- Leaderboards ---- */

function rankIcon(rank) {
  if (rank === 0) return '<span class="rank-badge medal">' + medalIcon("gold") + '</span>';
  if (rank === 1) return '<span class="rank-badge medal">' + medalIcon("silver") + '</span>';
  if (rank === 2) return '<span class="rank-badge medal">' + medalIcon("bronze") + '</span>';
  return '<span class="rank-badge">' + (rank + 1) + '</span>';
}

function renderLeaderboards() {
  renderTeacherLeaderboard();
  renderCentreHeadLeaderboard();
  renderOverallLeaderboard();
}

// Teacher mention counts only exist as lifetime totals on the snapshot
// (there's no per-review teacher attribution over time to break them down
// by month), so this list ignores the Lifetime/Current Month scope and
// always ranks by lifetime mentions — it does respect the centre filter.
function renderTeacherLeaderboard() {
  const teachers = lbState.centreId === "all"
    ? SNAPSHOT.teacherDirectory
    : SNAPSHOT.teacherDirectory.filter(function (t) { return t.centreId === lbState.centreId; });

  const ranked = teachers
    .map(function (t) { return { name: t.name, centre: centreById(SNAPSHOT, t.centreId).name, score: mentionsFor(t) }; })
    .sort(function (a, b) { return b.score - a.score; });

  document.getElementById("teacherLeaderboard").innerHTML = leaderboardRows(ranked, "mentions", "int");
}

// Target completion % is inherently a single month's metric, so this
// always reflects the selected month (from lbMonthSelect) regardless of
// the Lifetime/Current Month pill — the pill instead governs the Overall
// leaderboard, where "lifetime" vs. "this month" is a real distinction.
function renderCentreHeadLeaderboard() {
  const people = SNAPSHOT.operationsDirectory
    .filter(function (p) { return p.ownsTarget && p.centreId !== "all"; })
    .filter(function (p) { return lbState.centreId === "all" || p.centreId === lbState.centreId; });

  const ranked = people.map(function (p) {
    const centre = centreById(SNAPSHOT, p.centreId);
    const monthEntry = centre.monthlyBreakdown.find(function (m) { return m.month === lbState.monthKey; });
    const pct = Math.round(((monthEntry ? monthEntry.count : 0) / centre.monthlyTarget) * 100);
    return { name: p.name, centre: centre.name + " · " + monthLabel(lbState.monthKey), score: pct };
  }).sort(function (a, b) { return b.score - a.score; });

  document.getElementById("centreHeadLeaderboard").innerHTML = leaderboardRows(ranked, "%", "pct");
}

function renderOverallLeaderboard() {
  const centres = lbState.centreId === "all"
    ? SNAPSHOT.centres
    : SNAPSHOT.centres.filter(function (c) { return c.id === lbState.centreId; });

  const ranked = centres.map(function (c) {
    if (lbState.scope === "lifetime") {
      return { name: c.name, centre: c.totalReviews + " total reviews", score: c.rating };
    }
    const monthEntry = c.monthlyBreakdown.find(function (m) { return m.month === lbState.monthKey; });
    return {
      name: c.name,
      centre: (monthEntry ? monthEntry.count : 0) + " reviews · " + monthLabel(lbState.monthKey),
      score: monthEntry && monthEntry.rating ? monthEntry.rating : 0
    };
  }).sort(function (a, b) { return b.score - a.score; });

  document.getElementById("overallLeaderboard").innerHTML = leaderboardRows(ranked, "★", "rating");
}

// format: 'int' -> plain number + small unit label under it isn't shown, just suffix;
// 'pct' -> number + %; 'rating' -> one decimal + star
// Every leaderboard shows at most its top 5 — ranks 1–3 get a medal icon.
function leaderboardRows(ranked, unit, format) {
  if (!ranked.length) return '<div class="empty-note">No data yet.</div>';
  return ranked.slice(0, 5).map(function (r, i) {
    let display;
    if (format === "rating") display = r.score.toFixed(1) + " " + unit;
    else if (format === "pct") display = r.score + unit;
    else display = r.score + " " + unit;
    return (
      '<div class="leaderboard-row">' +
        rankIcon(i) +
        '<div class="info"><div class="name">' + r.name + '</div><div class="meta">' + r.centre + '</div></div>' +
        '<div class="score">' + display + '</div>' +
      '</div>'
    );
  }).join("");
}
