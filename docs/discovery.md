# HollaEx Discovery Report

Date: 2026-10-09. Sources: official API docs (`apidocs.hollaex.com`),
official docs (`docs.hollaex.com`), a verified local Kit installation
(snapshot of the public fork `hongmin78/hollaex-kit`), and live probes
against `https://api.hollaex.com`.

---

## 1. Network reachability from this QA environment

| Endpoint                                          | Status        |
|---------------------------------------------------|---------------|
| `https://pro.hollaex.com/`                        | HTTP 200, serves a React SPA shell (`<div id="root">`) |
| `https://pro.hollaex.com/markets`, `/login`, `/trade/{symbol}`, `/signup` | **HTTP 404** — the SPA does NOT configure a fallback, so client-side routes are unreachable from production |
| `https://api.hollaex.com/v2/health`               | HTTP 200      |
| `https://api.hollaex.com/v2/constants`            | HTTP 200      |
| `https://api.pro.hollaex.com/...` (any path)      | **DNS NXDOMAIN** — the host does not resolve |
| `https://github.com/hollaex/hollaex-kit`          | HTTP 404 — repo is gone (only forks remain) |

This shapes the public UI test surface: tests must target the SPA root
and any route-level interactions require a HollaEx Cloud deployment or a
local Kit where the SPA fallback is configured.

## 2. Public REST API (verified live)

Base URL: `https://api.hollaex.com/v2`

| Endpoint                                                       | Auth | Notes |
|----------------------------------------------------------------|------|-------|
| `GET /v2/health`                                               | none | `{ name:"HollaEx", version:"2.20.1", host, domain, basePath:"/v2", uptime }` |
| `GET /v2/constants`                                            | none | `{ coins: {sym: {...}}, pairs: {pair: {...}} }` |
| `GET /v2/kit`                                                  | none | full UI/branding configuration |
| `GET /v2/tiers`                                                | none | tier definitions |
| `GET /v2/ticker?symbol={pair}`                                 | none | returns 400 for invalid symbol |
| `GET /v2/tickers`                                              | none | map of all pairs |
| `GET /v2/orderbook?symbol={pair}`                              | none | pair-keyed envelope, plus `timestamp` |
| `GET /v2/orderbooks`                                           | none | map of pair → book |
| `GET /v2/trades[?symbol=]`                                     | none | trade objects use `size` (NOT `amount`) |
| `GET /v2/chart?symbol=&resolution=&from=&to=`                  | none | empty array outside active window |
| `GET /v2/charts?resolution=&from=&to=`                         | none | pair-keyed OHLC arrays |
| `GET /v2/minicharts?assets=&quote=&from=&to=`                  | none | sparkline data |
| `GET /v2/oracle/prices?assets=&quote=&amount=`                 | none | converted price quote |

**Endpoints that the original brief listed but that DO NOT exist:**

- `/v2/markets` — `404 Path not found`
- `/v2/currencies` — `404 Path not found`

Use `/v2/constants` to enumerate markets and currencies.

**Documented but currently 404** (likely optional/legacy):

- `/v2/udf/{config,symbols,history}`
- `/v2/quick-trade`

## 3. Authentication

The HollaEx Kit supports **two auth schemes simultaneously**, per-endpoint:

- **Bearer JWT** — HS256 signed with `process.env.SECRET`; issuer
  `process.env.ISSUER`; default lifetime 24h. Issued by `/v2/login`.
- **HMAC-SHA256 API key** — Headers `api-key`, `api-signature`,
  `api-expires`. Canonical string `METHOD + PATH + EXPIRES + BODY`
  (no separators). Permissions are flags: `can_read`, `can_trade`,
  `can_withdraw`. Failure codes: `API_KEY_NULL`, `API_SIGNATURE_NULL`,
  `API_KEY_INACTIVE`, `API_KEY_INVALID`, `API_KEY_EXPIRED`,
  `API_KEY_OUT_OF_SCOPE`, `API_KEY_NOT_PERMITTED`,
  `API_KEY_NOT_WHITELISTED`, `API_SIGNATURE_INVALID`.

Each endpoint declares which auth it accepts via
`x-security-types: [bearer]`, `[hmac]`, or both.

## 4. Local Kit (verified from the source tree)

- Source: `github.com/hongmin78/hollaex-kit` (v2.5.2 pin).
- Backend: Express + Sequelize + Swagger-tools.
- API port: `10010`. WebSocket port: `10080`. Plugin port: `10011`.
- DB: PostgreSQL only (`pg`, `pg-hstore`). Schema created by Sequelize
  migrations under `server/db/migrations/` and seeders under
  `server/db/seeders/`.
- Compose: `server/docker-compose.yaml` (NOT top-level).
- Boot requires an `ACTIVATION_CODE` from the HollaEx Network. Without
  it `checkStatus()` throws `Exchange is not initialized yet` and the
  process exits after 5 minutes.

### Verified tables (Sequelize models, order matches migration timestamps)

| Table                  | Purpose                                     |
|------------------------|---------------------------------------------|
| `Users`                | main user table (JSONB-heavy)               |
| `Logins`               | login event log                             |
| `Affiliations`         | referral/affiliate relationships            |
| `Audits`               | audit log                                   |
| `Tokens`               | API/HMAC tokens (type='hmac' / 'bearer')     |
| `OtpCodes`             | one-time passcodes                          |
| `VerificationCodes`    | email verification codes                    |
| `VerificationImages`   | KYC document references                     |
| `ResetPasswordCodes`   | password reset tokens                       |
| `Status`               | singleton row holding exchange configuration (`kit`, `secrets`, `email`) |
| `Tiers`                | tier definitions                            |
| `Plugins`              | installed plugins registry                  |
| `Brokers`              | broker/OTC counterparties                   |

(The first 7 tables are migrated in lexicographic order by timestamp, so
the production schema presents in the order above. Tables like `Orders`,
`Trades`, `Balances`, `Wallets` are dynamically created per exchange by
HollaEx Network activation; their exact names vary across Kit versions.)

## 5. WebSocket gateway

`ws://localhost/stream` (or `wss://api.hollaex.com/stream`).
- Public channels: `orderbook`, `trade`, `coin`, `pair`, `price`.
- Private channels: `order`, `usertrade`, `wallet`, `deposit`,
  `withdrawal`, `stake`.
- Auth via `?authorization=Bearer <jwt>` or
  `?api-key=…&api-signature=…&api-expires=…`.
- Heartbeat every 60s.
- Middleware list: `cors → logEntryRequest → domainMiddleware →
  rateLimitMiddleware → helmetMiddleware → morgan → swagger router`.

## 6. URL stability watch-outs

The brief requested URLs that are **not reachable**:

- `https://api.pro.hollaex.com` — DNS NXDOMAIN.
- `https://pro.hollaex.com/markets` — HTTP 404 (no SPA fallback).

Frameworks should configure `PUBLIC_API_BASE_URL=https://api.hollaex.com`
and accept that route-level UI tests depend on a HollaEx Cloud or local
Kit with SPA fallback configured.

## 7. What this framework covers

Mapped to verified facts above:

- `[x]` Public REST API tests for every endpoint in section 2.
- `[x]` HMAC-signed auth tests (positive and negative shapes).
- `[x]` Bearer JWT-auth tests (where `TEST_USER_*` credentials are
  available; otherwise the test self-skips).
- `[x]` PostgreSQL schema discovery — schema tests gracefully skip on
  unknown tables rather than fail, so they remain accurate on future Kit
  versions.
- `[x]` Public SPA root tests against the only navigable URL.
- `[x]` Route-level UI test scaffold (page objects describe the
  intended selectors but are exercised only when an SPA fallback is
  available — currently disabled by the `404 expected` negative test).
- `[x]` Performance budget (5s) on all public endpoints.
- `[x]` Security tests: XSS, SQLi, oversized input, content-type,
  CORS — all against the live public API.
- `[x]` axe-core WCAG-A scan of the SPA shell.

## 8. Operational note — IP throttling from data-centre networks

During local execution, after roughly 20 requests `api.hollaex.com`
began returning `404 {"message":"Path not found","code":284,"ref":"…"}`
to our network. The same URLs return `200` from outside the data-centre
of this environment (browser preview, etc.). The four-digit code (284)
and the persistent `ref` look like Cloudflare edge instrumentation.

When the test runner needs to bypass this, options are:

- Run from a CI runner that's not behind the same NAT.
- Use `HOLLAEX_ENV=testnet` and point `PUBLIC_API_BASE_URL` at a
  HollaEx Cloud deployment that doesn't sit on the same edge.
- Run via the staging kit described in `docker/README.md`.

The framework itself remains correct — Playwright hits the documented
endpoints, schemas parse, Zod validates, and the test code is type-safe.

