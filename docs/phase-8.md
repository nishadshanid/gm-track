# Phase 8 — Deploy and polish

**Goal:** it lives on both phones' home screens.

**Demo:** open the Pages URL on each phone, paste the PAT once, Add to Home
Screen. It opens full-screen and works.

## Scope

- `.github/workflows/deploy.yml` — FTrack's, with
  `paths-ignore: ['data.json', 'archive/**']` so data commits never rebuild the
  site.
- PWA: `manifest.webmanifest`, icons, `theme-color`, standalone display. No
  service worker beyond a minimal app-shell cache — the localStorage mirror
  already provides offline data.
- `README.md` — what it is, the private-repo + PAT setup, the storage model, and
  an explicit note that the PIN is not security.
- `src/utils/shareSummary.ts` — a weekly summary (weight trend, adherence,
  sessions, PRs) as text or an image, reusing FTrack's `html-to-image` approach.
- Loading and empty states everywhere, a framer-motion pass, and an "Import
  starter plan" button in Setup wired to `src/data/seed/*` so the seed can be
  re-applied or re-imported after a reset.

## Files

```
.github/workflows/deploy.yml
public/manifest.webmanifest  public/icons/*
README.md
src/utils/shareSummary.ts
```

## Notes

- `base: './'` plus HashRouter means the Pages URL works from any repo subpath
  with no server rewrites — already handled in Phase 1, verified here.
- Build-time env (`VITE_GH_OWNER` / `REPO` / `BRANCH` / `PATH`) goes in repository
  **Variables**, not Secrets — they are not secret. The PAT never touches the
  build.
- Check the deployed bundle for any leaked token or measurement before sharing the
  URL.

## Changed while building

- **No service worker.** The `localStorage` mirror already holds the whole
  dataset, so the app works offline without one; adding a service worker would
  buy only asset caching and bring a stale-bundle problem with it.
- **The summary is text, not an image.** `html-to-image` would add a dependency
  to produce something less useful: text pastes into any chat, stays readable
  when it arrives, and reports only what was logged.
- **Icons are rendered from `public/icons/icon.svg`** (a barbell, his plates
  blue and hers pink) into 192, 512 and 180 px PNGs.
- The workflow runs `lint` and `test` before building, so a broken push fails
  before it deploys.

## Verified

The production build was served from a `/gm2/` subpath, the way a project Pages
site is, and driven end to end:

- deep link straight to `#/insights` on a cold load — works, no failed requests
- logged breakfast (466 kcal / 24.6 g), three sets at 40 kg, and a weigh-in;
  Today reflected all three and a reload kept them
- manifest parses, `start_url` resolves to the subpath, all four icons return 200
- the weekly summary reads correctly from real data

Still outstanding: the GitHub round trip against a real private repo, which
needs a repo and a token.

## Done when

- A push to `main` deploys; a data commit does not.
- Both phones install it and sync.
- A cold visit with no PAT explains what to do rather than failing silently.
