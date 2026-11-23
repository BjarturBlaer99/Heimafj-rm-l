# Typography review — 3 November 2026

Migration note, 23 November: this text record is included in the GitHub handoff. The local review screenshots named below are not included in that publication. The removed experimental font directory is also historical, not a setup dependency.

**Superseded:** At the user's request, the Fraunces/Jost experiment was reverted.
All 11 application/configuration files now match their original typography, and
the experimental font assets were removed. Browser verification confirms Georgia
at weight 400 for the landing heading and the original Inter/system sans-serif
body stack. See `original-font-restored.png`. The notes below record the earlier
experiment only; it was never deployed to production.

Scope: apply freely licensed typography inspired by Spesía. Fraunces is used for
display headings and wordmarks, Jost for body text, controls and financial data.
The commercial reference fonts have not been copied. Font sources, versions,
licenses and glyph verification are documented in `app/fonts/README.md`.

## Verification

- TypeScript and ESLint checks passed on 30 October after the implementation.
- Production build passed on 3 November, including its TypeScript check and
  static page generation. The build reports an outdated Browserslist dataset;
  it does not prevent compilation.
- Independent final review found no actionable typography inconsistencies.
- All four bundled font files contain `ÁáÐðÉéÍíÓóÚúÝýÞþÆæÖö`.
- Jost supports tabular numerals; financial amounts retain this font.
- Browser checks used the local, in-memory fixture, not a real account.
- Visually reviewed the landing page at desktop and 390 px, dashboard at
  320/390 px, savings at 390 px, and login at desktop/320 px.
- At 320 px, the landing, dashboard, savings and login documents had no
  horizontal overflow. Relevant headings, labels, amounts and controls remained
  within the viewport.
- No browser console errors were captured during these checks.
- Browser viewport emulation does not replace testing on a physical iPhone.

## Evidence and preview

- `typography-desktop.png`: landing page at the default desktop viewport.
- `typography-mobile.png`: landing page at 390 px.
- `typography-dashboard-mobile.png`: synthetic account dashboard at 390 px.
- Local preview: http://127.0.0.1:5191/

The typography changes have not been deployed to production. Broader visual
changes remain recommendations, including a three-step introduction, larger
product examples, visible use cases and concise FAQ content on the landing page.
