# Security TODO — HIMA TL UNTAN CMS

Audit checklist for production readiness. Current state: **demo with no backend**.
Each item is tagged by priority and phase.

> **P0** = must-have before launch
> **P1** = should-have within first sprint post-launch
> **P2** = hardening, do before scaling

---

## 1. Authentication & Session Management

- [ ] **P0** Replace sessionStorage auth with server-side JWT (httpOnly, Secure, SameSite=Strict cookies)
- [ ] **P0** Hash passwords with bcrypt or argon2 (cost factor >= 12), never store plaintext
- [ ] **P0** Implement refresh token rotation — short-lived access tokens (15 min), long-lived refresh tokens (7d) with single-use invalidation
- [ ] **P0** Rate-limit login endpoint — max 5 attempts per IP per 15 minutes, exponential backoff
- [ ] **P0** Account lockout after 10 consecutive failed attempts — require email/admin unlock
- [ ] **P1** Add CAPTCHA (Turnstile/hCaptcha) on login after 3 failed attempts
- [ ] **P1** Force password complexity — minimum 8 chars, at least 1 uppercase, 1 number, 1 special
- [ ] **P1** Implement session timeout — auto-logout after 30 minutes of inactivity
- [ ] **P1** Log all auth events (login, logout, failed attempts, lockouts) with IP + user-agent + timestamp
- [ ] **P2** Add 2FA/TOTP option for Admin role accounts
- [ ] **P2** Implement "remember this device" with device fingerprinting

## 2. Authorization & RBAC

- [ ] **P0** Enforce role checks on every API route — not just UI-level hiding (Admin/Kasir/Editor Konten)
- [ ] **P0** Validate role permissions server-side before any mutation (create/update/delete)
- [ ] **P0** Admin-only routes: user management, role assignment, system settings
- [ ] **P0** Kasir-only scope: merchandise + orders only — block access to berita/departemen mutations
- [ ] **P1** Implement principle of least privilege — new roles default to zero permissions
- [ ] **P1** Audit trail for privilege escalation attempts (user tries to access unauthorized endpoint)
- [ ] **P2** Role-based UI rendering backed by server-verified permissions (don't trust client)

## 3. Transport & Infrastructure

- [ ] **P0** HTTPS only — redirect all HTTP to HTTPS, no mixed content
- [ ] **P0** Set HSTS header: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] **P0** Set security headers via `next.config.js` or middleware:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 0` (rely on CSP instead)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] **P0** Configure Content-Security-Policy — restrict script-src, style-src, img-src to trusted origins
- [ ] **P1** Enable CORS whitelist — only allow requests from the production domain
- [ ] **P1** Set `X-DNS-Prefetch-Control: off` to prevent DNS prefetch leaks
- [ ] **P2** Pin TLS to 1.2+ minimum, disable weak cipher suites

## 4. Input Validation & Injection Prevention

- [ ] **P0** Sanitize all user input server-side — never trust client validation alone
- [ ] **P0** Replace `dangerouslySetInnerHTML` in berita/[slug] with a sanitizer (DOMPurify) or MDX renderer
- [ ] **P0** Parameterized queries / ORM (Prisma/Drizzle) for all database operations — zero raw SQL
- [ ] **P0** Validate and limit file uploads: type whitelist (jpg/png/webp only), max size (5MB), rename on save
- [ ] **P1** Implement request body size limits on API routes (1MB default, 5MB for file uploads)
- [ ] **P1** Strip EXIF data from uploaded images (leaks GPS, device info)
- [ ] **P1** Validate all URL parameters and query strings — reject unexpected keys
- [ ] **P2** Add honeypot fields on public forms (kontak, pesanan) to catch bots without CAPTCHA

## 5. Bot & Spam Protection

- [ ] **P0** Rate-limit all public form submissions — max 3 per IP per 10 minutes
- [ ] **P0** Rate-limit order creation — max 5 orders per IP per hour
- [ ] **P1** Add CAPTCHA (Cloudflare Turnstile recommended — privacy-friendly) on:
  - Contact form
  - Order submission
  - Login (after failed attempts)
- [ ] **P1** Implement IP-based throttling middleware with sliding window algorithm
- [ ] **P2** Bot detection via behavioral analysis — flag rapid sequential requests, missing JS execution
- [ ] **P2** Block known bad user-agents and TOR exit nodes (optional, depends on user base)

## 6. Merchandise & Order Security

- [ ] **P0** Validate stock availability server-side at order creation — client-side checks are bypassable
- [ ] **P0** Atomic stock decrement (DB transaction) — prevent race conditions on concurrent orders
- [ ] **P0** Server-side price calculation — never accept price from client, always compute from product DB
- [ ] **P0** Validate WhatsApp order template server-side — prevent message tampering
- [ ] **P0** Generate order codes server-side with cryptographic randomness (crypto.randomUUID), not sequential
- [ ] **P1** 60-minute stock reservation: implement via DB expiry + cron cleanup, not client-side timers
- [ ] **P1** Idempotency keys on order creation — prevent duplicate orders from network retries
- [ ] **P1** Order status transitions must be validated (e.g., can't go from `kadaluarsa` back to `terjual`)
- [ ] **P2** Anomaly detection: flag bulk orders from same IP, unusual quantity spikes
- [ ] **P2** Add order verification code sent via WhatsApp — confirm before stock lock

## 7. Data Protection & Privacy

- [ ] **P0** Store all secrets (DB credentials, API keys, JWT secret) in environment variables — never in code
- [ ] **P0** Add `.env` to `.gitignore` (already done) — verify no secrets in git history
- [ ] **P0** PII handling: encrypt customer names/phone numbers at rest if storing in DB
- [ ] **P1** Implement data retention policy — auto-delete expired order PII after 90 days
- [ ] **P1** Never log sensitive data (passwords, tokens, full phone numbers) — mask in logs
- [ ] **P1** Cookie consent banner for analytics/tracking (if added)
- [ ] **P2** GDPR/PDP compliance audit — right to deletion, data export
- [ ] **P2** Database encryption at rest (AES-256)

## 8. API Security

- [ ] **P0** Authenticate all admin API routes with JWT middleware — reject unsigned requests
- [ ] **P0** Validate Content-Type header on all POST/PUT/PATCH endpoints
- [ ] **P0** Return generic error messages to client — never expose stack traces, DB errors, or internal paths
- [ ] **P1** Implement request signing for webhook endpoints (if added)
- [ ] **P1** API versioning — prevent breaking changes from affecting live clients
- [ ] **P1** Add request ID header for traceability across logs
- [ ] **P2** GraphQL: disable introspection in production (if used)
- [ ] **P2** Implement API key management for third-party integrations

## 9. Monitoring, Logging & Incident Response

- [ ] **P1** Structured audit log for all admin actions: who, what, when, from where
- [ ] **P1** Alert on: 5+ failed logins from same IP, privilege escalation attempts, unusual order patterns
- [ ] **P1** Error tracking service (Sentry) — catch unhandled exceptions with context
- [ ] **P1** Uptime monitoring with alerting (health check endpoint)
- [ ] **P2** Security incident response plan: who to contact, how to rotate secrets, how to revoke sessions
- [ ] **P2** Regular dependency audit: `npm audit` in CI pipeline, block deploy on critical vulnerabilities
- [ ] **P2** Penetration testing schedule — at least annually or after major feature launches

## 10. Deployment & CI/CD

- [ ] **P0** Never deploy with `next dev` — always `next build && next start` for production
- [ ] **P0** Remove demo credentials and pre-filled login form before production deploy
- [ ] **P0** Disable Next.js error overlay and source maps in production
- [ ] **P1** Lock dependency versions — use `package-lock.json`, review before updating
- [ ] **P1** Run `npm audit` in CI — fail build on high/critical vulnerabilities
- [ ] **P1** Separate staging and production environments with different secrets
- [ ] **P2** Container scanning if using Docker (Trivy/Snyk)
- [ ] **P2** Implement rollback strategy — keep last 3 deployments ready

---

## Quick Wins (Can Do Now)

These require no backend and can be applied to the current demo:

1. ~~Remove `dangerouslySetInnerHTML`~~ → use a markdown/MDX renderer for article content
2. Add security headers in `next.config.js` (CSP, HSTS, X-Frame-Options)
3. Add rate-limit middleware stub using `next/server` middleware
4. Remove demo credentials from login page (or gate behind env var)
5. Add `robots.txt` to disallow `/admin/*` from search engine crawling

---

## Supabase orders — RESOLVED 2026-08-17

The order pipeline was rebuilt on `supabase/migrations/00000000000000_init.sql`.
All five P0/P1 items below are now closed and verified against the live
database:

- [x] **P0** Admin login moved to Supabase Auth. The demo credentials and
      the `sessionStorage` gate are gone; the login page also refuses an
      authenticated user who has no `staff` row.
- [x] **P0** `orders` and `order_items` have no public select policy at
      all. Verified: as the `anon` role, both tables return 0 rows while
      1 order and 2 items exist in the table.
- [x] **P0** Buyer lookup goes through `get_order_by_code()`, which
      returns a single row. It masks the buyer's name and phone and omits
      the address entirely, so a leaked code cannot be turned into
      contact details.
- [x] **P1** Order creation is rate limited to 5 per WhatsApp number per
      hour, inside the RPC.
- [x] **P1** Prices are never accepted from the browser. `create_order()`
      takes only product ids, variants and quantities, then prices the
      basket from the `products` table. Verified: a payload claiming a
      250k jacket costs 1 rupiah was recorded at the real Rp 420.000.

Also hardened while in there:

- `is_staff()` and `next_order_code()` revoked from the public API — they
  are internal helpers, not endpoints.
- Order codes gained a random suffix (`ORD-2026-0001-A3F9C1`). Sequential
  codes plus a public lookup meant anyone could have walked the range.
- Server-side validation of stock, pre-order deadlines, variant validity,
  phone format, quantity bounds, and basket size. Seven tampering
  scenarios tested; all rejected.
- CSP restricts `connect-src` to the Supabase project, so injected script
  cannot exfiltrate order data elsewhere.
- `X-Robots-Tag: noindex` on `/admin/*`.

### Accepted advisor warnings

`get_advisors(type: security)` reports five WARNs. All are understood and
deliberate — recorded here so a future reader does not "fix" them and break
the site:

| Function | Roles | Why it stays |
|---|---|---|
| `create_order` | anon, authenticated | Checkout is open to students without login. Every input is validated inside the function; prices come from the catalogue, not the caller. |
| `get_order_by_code` | anon, authenticated | Buyers look up their own receipt. Returns one row, masked, no address. Codes carry a random suffix so the range cannot be walked. |
| `is_staff` | authenticated only | Required: RLS policies are evaluated as the querying role, so `authenticated` must be able to execute it or every staff-only policy fails. Revoked from `anon`. It only reports whether *you* are staff. |

Note the trap: `is_staff()` was briefly revoked from `anon` while a products
policy still called it, which made the whole catalogue unreadable to the
public with "permission denied for function is_staff". The products read
policy is now split by role so the `anon` predicate never touches it.

### Still open

- [ ] **P1** The "Verifikasi" button in `/admin/pesanan` is not wired.
      Status changes happen in the Supabase Table Editor. The RLS update
      policy for staff already exists.
- [ ] **P1** Expired orders keep holding `stock_reserved`. Needs a
      scheduled job (pg_cron) to release stock after N hours rather than
      the manual SQL documented in SETUP.md.
- [ ] **P2** Rate limiting is per WhatsApp number, not per IP. Someone
      cycling numbers can still create orders.
- [ ] **P2** Storefront reads `src/data/products.ts` rather than the
      `products` table, so displayed stock can drift from real stock.
      Ordering is unaffected — the database is authoritative there.
- [ ] **P2** Payment proof upload (`payment_proof_url` exists, no upload
      path). Would need a Storage bucket with its own access rules.

---

*Last audited: 2026-08-14*
*Auditor: Automated security review*
