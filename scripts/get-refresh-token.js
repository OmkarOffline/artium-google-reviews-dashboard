/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   ONE-TIME helper: run this once on your own Mac to get a Google "refresh
   token" — a long-lived credential that lets the scheduled GitHub Action
   pull review data without you having to log in every time.

   Before running this, create a SECOND OAuth Client in the same Google
   Cloud project as your login one (Clients → + Create client):
     - Application type: Desktop app
     - Name: something like "Artium Data Refresh - CLI"
   Desktop app clients automatically allow the http://localhost redirect
   this script uses, so there's no extra setup needed for that part.

   Usage (from the project root, in Terminal):
     GOOGLE_CLIENT_ID=your-desktop-client-id GOOGLE_CLIENT_SECRET=your-desktop-client-secret node scripts/get-refresh-token.js

   It will:
     1. Print a Google sign-in URL — open it in your browser and approve
        access using the Google account that manages all 3 GMB listings.
     2. Catch the redirect locally and exchange it for tokens.
     3. Print your refresh token — copy this into your GitHub repo's
        Settings → Secrets and variables → Actions, as GOOGLE_REFRESH_TOKEN.
        (Also add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET there, using
        this same Desktop app client's values.)
   ========================================================================== */

const http = require("http");
const { URL } = require("url");

const PORT = 53682;
const REDIRECT_URI = "http://127.0.0.1:" + PORT;
const SCOPE = "https://www.googleapis.com/auth/business.manage";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables first (from your Desktop app OAuth client).");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth" +
  "?client_id=" + encodeURIComponent(clientId) +
  "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) +
  "&response_type=code" +
  "&scope=" + encodeURIComponent(SCOPE) +
  "&access_type=offline" +
  "&prompt=consent";

console.log("\n1. Open this URL in your browser and sign in with the account that manages your 3 GMB listings:\n");
console.log(authUrl + "\n");
console.log("Waiting for you to approve access...\n");

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");

  if (!code) {
    res.end("No authorization code received. Close this tab and check the terminal.");
    return;
  }

  res.end("Success — you can close this tab and go back to the terminal.");
  server.close();

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI
      })
    });
    const tokenJson = await tokenRes.json();

    if (!tokenJson.refresh_token) {
      console.error("\nNo refresh token in the response. This usually means you've authorized this app before — revoke access at https://myaccount.google.com/permissions and try again.\n", tokenJson);
      process.exit(1);
    }

    console.log("\nYour refresh token (copy this into GitHub Secrets as GOOGLE_REFRESH_TOKEN):\n");
    console.log(tokenJson.refresh_token);
    console.log("\nAlso add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to GitHub Secrets, using this same Desktop app client's values.\n");
  } catch (err) {
    console.error("Token exchange failed:", err);
  }
});

server.listen(PORT);
