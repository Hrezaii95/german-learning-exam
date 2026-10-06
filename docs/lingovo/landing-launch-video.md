# Illustrated Lingovo landing with launch films

This release starts from council-fix commit `c8fc189f2ba0836f762b5f7b678ba534507b1eee` and restores the ivory/navy/cobalt/scarlet illustrated landing from `339afb8c653a0cdf31d5a20d2356f01cae2e22f3`. The council navigation, four-language selector, A1/C1 destinations and learning fixes remain in place. `/learn` keeps the council's compact catalogue.

The original portal, book learning path and four-skill artwork use the delivered motion component. All new visible landing copy supports Armenian, Russian, English and German. No new narration or TTS is generated.

| Interface | Launch film |
|---|---|
| Armenian | Armenian |
| Russian | Armenian, as requested |
| English | English |
| German | English fallback |

The portrait player has native controls, inline phone playback, a lightweight poster, `preload="none"`, and no autoplay. Changing between the English and Armenian versions replaces the player and starts paused. Film text equivalents are included as optional captions. The supplied movies retain their original “Coming soon” end cards; adjacent copy identifies them as launch previews and states that A1/C1 practice is available.

## Restore the two films before building

The original films are preserved as authenticated ChatGPT files rather than binary Git objects. Download/materialize these with the account's Library tools; use the returned local paths, which may contain `(1)` in the filenames:

- English: https://chatgpt.com/api/library/files/libfile_095e701178588191ad44f71ff33b8797/download
- Armenian: https://chatgpt.com/api/library/files/libfile_ba2cdf14332481919ec1eef48dcdcdcf/download

From `platform/`:

```sh
node scripts/prepare-launch-videos.mjs --english /absolute/path/English.mp4 --armenian /absolute/path/Armenian.mp4
```

The script checks the exact size and SHA-256 before copying into `apps/web/public/lingovo/launch/`. It fails on missing or substituted media. Both files are below 25 MiB. The build preflight verifies them; the actual website serves public same-origin MP4s from the export, with no ChatGPT authentication requirement for visitors.

## Verify and build

```sh
npm ci
npm run build -w @lingovo/c1
node packages/c1/build-css.mjs
npm run typecheck:web
npm run typecheck:web-tests
npx vitest run --config vitest.config.ts tests/web/lingovo-launch-video.test.ts tests/web/lingovo-unified-shell-behavior.test.ts
npm run build:cloudflare
npm run verify:lingovo-preview
LINGOVO_PREVIEW_URL=https://ACTUAL_PREVIEW node scripts/verify-landing-launch.mjs
```

The final checker covers four interface languages at 320, 390, 820 and 1440 widths, video switching and real playback, artwork loading, locale titles, existing A1/C1 links, and reduced-motion behavior. Set `CHROMIUM_EXECUTABLE_PATH` when using an existing compatible browser. The public build must retain `/lingovo/launch/` with both MP4s, posters and caption files.

The older council-only deployment handoff points to a different homepage. Deploy this revised branch/commit, and verify the illustration and films on `lingovo.am` before reporting success. Use the connected Cloudflare plugin for API actions and preserve the actual current Worker version for rollback. The current request prepares the release and brief; a later session performs the real-domain deployment.
