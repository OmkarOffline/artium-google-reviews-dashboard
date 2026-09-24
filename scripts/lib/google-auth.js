/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   Shared helper: exchanges the stored refresh token for a short-lived
   access token. Used by every script that calls a Google API.
   Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
   to be set as environment variables (GitHub Secrets in the Action, or
   exported in your terminal when running a script locally).
   ========================================================================== */

async function getAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing one of GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN. " +
      "Set them as environment variables (locally) or GitHub Secrets (in the Action)."
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error("Failed to refresh Google access token: " + JSON.stringify(json));
  }
  return json.access_token;
}

module.exports = { getAccessToken };
