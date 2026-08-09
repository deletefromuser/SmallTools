# Repository Guidelines

## Project Structure & Module Organization

This repository contains standalone browser automation scripts at the root. `goldfresh.js` is the original price monitor; `goldfresh_v2.js` is the active enhanced monitor with minimum/maximum thresholds, alerts, and panel controls. `test.html` is a local manual harness: it supplies `#now_price`, simulates prices, and loads `goldfresh_v2.js`. Keep related scripts at the root unless a descriptive subdirectory becomes necessary. There are no shared modules or automated test directories.

## Build, Test, and Development Commands

There is no package manifest or build system. Before committing, run:

```powershell
node --check goldfresh.js
node --check goldfresh_v2.js
git diff --check
```

The Node commands validate syntax; the Git command finds whitespace errors. For manual testing, open `test.html` in a browser. Its simulation crosses the default 900 and 945 limits. Start the monitor, optionally select an audio file, and use the page controls to test custom prices.

## Coding Style & Naming Conventions

Use four-space indentation, semicolons, double quotes, and lower camelCase names (`targetPrice`, `stopMonitoring`). Wrap browser scripts in an IIFE. Use descriptive `price_` DOM IDs such as `price_start`, `price_reset`, and `price_status_icon`.

Check DOM queries before use. Pair every created interval, timeout, `Audio`, or `AudioContext` with cleanup. When adding a notification path, ensure Reset and manual Stop can cancel it without changing unrelated monitoring state.

## Testing Guidelines

For monitor changes, manually test missing or invalid prices, invalid thresholds, both threshold crossings, stop/restart behavior, and selected-file versus fallback audio. Confirm alerts automatically stop monitoring, the indicator and Start/Stop controls update, Reset silences audio only, and the default fallback chime repeats five times but can be cancelled. Document manual steps in the pull request. If automated tests are added, put them in `test/` and name them after the script (for example, `test/goldfresh_v2.test.js`).

## Commit & Pull Request Guidelines

Use short imperative commit subjects, consistent with history (for example, `add price alert reset`). In pull requests, name the affected script, target page selectors, testing performed, and any visible panel changes. Include a screenshot or short recording for control-panel or browser-behavior updates.