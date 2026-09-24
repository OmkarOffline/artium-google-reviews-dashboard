/* ==========================================================================
   Artium Academy — Google Reviews Dashboard
   One-off helper: prints every Business Profile location your Google
   account can access, with its exact resource name — the value you need
   to fill into scripts/centres.config.json.

   Run this AFTER:
     1. Google has approved your Business Profile API access request.
     2. You've generated a refresh token with scripts/get-refresh-token.js.

   Usage (from the project root, in Terminal):
     GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_REFRESH_TOKEN=... node scripts/list-locations.js
   ========================================================================== */

const { getAccessToken } = require("./lib/google-auth");

async function main() {
  const accessToken = await getAccessToken();

  const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers: { Authorization: "Bearer " + accessToken }
  });
  const accountsJson = await accountsRes.json();

  if (!accountsJson.accounts || !accountsJson.accounts.length) {
    console.log("No accounts found for this Google login. Make sure you signed in with the account that manages your Business Profile listings.");
    return;
  }

  for (const account of accountsJson.accounts) {
    console.log("\nAccount: " + account.name + "  (" + (account.accountName || "unnamed") + ")");

    const locationsRes = await fetch(
      "https://mybusinessbusinessinformation.googleapis.com/v1/" + account.name + "/locations?readMask=name,title,storefrontAddress",
      { headers: { Authorization: "Bearer " + accessToken } }
    );
    const locationsJson = await locationsRes.json();

    if (!locationsJson.locations || !locationsJson.locations.length) {
      console.log("  (no locations under this account)");
      continue;
    }

    locationsJson.locations.forEach(function (loc) {
      const address = loc.storefrontAddress
        ? [loc.storefrontAddress.addressLines, loc.storefrontAddress.locality].flat().filter(Boolean).join(", ")
        : "(no address on file)";
      console.log("  " + loc.name + "  —  " + loc.title + "  —  " + address);
    });
  }

  console.log("\nCopy the resource name that matches each of your 3 centres (the 'accounts/.../locations/...' string) into scripts/centres.config.json.");
}

main().catch(function (err) {
  console.error("Failed to list locations:", err);
  process.exit(1);
});
