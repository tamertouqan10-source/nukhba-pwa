# Nukhba PWA

Vanilla JS single-page PWA (no framework, no build step). Nonprofit K-12 tutoring platform: student/tutor/parent/admin roles, approval workflow, points system, skill maps, session notes.

- `index.html` — shell, loads Supabase SDK + Tabler icons (CDN) + Google Fonts, then `supabase.js`, then `app.js`
- `app.js` — all UI state, routing, rendering, DB call orchestration
- `supabase.js` — Supabase client init, auth, realtime subscriptions, DB helpers
- `styles/main.css` — all styling
- `sw.js` — service worker (bump cache version on any asset change or users get stale files)
- `supabase-setup.sql` — RLS policies + triggers; run manually in Supabase dashboard, not auto-deployed

## Architecture (don't fight this pattern — work within it)

- `State` is a single global object (app.js top). All UI state lives there.
- `render()` does a **full `app.innerHTML = fn()` re-render** of the whole page on every state change. There is no diffing/virtual DOM. This is intentional for a codebase this size — don't introduce a framework or a partial-render system without discussing it first.
- `navigate(page)` sets `State.page`, calls `render()`, then `loadPageData(page)`.
- `loadPageData` fetches are cached for 30s via `State.dataTimestamps` / `useCachedIfAvailable`. Any new loader you add must follow this same cache pattern — don't add a loader that bypasses it and hits Supabase on every render.
- Async data callbacks must guard with `if (State.page === page) render()` before touching the DOM — the user may have navigated away before the fetch resolved. Every new loader needs this guard.
- Realtime subscriptions go through `Realtime.subscribeNotifications` etc. in supabase.js and must be torn down in `NukhbaAuth.signOut()` via `Realtime.unsubscribeAll()`. If you add a new subscription, add its teardown too.

## Performance rules

- Because every state change re-renders the whole page, keep render functions cheap: no work in a render function that isn't proportional to what's visible. Don't call `render()` from high-frequency events (input/keyup/scroll) without debouncing.
- Don't add `setInterval` calls that call `render()` unconditionally — check what's actually changed, and make sure the interval is only ever registered once (guard against re-registering on re-login/re-render).
- Reuse the existing 30-second cache instead of adding ad-hoc fetch-on-every-render logic.
- Avoid `transition: all`, heavy `box-shadow` stacks, or `backdrop-filter` on elements that re-render frequently (lists, dashboards) — they get re-rasterized on every full re-render and compound jank.

## Design system — this app has a real identity, don't drift toward generic "AI app" defaults

Existing palette (`styles/main.css` `:root`) is warm/earthy, not SaaS-blue: `--bg:#F2EDE6` (cream), `--surface:#FAFAF8`, `--accent:#6B4C3B` (brown), `--teal:#4A8C7A`, `--amber:#B07840`, `--steel:#7B8FA1`, `--danger:#A84848`, plus `-soft` tint variants for each. Two-font system: `--font-display` (Cormorant Garamond, serif) for headings/numbers, `--font-body` (Inter) for UI text.

When adding UI:
- Use existing CSS custom properties — never hardcode a new hex color or introduce purple/blue/indigo gradient accents; they clash with this palette and read as generic AI-tool default.
- Don't add a hero gradient blob, glassmorphism, or heavy drop-shadow "SaaS card" look — this app's visual language is flat, warm, serif-accented.
- Use Tabler icons (`ti ti-*`) functionally (state, action) — not decoratively on every line. Don't add emoji into rendered UI copy.
- Match the existing spacing/radius tokens in `main.css` (`--r-md` etc.) instead of inventing new pixel values.
- Headings/big numbers → `var(--font-display)`. Body/labels/buttons → `var(--font-body)`. Don't mix in a third font.

## Coding conventions

- ES5-style function declarations (`function foo() {}`), `var`, no arrow functions/classes/async-await patterns beyond what's already used — match existing style in the file you're editing rather than introducing a new idiom.
- All user-controlled data going into `innerHTML` must pass through `esc()`. No exceptions.
- Disable submit buttons during in-flight requests (existing pattern: `btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span> ...'`) to prevent double-submit — follow it for any new form handler.
- Loading/data state keys per page must be unique (e.g. `'admin-tutors'` not reused as `'admin-students'`) — this exact bug has bitten this codebase before (see git history June 2026 fixes).

## Before calling anything done

- Run `/code-review` on the diff.
- If the change touches a real user-facing flow, actually exercise it (`/run` or manual) rather than relying on the review alone — this app has no automated test suite.
