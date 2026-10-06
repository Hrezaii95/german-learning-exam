# Landing release validation

- Web TypeScript and focused ESLint: passed.
- Launch-video component and shared navigation behavior: 5 tests passed, including Armenian/Russian mapping, film replacement, no autoplay, native controls, locale persistence and video-error recovery.
- Actual Next.js rendering in Chromium: all 16 locale/width combinations reached and passed their assertions (hy/ru/en/de × 320/390/820/1440). Original artwork loaded; headings and document language matched; one shared language selector; no horizontal document overflow; no browser runtime errors; A1/C1 links present. Desktop and phone screenshots were visually reviewed.
- Both supplied MP4s: exact SHA-256/byte checks passed; FFmpeg decoded each complete 30-second H.264/AAC movie without errors.
- Browser playback: this session's open-source Chromium Headless Shell reports no H.264 or AAC decoder. The strict browser checker therefore stopped at playback with `NotSupportedError`. Actual playback must be checked with a compatible Chrome/Safari browser on the deployment preview and on the real domain; no successful browser-playback claim is made here.
- Public domain deployment: handed to the next session; this change does not publish or switch `lingovo.am`.

The platform root TypeScript configuration now excludes browser tests from its server-oriented pass and resolves the existing `@/` alias. Browser tests remain included in the dedicated `typecheck:web-tests` command. This repairs the council branch's omitted new browser-test exclusions rather than skipping their type validation.
