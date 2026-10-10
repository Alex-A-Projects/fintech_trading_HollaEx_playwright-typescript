# Test Cases

This is the canonical list of test IDs and short descriptions. The
test files themselves hold the full preconditions, steps, and expected
results. Each test ID maps 1:1 to a `test(...)` block.

## Public UI smoke

| ID           | File                                           | Description                                            |
|--------------|------------------------------------------------|--------------------------------------------------------|
| HOL-UI-001   | tests/ui/public-ui.spec.ts#root URL responds with 200 | `pro.hollaex.com` returns 200 with HTML               |
| HOL-UI-002   | tests/ui/public-ui.spec.ts#root page contains a React mount point | `#root` element exists                              |
| HOL-UI-003   | tests/ui/public-ui.spec.ts#root page has a noscript fallback | `<noscript>` text is non-empty                         |
| HOL-UI-004   | tests/ui/public-ui.spec.ts#booting splash hidden after React mounts | `.app-booting` not visible post-mount                  |
| HOL-UI-005   | tests/ui/public-ui.spec.ts#SPA injects manifest-placeholder link | `<link rel*=manifest>` present                         |
| HOL-UI-006   | tests/ui/public-ui.spec.ts#main JS bundle loads successfully | At least one `.js` 2xx response, no 5xx                 |
| HOL-UI-007   | tests/ui/public-ui.spec.ts#global CSS loads with 2xx | At least one `.css` 2xx response                       |
| HOL-UI-008   | tests/ui/public-ui.spec.ts#Document has a non-empty title | `<title>` text present                                 |
| HOL-UI-009   | tests/ui/public-ui.spec.ts#Document is rendered in English | `html[lang]` ∈ {`en`, `en-US`, `en-GB`, ``}             |
| HOL-UI-010–13 | tests/ui/public-ui.spec.ts#route X is intentionally unavailable | Negative test: routes /markets /login /signup /trade/* return 404 |

## Responsive

| ID           | File                                  | Description                                            |
|--------------|---------------------------------------|--------------------------------------------------------|
| HOL-RES-001–5 | tests/ui/responsive.spec.ts          | No horizontal overflow at desktop / laptop / tablet / mobile / mobileSmall |

## Accessibility

| ID           | File                                          | Description                                            |
|--------------|-----------------------------------------------|--------------------------------------------------------|
| HOL-A11Y-001 | tests/accessibility/wcag.spec.ts#viewport meta | `meta[name=viewport]` present                         |
| HOL-A11Y-002 | tests/accessibility/wcag.spec.ts#noscript      | `<noscript>` text non-empty                            |
| HOL-A11Y-003 | tests/accessibility/wcag.spec.ts#title          | `<title>` text non-empty                              |
| HOL-A11Y-004 | tests/accessibility/wcag.spec.ts#axe-core scan  | No critical WCAG-A violations on the SPA shell        |

## Public API — markets & tickers

| ID           | File                                                          | Description                                                |
|--------------|---------------------------------------------------------------|------------------------------------------------------------|
| HOL-API-001  | tests/api/public/markets.spec.ts#tickers non-empty map         | `/v2/tickers` returns at least one symbol                  |
| HOL-API-002  | tests/api/public/markets.spec.ts#tickers within budget        | `/v2/tickers` latency below 6s                             |
| HOL-API-003  | tests/api/public/markets.spec.ts#ticker for known symbols      | `/v2/ticker?symbol=btc-usdt/eth-usdt/xht-usdt`             |
| HOL-API-004  | tests/api/public/markets.spec.ts#ticker rejects unknown pairs  | Unknown pair → 4xx (no 5xx, no body-leakage)               |
| HOL-API-005  | tests/api/public/markets.spec.ts#orderbook ordered bids/asks   | `bids[0][0] <= asks[0][0]`, both finite and positive        |
| HOL-API-006  | tests/api/public/markets.spec.ts#trades returns a list         | Recent trades with positive price and size                 |
| HOL-API-007  | tests/api/public/markets.spec.ts#orderbook rejects missing symbol | 400 for missing symbol parameter                       |

## Public API — chart

| ID           | File                                                  | Description                              |
|--------------|-------------------------------------------------------|------------------------------------------|
| HOL-API-010  | tests/api/public/chart.spec.ts#aligned arrays         | `c.length === t.length`, timestamps monotonic |
| HOL-API-011  | tests/api/public/chart.spec.ts#invalid resolution     | Falls back to `no_data` or 4xx           |
| HOL-API-012  | tests/api/public/chart.spec.ts#reversed time range     | Either `no_data` or 4xx                  |

## Public API — constants / kit / tiers / oracle / minicharts

| ID           | File                                                       | Description                          |
|--------------|------------------------------------------------------------|--------------------------------------|
| HOL-API-020  | tests/api/public/constants.spec.ts#/v2/health              | HollaEx node reports version         |
| HOL-API-021  | tests/api/public/constants.spec.ts#/v2/constants catalogue | `coins` map non-empty                |
| HOL-API-022  | tests/api/public/constants.spec.ts#/v2/kit                 | `kit` is a non-null object           |
| HOL-API-023  | tests/api/public/constants.spec.ts#/v2/tiers               | `tiers` is a non-null object         |
| HOL-API-024  | tests/api/public/tiers.spec.ts#/v2/kit                     | Kit metadata keys present            |
| HOL-API-025  | tests/api/public/tiers.spec.ts#/v2/tiers                   | At least one tier is named            |
| HOL-API-026  | tests/api/public/tiers.spec.ts#/v2/oracle/prices           | Converted prices are finite positive |
| HOL-API-027  | tests/api/public/tiers.spec.ts#/v2/minicharts              | Non-null response                    |
| HOL-API-028  | tests/api/public/tiers.spec.ts#/v2/charts                  | Non-null response                    |

## Public API — negative / error envelopes

| ID           | File                                                  | Description                                |
|--------------|-------------------------------------------------------|--------------------------------------------|
| HOL-API-030  | tests/api/public/negative.spec.ts#unknown endpoint   | Returns 4xx with structured envelope       |
| HOL-API-031  | tests/api/public/negative.spec.ts#wrong HTTP method   | POST on read-only endpoint rejected        |
| HOL-API-032  | tests/api/public/negative.spec.ts#1KB symbol          | Oversized symbol rejected                  |

## Public API — performance

| ID           | File                                                          | Description                              |
|--------------|---------------------------------------------------------------|------------------------------------------|
| HOL-PERF-001 | tests/api/public/performance.spec.ts#budget for /v2/health    | < 5s                                     |
| HOL-PERF-002 | tests/api/public/performance.spec.ts#budget for /v2/constants | < 5s                                     |
| HOL-PERF-003 | tests/api/public/performance.spec.ts#budget for /v2/tickers   | < 5s                                     |
| HOL-PERF-004 | tests/api/public/performance.spec.ts#budget for /v2/tiers     | < 5s                                     |
| HOL-PERF-005 | tests/api/public/performance.spec.ts#budget for /v2/orderbook | < 5s                                    |

## Security

| ID           | File                                                  | Description                                |
|--------------|-------------------------------------------------------|--------------------------------------------|
| HOL-SEC-001  | tests/security/api-security.spec.ts#XSS reflection     | Reflected payload does not appear in body   |
| HOL-SEC-002  | tests/security/api-security.spec.ts#oversized query   | 2KB / 64KB inputs don't 5xx                |
| HOL-SEC-003  | tests/security/api-security.spec.ts#stack-trace leak  | No `at foo()` / no `node_modules` traces    |
| HOL-SEC-004  | tests/security/api-security.spec.ts#CORS origin check  | `ACAO` is restrictive or wildcard          |
| HOL-SEC-005  | tests/security/api-security.spec.ts#content-type POST | POST against GET endpoint rejected         |
| HOL-SEC-010–15 | tests/security/sql-injection.spec.ts                | Six SQLi payloads rejected safely          |

## Database

| ID           | File                                                       | Description                                |
|--------------|------------------------------------------------------------|--------------------------------------------|
| HOL-DB-001   | tests/database/schema.spec.ts#connection lists tables       | `SELECT * FROM information_schema.tables`   |
| HOL-DB-002   | tests/database/schema.spec.ts#expected core tables exist    | Kit-version-aware table presence           |
| HOL-DB-003   | tests/database/schema.spec.ts#users.id NOT NULL             | `id` column is NOT NULL                    |
| HOL-DB-004   | tests/database/schema.spec.ts#orders FK to users            | Foreign-key constraint listed              |
| HOL-DB-005   | tests/database/schema.spec.ts#orders indexed by created_at  | Index rows returned                        |
| HOL-DB-006   | tests/database/schema.spec.ts#balances column existence     | At least one balance column present        |
| HOL-DB-010   | tests/database/balance.spec.ts#balance accounting holds    | `available + reserved ≈ total`             |
| HOL-DB-011   | tests/database/balance.spec.ts#parameterised SQL injection | Multi-payload parameterised safety sweep   |

## Auth (local Kit only)

| ID           | File                                                  | Description                                |
|--------------|-------------------------------------------------------|--------------------------------------------|
| HOL-AUTH-001 | tests/api/auth/auth.spec.ts#signed GET empty creds    | Rejected with 4xx                          |
| HOL-AUTH-002 | tests/api/auth/auth.spec.ts#signed POST malformed     | Documented error envelope returned          |

## End-to-end (local Kit only)

| ID           | File                                                       | Description                                |
|--------------|------------------------------------------------------------|--------------------------------------------|
| HOL-E2E-001 | tests/integration/buy-sell-scenarios.spec.ts#place limit buy | Idempotent: queries pair, places order, reads back |
| HOL-E2E-002 | tests/integration/buy-sell-scenarios.spec.ts#rejects negative price | Order rejected for invalid price       |
| HOL-E2E-003 | tests/integration/buy-sell-scenarios.spec.ts#rejects zero size | Order rejected for zero size            |
