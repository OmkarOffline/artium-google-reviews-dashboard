/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Operations Directory / Target Ownership logic
   --------------------------------------------------------------------------
   Edits here are in-memory only for now (no backend yet) — refreshing the
   page resets the directory to the sample list in js/data.js. Once this
   view is approved, wiring it to persistent storage is a drop-in change
   because all reads/writes already go through this same directory array.
   ========================================================================== */

let editingId = null;
let nextId = Math.max.apply(null, SNAPSHOT.operationsDirectory.map(function (p) { return p.id; })) + 1;

const state = { role: "Admin" };

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("topbarSlot").innerHTML = renderTopbar("operations", SNAPSHOT);
  wireRefreshButton();
  populateCentreSelect();
  wireRoleSwitcher();
  wireModal();
  render();
});

function populateCentreSelect() {
  const sel = document.getElementById("fieldCentre");
  sel.innerHTML =
    '<option value="all">All centres</option>' +
    SNAPSHOT.centres.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join("");
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

function render() {
  const canEdit = isAdmin();
  document.getElementById("addPersonBtn").style.display = canEdit ? "inline-flex" : "none";
  document.getElementById("readonlyNote").style.display = canEdit ? "none" : "block";

  const rows = SNAPSHOT.operationsDirectory.map(function (p) {
    const centre = p.centreId === "all" ? "All centres" : (centreById(SNAPSHOT, p.centreId) || {}).name;
    const roleClass = p.role.toLowerCase().replace(/\s+/g, "-");
    return (
      '<tr>' +
        '<td><div class="person-name">' + p.name + '</div><div class="person-email">' + p.email + '</div></td>' +
        '<td>' + centre + '</td>' +
        '<td><span class="role-badge ' + roleClass + '">' + p.role + '</span></td>' +
        '<td>' + p.cadence + '</td>' +
        '<td>' + (p.ownsTarget
          ? '<span class="target-owner-flag">● Owns target</span>'
          : '<span class="target-owner-flag none">—</span>') + '</td>' +
        '<td>' + (canEdit
          ? '<div class="row-actions">' +
              '<button type="button" data-edit="' + p.id + '">Edit</button>' +
              '<button type="button" class="danger" data-delete="' + p.id + '">Remove</button>' +
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
      btn.addEventListener("click", function () { deletePerson(parseInt(btn.dataset.delete, 10)); });
    });
  }
}

function deletePerson(id) {
  const idx = SNAPSHOT.operationsDirectory.findIndex(function (p) { return p.id === id; });
  if (idx !== -1) {
    SNAPSHOT.operationsDirectory.splice(idx, 1);
    render();
  }
}

/* ---- Modal ---- */

function wireModal() {
  document.getElementById("addPersonBtn").addEventListener("click", function () { openModal(null); });
  document.getElementById("modalCancelBtn").addEventListener("click", closeModal);
  document.getElementById("modalOverlay").addEventListener("click", function (e) {
    if (e.target === document.getElementById("modalOverlay")) closeModal();
  });
  document.getElementById("personForm").addEventListener("submit", function (e) {
    e.preventDefault();
    savePerson();
  });
}

function openModal(id) {
  editingId = id;
  const person = id ? SNAPSHOT.operationsDirectory.find(function (p) { return p.id === id; }) : null;

  document.getElementById("modalTitle").textContent = person ? "Edit person" : "Add person";
  document.getElementById("fieldName").value = person ? person.name : "";
  document.getElementById("fieldEmail").value = person ? person.email : "";
  document.getElementById("fieldCentre").value = person ? person.centreId : "all";
  document.getElementById("fieldRole").value = person ? person.role : "Operations Owner";
  document.getElementById("fieldCadence").value = person ? person.cadence : "Weekly";
  document.getElementById("fieldOwnsTarget").checked = person ? person.ownsTarget : false;

  document.getElementById("modalOverlay").classList.add("visible");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("visible");
  editingId = null;
}

function savePerson() {
  const data = {
    name: document.getElementById("fieldName").value.trim(),
    email: document.getElementById("fieldEmail").value.trim(),
    centreId: document.getElementById("fieldCentre").value,
    role: document.getElementById("fieldRole").value,
    cadence: document.getElementById("fieldCadence").value,
    ownsTarget: document.getElementById("fieldOwnsTarget").checked
  };

  if (!data.name || !data.email) return;

  if (editingId) {
    const person = SNAPSHOT.operationsDirectory.find(function (p) { return p.id === editingId; });
    Object.assign(person, data);
  } else {
    data.id = nextId++;
    SNAPSHOT.operationsDirectory.push(data);
  }

  closeModal();
  render();
}
