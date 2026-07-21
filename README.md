# YouTube Creator OS

A web app that helps faceless and AI-content YouTube creators analyze public
channel data, spot outlier videos and breakout channels, find content gaps,
and turn analysis into video ideas.

## Requirements

- Node.js 20 or later
- npm 10 or later

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables
are required to install, run `npm run dev`, or build the app.

To exercise Channel Analyzer, Channel Compare, or the Opportunity Feed
against real YouTube data, create a `.env.local` file (never committed —
already covered by `.gitignore`) with:

```bash
YOUTUBE_API_KEY=your-own-key-here
```

## Scripts

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (single run)
npm run test:watch # Vitest (watch mode)
npm run build      # Production build
```

## Current scope

- **Stage 0** — Next.js App Router, TypeScript strict, Tailwind CSS, ESLint,
  Vitest, and a minimal landing page. Complete.
- **G1A** — YouTube channel resolution from a URL/handle (`lib/youtube/*`):
  parsing, quota cost table, and a server-only REST client. Complete.
- **G1B** — Channel Analyzer (`/analyzer`, `POST /api/analyzer`): analyzes up
  to 25 most recent videos of one channel, computes median views and a
  normal/outlier/strong-outlier rating per video. Complete.
- **G1C** — Channel Compare (`/compare`, `POST /api/compare`): compares 2 to
  5 channels side by side (subscribers, total views, video count, median
  views, analyzed videos, recent-video outlier rate). Each channel is
  analyzed independently — one channel failing does not block the others.
  Complete.
- **G1D** — Opportunity Feed (`/opportunities`, `POST /api/opportunities`):
  pools the videos from 2 to 5 channels that reached at least 2× their own
  channel's median views, deduplicated by video ID, into a single
  deterministically-sorted feed. Each channel only analyzes its 25 most
  recent videos, so the feed reflects that analyzed set — it is not an AI
  recommendation and not a measurement of growth or change over time.
  Complete.
- **G1E** — Research Workspace (`/workspace`): manually save an Opportunity
  Feed result (channels + result) to this browser's `localStorage`, and
  re-open its channels in `/opportunities` to analyze fresh (the user must
  click "Find opportunities" themselves — nothing runs automatically).
  Viewing a saved snapshot does not call `/api/opportunities` or the
  YouTube Data API, and does not load the saved videos' thumbnails; it only
  reads from `localStorage`. Navigation (opening a video on YouTube, or
  opening the channels in Opportunity Feed) only happens when the user
  explicitly clicks a link. Saved research stays only in this browser (no
  cloud sync, no account) and is a manually saved snapshot, not live data,
  automatic tracking, or growth tracking. `POST /api/opportunities` is the
  only API call this feature can trigger, and only when the user explicitly
  re-runs the analysis. Complete.
- **G1F** — Deterministic Title Pattern Finder (`lib/title-patterns/*`,
  `components/title-patterns/TitlePatternPanel.tsx`): a deterministic,
  non-AI analysis of the titles already present in an Opportunity Feed
  result, surfaced both on a live `/opportunities` result and on a saved
  `/workspace` snapshot. It detects repeated words, repeated two-word
  phrases, shared title openings/endings, "contains a number," and
  "contains a question mark" — each pattern is shown with how many of the
  analyzed videos it was found in and how many of the represented channels
  it was seen in (a minimum channel-spread requirement excludes patterns
  found in only one channel, but does not balance or cap how much any one
  channel contributes). Tokenization is a small Unicode-aware heuristic
  (NFKC normalization, `toLowerCase()`, a Unicode letter/digit regex) with
  small hand-picked English and Spanish stopword lists — it is not a
  complete natural-language pipeline for either language, does no stemming,
  and does no language detection. This only describes what repeats in the
  analyzed set; it is not a trend, not growth, not audience demand, not a
  prediction, not a recommendation, and not a claim about why any video
  performed well. It uses only the `OpportunityFeedResult` already in
  memory or already saved to `localStorage` — it makes no additional
  YouTube API request, calls no new endpoint, does not call
  `/api/opportunities`, does not load thumbnails, and never writes its
  report back to `localStorage`. Complete.

All YouTube API access goes through `lib/youtube/request.ts` (server-only,
API key sent via the `x-goog-api-key` header, never in the URL, never
exposed to the browser). No API key or other secret is ever written to
`localStorage`.

## Not yet implemented

Supabase, database connection, authentication, dashboard, watchlist (ongoing
tracking of channels), cloud sync, time-series/growth tracking, idea
generator, AI API, caching, and rate limiting. These are planned for later,
separately approved stages.
