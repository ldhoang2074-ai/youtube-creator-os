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
are required to run Stage 0.

## Scripts

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (single run)
npm run test:watch # Vitest (watch mode)
npm run build      # Production build
```

## Current scope: Stage 0 only

This repository currently contains only the Stage 0 bootstrap:

- Next.js App Router, TypeScript strict, Tailwind CSS, ESLint, Vitest.
- A minimal landing page.
- One real business-logic module (`lib/analysis/median.ts`) with real tests.

## Not yet implemented

Supabase, database connection, YouTube Data API integration, authentication,
dashboard, Channel Analyzer, Video Outlier Analyzer, Opportunity Finder,
Watchlist, Idea Generator, and deployment. These are planned for later,
separately approved stages.
