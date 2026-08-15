# Security Review

**Project:** *Paragon*

**Document type:** Security review -- a short, non-exhaustive pass over the risks that actually apply to a single-user personal app on this stack. Not a formal threat model. Companion to the [Auth Integration doc](auth-integration.md) (owns session/CSRF implementation detail, cross-referenced not repeated here) and the [API Route Design](api-routes.md) (owns the attachment upload contract this document adds validation rules to).

**Status:** Draft -- v1 scope

**Implementation status:** Current

**Last updated:** July 2, 2026

---

## 0. Scope and Approach

This is not a compliance document, a formal threat model, or a pen-test report -- none of those are proportional to a single-user personal tool with no third-party data at risk (consistent with the "Ship it" / "Free" constraint ordering in ADR 001 S2). This document exists to answer one question per risk: **is this checked, and if the risk is accepted rather than mitigated, why.**

Four risks are covered below because they're the ones that actually apply to this app's specific shape (freeform text fields, file uploads, a locked-out-user-facing unauthenticated endpoint, session cookies). Anything not listed here either doesn't apply to this stack (no OAuth, no third-party data sharing, no admin panel) or is already fully owned by another document and isn't duplicated.

---

## 1. `POST /api/auth/recover` -- Brute-Force Exposure

**The risk:** this is the one intentionally unauthenticated route in the entire API (API Route Design S1.2) -- it has to be, since the person calling it is by definition locked out. That also makes it the one endpoint an attacker can hit repeatedly without a session. The recovery flow (Auth Integration S5.2) matches on `email` + one of 3 recovery codes; with no rate limiting, an attacker who knows (or guesses) the account's email can brute-force the code space.

**Status: mitigated.** The v1 hardening pass (migration `0020`, "recovery-code hardening") closed the original accepted-risk gap:

- **Code format:** `PARAGON-XXXX-XXXX` where each segment is **4 hex chars** (0-9A-F, derived from `crypto.randomUUID()` truncation -- UUIDs are hex, not arbitrary alphanumerics). Per segment: 16^4 = **65,536** possibilities; two segments = **32 bits** of entropy (~4.3 billion codes). For a single-user app that is ample *combined* with rate limiting (below), which is the load-bearing control.
- **Rate limiting** on `POST /api/auth/recover`: per-email (5 attempts / 15 min) and per-IP (20 attempts / 15 min) windows. Exceeding either returns `429 { "error": "rate_limited" }`. At 5 attempts per 15 minutes, brute-forcing a 32-bit code space is not practical on any timescale the attacker would have before the lockout window resets.
- **Hashing at rest:** codes are stored as **SHA-256 hashes** (`recovery_codes.code_hash`), never plaintext -- a D1 backup leak yields hashes, not usable codes, and the comparison is timing-safe.
- **30-day expiry:** codes stop being usable 30 days after `created_at`, so a leaked code has a bounded lifetime and regenerating new codes rotates stale ones out.
- **Malformed body handling:** a body that fails to parse returns `400 { "error": "invalid_json" }` rather than leaking a 500/stack trace.

**Not doing:** CAPTCHA, per-account lockout beyond the rate-limit window, or a third-party rate-limiting service (e.g. Cloudflare's own rate limiting rules) -- the in-handler counters are proportional to a single-account app and each skipped option would add its own dependency/config surface.

---

## 2. R2 Attachment Upload Validation

**The risk:** `POST /api/attachments` (API Route Design S9) proxies arbitrary file uploads through the Worker into R2 (ADR 001 S5.7). Without validation, this accepts any file type or size -- a malicious or mistaken upload could push an oversized file through the Worker (burning CPU/bandwidth on the free tier) or store a file type the app never intended to serve back (e.g. an HTML file that could execute if ever rendered unsanitized, or an executable disguised with an image extension).

**Status: two checks required, now reflected in API Route Design S9 as this document's source-of-truth contract.**

| Check | Rule | Where enforced |
|---|---|---|
| **MIME allowlist** | Accept: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `text/plain`, `text/csv`, `application/rtf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`. Reject everything else with `400 { "error": "unsupported_file_type" }`. | Server-side, checked against the actual `Content-Type` of the multipart part -- never trust a client-supplied extension alone. |
| **Max size** | 25 MB per file. Reject over-limit uploads with `400 { "error": "file_too_large" }` -- checked before the R2 `put()` call, not after; reject early rather than spend the upload bandwidth. | Checked early in the handler, before any R2 write. |

**Why these specific limits:** PDFs and common image formats cover every real v1 use case named in the PRD (S5.5 Link list / Log widget attachments -- "a source PDF," "a form-check photo"). 25 MB comfortably covers a scanned PDF or a phone photo without inviting large-file abuse of the proxied-upload path, which ADR 001 S5.7 already flags as an accepted-but-revisit-if-it-grows tradeoff.

**Not doing:** virus/malware scanning (no free-tier Cloudflare-native option, and disproportionate to a single-user app where the "attacker" would have to be the account owner themselves), content-sniffing beyond the declared `Content-Type` header (accepted risk -- a mismatched extension/content-type on your own account isn't a meaningful threat model here).

---

## 3. XSS in Freeform Fields

**The risk:** several fields across the app are freeform user text that gets rendered back: `philosophy`, `purpose`, `protocol`, `barrier_list` entries (D1, `systems` table), Log/Journal `text` (MongoDB, see [MongoDB Schema ADR](../ADRs/003-mongodb-schema.md) S3.2), Review `what_worked`/`what_broke` (D1, `reviews` table). If any of these render as raw HTML, a malicious or accidental `<script>` in a text field could execute against the account owner's own session.

**Status: checked, risk mitigated by default -- one explicit rule to hold going forward.**

- **Svelte auto-escapes all interpolated text by default.** Every `{expression}` binding in a `.svelte` file is escaped automatically -- this covers every field listed above as long as they're rendered the normal way (`<p>{system.philosophy}</p>`, etc.), which is the only way any current page in the SvelteKit Route Architecture doc renders them.
- **The only bypass is `{@html ...}`**, which is Svelte's explicit, deliberately-loud opt-out of escaping. **Rule: `{@html}` is not used anywhere in this app in v1.** Every field in scope (listed above) is plain text, not intended to support rich formatting -- there is no legitimate v1 use case for rendering user input as raw HTML. If a future feature wants Markdown rendering or similar in a freeform field (e.g. the Log/Journal widget), that requires an explicit sanitization step (e.g. `DOMPurify` on the rendered output) before `{@html}` is ever introduced -- not a default to reach for casually.
- **Not doing:** a dedicated sanitization library for input storage -- text is stored as-is (D1/Mongo), and safety is enforced entirely at the render boundary (Svelte's default escaping) rather than by mutating what's stored. This matches the general principle of storing the user's actual input untouched and enforcing safety at the output boundary, not the input boundary.

---

## 4. Session Cookie Hardening & CSRF

Fully owned by the [Auth Integration doc](auth-integration.md) S2 (cookie config table: `httpOnly`, `secure`, `sameSite`, no explicit domain scope) and S3 (CSRF / trusted origins / Vite dev proxy header preservation). Not repeated here -- this entry exists only so this document's "have we looked at the standard risk categories" checklist is complete. See those sections directly for the actual configuration and reasoning, including the `sameSite: lax` justification: the client is served from Pages (`paragons.pages.dev`) and proxies every `/api/*` call to the Worker through a same-origin Pages Function (`functions/api/[[path]].ts`), so the request origin is always the Pages hostname -- with no third-party origins in scope, `lax` is sufficient and the `strict` tradeoff against email-link flows is unnecessary.

---

## 5. What's Explicitly Out of Scope

Consistent with the "Ship it" / proportionality principle stated in S0:

| Not covered | Why |
|---|---|
| Formal threat modeling / STRIDE analysis | Disproportionate to a single-user app with no third-party data |
| Dependency/SCA scanning (Snyk, Dependabot alerts as a formal process) | Worth turning on GitHub's free Dependabot alerts in repo settings (Settings > Code security > Dependabot alerts) as a passive check, but not a documented process -- low effort, not zero, noted here rather than given its own section |
| DDoS protection | Cloudflare's network-level protection applies by default to anything on Workers; no app-level action needed |
| Data-at-rest encryption | D1, R2, and Atlas all encrypt at rest by default at the platform level; no app-level configuration exists to review |
| Multi-user authorization edge cases (privilege escalation, role confusion) | No roles or multi-user sharing exist in this app (PRD S3 Non-Goals) |

---

## 6. Review Cadence

This is a point-in-time review, not a continuously maintained checklist. Re-visit this document if: the app is ever opened to more than one user (ADR 001 S8's contingency), the Log/Journal widget gains rich-text/Markdown rendering (S3's `{@html}` rule), or a new file-upload surface is added beyond the single `POST /api/attachments` route (S2).
