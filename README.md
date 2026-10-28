# SignalScore

A personal prediction journal and Polymarket companion. Explore real questions, record your view and reasoning, and retain the market context behind each decision.

## Working in this version

- Six responsive workspace views: overview, live markets, journal, analyst watchlist, memory timeline and methodology.
- A read-only Vercel function (`api/markets.js`) fetches public Polymarket Gamma market data. No Polymarket API key is required.
- Browse markets by recent volume, inspect resolution rules and outcome price snapshots, filter loaded markets, refresh and load more.
- Save a selected market with its ID, outcome, optional confidence, reasoning, rules and source snapshot timestamp.
- Save personal predictions and analyst names locally, revisit notes, export a JSON backup and delete entries after confirmation.
- Existing browser journal entries remain supported.

## Not connected yet

- Walrus Memory mainnet writes and semantic recall.
- Tatum blockchain data.
- Automatic outcome checks, scoring and analyst claim ingestion.
- User accounts or cross-device persistence.

Journal entries are stored in localStorage on the current origin and browser. They are not independently timestamped proofs, cannot be transferred between the Sites and Vercel origins automatically, and are not sent to Walrus. Export a backup before clearing browser data. Market prices are retrieved snapshots, not guaranteed execution prices or verified outcomes. Closed does not mean resolved.

## Run locally

Requires Node.js 20 or newer.

```sh
npm test
npx vercel dev
```

Serve through Vercel development mode to support `/api/markets`; opening index.html directly will not run the server function. No build command is needed. Deploy the repository root with framework preset Other.

## Data flow

Browser → GET /api/markets → Polymarket Gamma → normalized market snapshot → local prediction journal.

The gateway accepts only GET, validates a bounded pagination offset, uses a fixed upstream host, enforces a timeout and returns an explicit error when the source is unavailable. It never substitutes demo data for a failed live request. Feed responses can be cached for 30 seconds, with stale responses served during revalidation for up to 60 seconds.

## Verification

`npm test` covers upstream normalization, invalid prices, request validation, pagination and upstream failures. These checks do not verify Walrus, Tatum, user authentication or automatic market scoring.

Independent project for the Tatum x Walrus Total Recall hackathon. Not affiliated with Polymarket, Tatum or Walrus.
