# SignalScore

A personal prediction journal and Polymarket companion for the Tatum x Walrus Total Recall hackathon.

Live demo: https://signalscore-wheat.vercel.app

## Features and current verification

- Live Polymarket discovery, rules and price snapshots; linked prediction journaling with reasoning, JSON export and local deletion. Browser-tested.
- Outcome checking against final payout data or explicit legacy winner flags. Pending, refunded and unconfirmed markets are not assigned a correct/incorrect verdict. Public-source smoke-tested.
- Sui wallet personal-message sign-in, signed server sessions, wallet-derived memory namespaces and CSRF checks. Signature and isolation tests pass; real Suiet wallet sign-in was tested successfully on the production site.
- Walrus Memory mainnet write, job confirmation, semantic recall and copying recalled predictions back to the local journal. Production mainnet write and authenticated semantic recall tested successfully. The journal export dated 9 November 2026 contains 12 completed write receipts with 12 unique blob IDs across 11 markets. These are exported client receipts, not an independent re-query of every blob.
- Tatum native Sui gRPC read of the configured Walrus account object. Production mainnet read tested successfully on 9 November 2026, returning the configured account object and version.
- Analyst watchlist is local only. Automated analyst claim collection, AI coaching, background outcome schedules and independent prediction timestamp proofs are not implemented.

## Demo evidence and limitations

The submission dataset includes hypothetical forecasts created to exercise storage and recall. They are demonstration data, not researched recommendations or a proven forecasting track record. Two early entries concern the same market with different reasoning and distinct blob receipts. Authenticated recall also returned a saved entry after sign-out, refresh and reconnection during user testing.

A successful Tatum account read confirms that the configured Sui account object exists; it does not prove individual Walrus writes. Mainnet write receipts and authenticated recall provide separate evidence. No claim is made that an AI agent has learned autonomously from this dataset.

## Owner setup

1. At https://memory.walrus.xyz, connect a Sui wallet, create a mainnet Memory account and an app-specific delegate key. Keep the owner wallet key offline.
2. Add `MEMWAL_ACCOUNT_ID` (account object ID) and `MEMWAL_PRIVATE_KEY` (delegate key, never the owner key) as server-side production secrets in Vercel.
3. Create a Tatum API key at https://dashboard.tatum.io with Sui mainnet gRPC access. Add the production secret `TATUM_API_KEY`.
4. Set a random `SESSION_SECRET` of at least 32 characters. This deployment's signing secret has already been provisioned; do not replace it merely to add the other settings.
5. Redeploy. In Connections, connect a compatible Sui wallet and sign the login message. Test authenticated Walrus recall and the Tatum Sui account read.
6. Save a prediction, choose **Save to Walrus**, then **Check Walrus write**. Acceptance is not completion: confirm `done` plus a mainnet blob ID. Store at least 10 distinct meaningful memories for submission; retries reuse operation keys.
7. Search Memory by meaning. Copy individual matches into the local journal when needed. Recall is not a complete journal export.

## Trust and privacy

The project owns the Walrus account, following the documented operator-account pattern. Verified wallet addresses select namespaces; the operator's delegate can access all of them. Signing in does not transfer ownership to users. The server verifies personal-message signatures, binds challenges to host and expiry and uses Secure, HttpOnly, SameSite=Strict session cookies. API requests cannot choose another user's namespace. Keys remain server-side.

Saved prediction content passes through this app server and Walrus's managed relayer, which handles embeddings and Seal encryption. It is not end-to-end encrypted against the operator. Uploads require the user's Save to Walrus action. Local deletion removes only the browser copy, not remote Walrus data. Sign-out clears the session but leaves local notes on that device.

Local notes use the current browser origin's localStorage; the Sites and Vercel origins do not automatically share them. Export a backup before clearing browser data. User-entered dates and notes are not independent proof that a forecast preceded resolution.

## Data and evidence

`api/markets.js`: bounded GET requests to a fixed Gamma upstream, normalization, timeout and explicit errors. No example data replaces unavailable live data.

`api/resolution.js`: requires a terminal resolution with payout data; falls back to explicit CLOB winner flags. Prices or `closed` alone do not identify a winner. No trade or payment is executed.

`api/memory.js`: signed sessions, wallet-derived namespaces, bounded records, deterministic operation keys and status checks. A blob receipt appears only after a confirmed job from the same namespace. Search results are rendered as untrusted text.

`api/tatum.js`: reads the configured account object through Tatum's Sui mainnet gRPC gateway with a server-side API key. This confirms account existence, not individual memory storage. Write receipts are separate.

## Development and deployment

Node.js 20 or newer:

```sh
npm ci
npm test
npm run build
npx vercel dev
```

The build bundles the wallet-standard browser adapter to `assets/wallet.js`. Use Vercel framework **Other**, repository root, build command `npm run build`, output directory `.`. `/api` functions require Vercel development mode or deployment; opening HTML directly cannot run them. Use `.env.example` as a list of server settings, never commit real keys.

Tests cover signature verification, token tampering/expiry, cross-site rejection, namespace isolation, stable write operations, market normalization, pagination, payout handling and explicit winner flags. Tests using substitutes are not evidence of live Walrus or Tatum connectivity.

Independent project; not affiliated with Polymarket, Tatum or Walrus. Market prices are snapshots and not guaranteed execution prices.
