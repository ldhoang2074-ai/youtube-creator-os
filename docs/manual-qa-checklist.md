# Manual QA Checklist

Use this checklist for UI2 Stage 0 and extend it for each later UI2 stage. Record the browser, viewport, operating system, appearance mode, and test data used alongside the completed checklist.

## Reusable UI2 checks

### Layout and navigation

- [ ] Check the affected screens at representative desktop widths.
- [ ] Check the affected screens at representative mobile widths, including narrow screens.
- [ ] Confirm navigation links reach the expected routes and browser back/forward navigation still works.
- [ ] Confirm `/analyzer`, `/compare`, `/opportunities`, and `/workspace` remain usable with no unintended visual regressions.
- [ ] Check both dark and light system appearance where supported by the test environment.

### Accessibility and interaction

- [ ] Complete all affected flows using only the keyboard.
- [ ] Confirm every interactive element has a visible focus indicator.
- [ ] Confirm focus order is logical and no focus is trapped unexpectedly.
- [ ] Confirm controls have clear accessible names and status/error messages are announced appropriately.

### States and recovery

- [ ] Verify loading states without changing or hiding the existing client-side request loading states.
- [ ] Verify empty states with valid data that produces no results.
- [ ] Verify success states with representative results.
- [ ] Verify expected request error states and their user-facing messages.
- [ ] Trigger the relevant route error boundary in a development-only test and confirm its recovery message appears without a stack trace or sensitive details.
- [ ] Use the error boundary retry control and confirm the route recovers when the underlying error is removed.

### Images and browser health

- [ ] Confirm channel and video thumbnails render when a URL is available and fallbacks render when it is not.
- [ ] Confirm image dimensions reserve the intended space and no unexpected layout shift occurs while images load.
- [ ] Check the browser console for unexpected errors or warnings throughout the tested flows.

## Stage 0 verification

- [ ] The landing-page `Get Started` CTA navigates to `/analyzer` with normal link behavior.
- [ ] `/analyzer` is visually unchanged apart from the improved channel thumbnail quality when a better image is available.
- [ ] `/compare` is visually unchanged apart from the improved channel thumbnail quality when a better image is available.
- [ ] `/opportunities` is visually unchanged.
- [ ] `/workspace` is visually unchanged.
- [ ] A channel with multiple thumbnail sizes uses the best available image.
- [ ] A channel with only a `default` thumbnail still renders that image.
- [ ] A channel with no usable thumbnail preserves the existing fallback behavior.
- [ ] `app/error.tsx` shows the recovery UI for a thrown render error and its `Try again` action recovers after the cause is removed.
- [ ] Route transitions can show the lightweight root loading fallback without replacing feature-request loading indicators.
- [ ] No unexpected browser-console errors or warnings appear during Stage 0 verification.

## Stage 1 — Analyzer video grid

- [ ] A real channel result displays approximately 25 analyzed videos in the Analyzer grid.
- [ ] The Analyzer grid reflows from one column on narrow mobile to two and then three columns at wider viewports.
- [ ] The Analyzer grid has no horizontal overflow at a 390px mobile width.
- [ ] Thumbnail and null-thumbnail fallback dimensions remain stable at the same 16:9 ratio.
- [ ] No visible layout shift occurs while thumbnails load.
- [ ] Video thumbnails use lazy loading.
- [ ] Keyboard Tab order follows the card document order.
- [ ] Every YouTube video link has a visible focus indicator.
- [ ] Each card link opens the matching YouTube video.
- [ ] Null viewCount, likeCount, and commentCount render as "—".
- [ ] OutlierBadge renders every supported level correctly.
- [ ] The existing Analyzer empty state remains unchanged.
- [ ] Analyzer loading and error states remain unchanged.
- [ ] Review the Analyzer grid in light and dark appearance where supported by the test environment.
- [ ] The browser console contains no unexpected warnings or errors.

## Stage 2 — Workspace video grid

- [ ] Previously saved sessions still load.
- [ ] The outer session list remains a vertical management list.
- [ ] A session expands and collapses correctly.
- [ ] The inner video list renders as a responsive one-, two-, and three-column grid.
- [ ] A saved session containing videos from multiple channels displays the correct channel on each card.
- [ ] Title, thumbnail, date, duration, views, median views, multiplier, and badge are correct.
- [ ] Each YouTube card link opens the matching video.
- [ ] Keyboard Tab order follows document order.
- [ ] The focus indicator is visible.
- [ ] There is no horizontal overflow at approximately 390px.
- [ ] Thumbnail dimensions and null-thumbnail fallback remain stable.
- [ ] Thumbnails lazy-load without obvious layout shift.
- [ ] The manually saved snapshot disclosure remains visible.
- [ ] A zero-item saved session keeps the existing empty message.
- [ ] TitlePatternPanel remains visible for sessions with items.
- [ ] Saved failures remain visible.
- [ ] Open these channels in Opportunity Feed still works.
- [ ] Delete request, cancel, confirm, and error UI remain functional.
- [ ] Pre-existing saved-session data remains compatible.
- [ ] /opportunities still renders its existing table.
- [ ] /analyzer still renders the Stage 1 video grid.
- [ ] Review light and dark appearance where supported by the test environment.
- [ ] The browser console contains no unexpected warnings or errors.

## Stage 3 — Opportunities channel grid

- [ ] The channel grid appears alongside, not instead of, the existing video table.
- [ ] The channel grid reflows from one to two to three columns at wider viewports.
- [ ] The channel grid has no horizontal overflow near 390px.
- [ ] Channel cards follow submitted successful-channel order.
- [ ] Failed channels are excluded from the grid and remain in the failures list.
- [ ] A successful channel with no qualifying videos still appears in the grid.
- [ ] Each title and thumbnail matches the correct channel.
- [ ] Subscribers, total views, video count, median views, analyzed videos, and outlier rate are correct.
- [ ] Null median/outlier fallback is stable when naturally available.
- [ ] Thumbnail fallback is stable when naturally available.
- [ ] Thumbnails lazy-load without visible layout shift.
- [ ] Channel cards are static and contain no unexpected interactive elements.
- [ ] The existing video table still renders and keeps its ordering.
- [ ] The existing empty video-feed message still works.
- [ ] TitlePatternPanel remains correct.
- [ ] SaveResearchButton still saves only OpportunityFeedResult.
- [ ] A pre-Stage-3 saved session still loads and renders in Workspace.
- [ ] A newly saved Stage-3 session appears in Workspace.
- [ ] Newly persisted result contains items and failures only, with no channels field.
- [ ] Loading, invalid-input, malformed-response, and API-error behavior does not leave stale grid data.
- [ ] The Analyzer Stage 1 grid still works.
- [ ] The Workspace Stage 2 grid still works.
- [ ] Review light and dark appearance where supported by the test environment.
- [ ] The browser console contains no unexpected warnings or errors.
