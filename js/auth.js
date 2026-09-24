/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Google Sign-In (Google Identity Services)
   --------------------------------------------------------------------------
   How this works:
   - The OAuth "Client" is set to Internal in Google Cloud, so only
     @artiumacademy.com Google accounts can complete sign-in at all —
     that restriction is enforced by Google, not by this code.
   - As a second, defense-in-depth check, we also confirm the signed-in
     account's "hd" (hosted domain) claim matches artiumacademy.com
     before letting anyone into the dashboard.
   - Session state lives in sessionStorage (cleared when the browser tab
     closes) — there's no backend yet, so this is a client-side session,
     not a server-verified one. That's an acceptable trade-off for an
     internal MVP; if this ever needs to be bulletproof against a
     determined attacker (not just keep casual/wrong access out), the
     next step is verifying the ID token server-side.
   ========================================================================== */

const GOOGLE_CLIENT_ID = "970396863553-mmbp55q6adb49ld1hb7trcf9ganea1ro.apps.googleusercontent.com";
const ALLOWED_DOMAIN = "artiumacademy.com";
const SESSION_KEY = "artiumUser";

function decodeJwt(token) {
  const payload = token.split(".")[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64).split("").map(function (c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join("")
  );
  return JSON.parse(json);
}

/* ---- Called on index.html (login page) ---- */

function initGoogleSignIn() {
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse
  });

  google.accounts.id.renderButton(
    document.getElementById("googleSignInSlot"),
    { theme: "outline", size: "large", width: 260, text: "signin_with", shape: "pill" }
  );
}

function handleCredentialResponse(response) {
  const errorBox = document.getElementById("loginError");
  let profile;
  try {
    profile = decodeJwt(response.credential);
  } catch (e) {
    errorBox.textContent = "Something went wrong reading your Google account. Please try again.";
    errorBox.classList.add("visible");
    return;
  }

  if (profile.hd !== ALLOWED_DOMAIN) {
    errorBox.textContent = "Your Google account isn't authorized for this dashboard. Contact your admin to be added.";
    errorBox.classList.add("visible");
    return;
  }

  errorBox.classList.remove("visible");

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    name: profile.name,
    email: profile.email,
    picture: profile.picture
  }));

  window.location.href = "dashboard.html";
}

/* ---- Called on every protected page ---- */

function getCurrentUser() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Redirects to the login page if there's no signed-in session.
// Returns the current user object when there is one.
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}
