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
