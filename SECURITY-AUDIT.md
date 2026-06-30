# Nukhba Security Audit Report
**Date:** June 2026  
**Scope:** Full frontend codebase — index.html, app.js, supabase.js, main.css, sw.js, manifest.json

---

## 1. Hardcoded Secrets Scan

| File | Finding | Action Taken |
|------|---------|--------------|
| `supabase.js` | `SUPABASE_URL` and `SUPABASE_KEY` present in frontend | **Acceptable** — this is the Supabase *anon/publishable* key. It is intentionally public and safe in frontend code. Supabase's Row Level Security (RLS) is the true enforcement layer. |
| `supabase.js` | No service-role key found | **Pass** |
| `app.js` | No API keys, tokens, or passwords found | **Pass** |
| `index.html` | No secrets found | **Pass** |
| All files | No private keys, Stripe keys, Claude API keys, or admin credentials | **Pass** |

**Action:** Added inline comment in `supabase.js` clearly documenting why the anon key is safe and reminding developers that service-role keys must only live in Vercel environment variables, never committed to Git.

**For Claude API (Step 6):** When you add Claude AI session notes, the Claude API key must be stored as a Vercel environment variable (`CLAUDE_API_KEY`) and called from a Vercel serverless function — never from frontend JS.

---

## 2. Input Sanitization

| Location | Issue Found | Fix Applied |
|----------|------------|-------------|
| Login modal | No input validation before auth call | Fixed — `Sanitize.email()` and `Sanitize.password()` now validate and clean all inputs |
| Sign-up form | No name or role validation | Fixed — `Sanitize.name()` enforces max 80 chars and strips HTML; role checked against allowlist |
| Session notes form | Free-text inputs (homework, flags) had no sanitization | Fixed — `Sanitize.text()` strips HTML and enforces limits before any DB write |
| Message system | Message body unvalidated | Fixed — `DB.sendMessage()` sanitizes body before insert |
| All inputs | No `maxlength` attributes on HTML inputs | Fixed — all inputs now have `maxlength` matching their server-side limit |
| All inputs | HTML injection possible via `innerHTML` with user data | Fixed — `Sanitize.strip()` escapes `<`, `>`, `"`, `'`, `` ` `` before any value reaches the DOM |

---

## 3. Rate Limiting

| Endpoint | Limit Applied |
|----------|--------------|
| Sign in (`NukhbaAuth.signIn`) | 5 attempts per 15 minutes (client-side) |
| Sign up (`NukhbaAuth.signUp`) | 5 attempts per 15 minutes (client-side) |

**Note:** Client-side rate limiting is a UX guard and defence-in-depth layer. Supabase Auth also enforces server-side rate limits independently. Client-side limits can be bypassed by a determined attacker — the server-side limits are the true enforcement.

---

## 4. Authentication & Authorization

| Issue | Status |
|-------|--------|
| Login form was not wired to Supabase Auth | **Fixed** — `NukhbaAuth.signIn()` now calls `supabase.auth.signInWithPassword()` |
| No sign-up flow existed | **Fixed** — `NukhbaAuth.signUp()` creates auth user and inserts into `users` table with `is_approved: false` |
| No session persistence | **Fixed** — `supabase.auth.getSession()` re-hydrates session on page load |
| Error messages leaked Supabase internals | **Fixed** — all auth errors return generic messages |
| Sign-out didn't clear Supabase session | **Fixed** — `NukhbaAuth.signOut()` calls `supabase.auth.signOut()` |
| Demo portal buttons bypass auth | **Accepted risk** — demo buttons are intentional for demonstration. In production, remove or protect them with an admin toggle. |
| `is_approved` check on every login | **Implemented** — users are checked and blocked if not approved before portal access |

---

## 5. HTTP Security Headers

Added via `vercel.json` (applied at CDN level on every response):

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (prevents clickjacking) |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (forces HTTPS) |
| `Content-Security-Policy` | Restricts scripts to `self` + CDN + Google Fonts only |
| `Permissions-Policy` | Blocks camera, microphone, geolocation |

---

## 6. Database Write Safety

| Issue | Fix |
|-------|-----|
| Raw `.insert()` calls possible anywhere in app.js | **Fixed** — all writes now go through `DB.*` helpers in `supabase.js` which validate and sanitize before sending |
| No field size validation on DB writes | **Fixed** — all DB helpers enforce field limits |
| `understanding_rating` could accept arbitrary values | **Fixed** — enforced 1–5 integer range in `DB.saveSessionNote()` |
| Points transactions could be written by students directly | **Fixed** — `DB.awardPoints()` is in supabase.js, and RLS on Supabase should restrict `points_transactions` inserts to service-role only |

---

## 7. Dependency & Supply Chain

| Dependency | Version Pinned | Risk |
|-----------|---------------|------|
| `@supabase/supabase-js` | `@2` (major pinned) | Low |
| `@tabler/icons-webfont` | `@3.11.0` (exact) | Low |
| Google Fonts | CDN | Low — no JS execution |

**Recommendation:** Pin Supabase to an exact version (e.g. `@2.45.0`) to prevent unexpected breaking changes.

---

## 8. No Single Dependency Bottleneck

- All auth, DB, and rate limiting logic is self-contained in `supabase.js` with zero third-party libraries beyond the Supabase SDK.
- If the Supabase CDN is unavailable, the app falls back to demo mode gracefully.
- Fonts and icons are loaded from separate CDNs — failure of one doesn't break the app.

---

## 9. Privacy Policy & Support URL

| Item | Status |
|------|--------|
| Privacy Policy page | Already built at `/privacy` route |
| Terms of Use page | Already built at `/terms` route |
| Support email link | **Added** — `support@nukhba.org` in footer and login modal |
| Links in login modal | **Added** — Privacy Policy and Terms of Use accessible from login |

---

## 10. Remaining Vulnerabilities & Recommendations

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| **CRITICAL** | `SUPABASE_SERVICE_ROLE_KEY` must be set as a Vercel environment variable before `DB.denyUser` can fully delete auth users | In the Vercel dashboard → Project Settings → Environment Variables, add `SUPABASE_SERVICE_ROLE_KEY` (obtain from Supabase dashboard → Project Settings → API → service_role key). Also add `SUPABASE_URL` if not already set. **Never commit this key to Git.** The `/api/delete-user.js` serverless function reads it via `process.env.SUPABASE_SERVICE_ROLE_KEY` at runtime only. |
| High | Demo portal buttons allow anyone to enter any portal without credentials | Remove demo buttons from production or protect with an admin-only toggle |
| High | RLS policies not verified in this audit | Verify in Supabase dashboard that students can only read their own rows, tutors only their assigned students, and admins all rows |
| High | Claude API key (Step 6) must never go in frontend | Use a Vercel serverless function (`/api/generate-note.js`) as a proxy |
| Medium | No CSRF protection on Supabase calls | Supabase uses JWT bearer tokens which inherently resist CSRF — acceptable |
| Medium | Service worker caches app shell files | Ensure `sw.js` cache version is bumped on every deploy to prevent stale content |
| Low | `console.log` statements in production | Replace with a proper logger that suppresses in production |
| Low | No `autocomplete="off"` on admin-only fields | Add to sensitive admin inputs |
| Low | Support email (`support@nukhba.org`) is a placeholder | Register and configure this email before launch |

---

## 11. Serverless Function Security

| Function | Key Used | Notes |
|----------|----------|-------|
| `/api/delete-user.js` | `SUPABASE_SERVICE_ROLE_KEY` | Validates UUID format before calling `auth.admin.deleteUser`. Returns 500 if env var is missing rather than silently failing. Falls back to DB-only delete on client side if the endpoint is unreachable. |
