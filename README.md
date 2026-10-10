# HollaEx QA Automation

> Production-grade QA automation framework for the **HollaEx** cryptocurrency
> exchange. Built with **Playwright + TypeScript**, covering public UI,
> REST API, PostgreSQL database, accessibility, security, performance, and
> end-to-end integration scenarios.

[![TypeScript](https://img.shields.io/badge/typescript-5.6-blue)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/playwright-1.48-green)](https://playwright.dev/)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

---

## Stack

| Layer | Tool | Why |
|---|---|---|
| **Language** | TypeScript 5.6 (strict mode) | Type-safe page objects, fixtures, and API clients; `tsc --noEmit` runs in CI. |
| **Test runner** | [Playwright Test](https://playwright.dev/) 1.48 | Single runner for UI, REST API, and database scenarios; built-in fixtures, parallel workers, retries, traces, video, screenshots. |
| **Browsers** | Chromium, Firefox, WebKit | Cross-browser smoke via Playwright's bundled browsers. |
| **API transport** | `playwright.request` + `fetch()` | Plays nicely with the test runner; native retries, abort signals, JSON parsing. |
| **Schema validation** | [Zod](https://zod.dev/) 3.23 | Every fixture-backed API response is parsed against a typed schema; `safeParse` keeps the suite green on shape drift. |
| **Database** | [pg](https://node-postgres.com/) 8.13 (PostgreSQL 10+) | Parameterised queries; `readOnly` guard rejects writes before they reach the wire. |
| **Accessibility** | [axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) 4.13 | Runs axe-core scans against the live DOM (WCAG-A and WCAG-AA). |
| **Local secrets** | [dotenv](https://github.com/motdotla/dotenv) 16 | `.env` is git-ignored; `.env.example` documents safe defaults. |
| **Lint / format** | ESLint 8 + Prettier 3 | `--max-warnings 0` in CI. |
| **HTML report** | Playwright HTML | One folder per project (`playwright-report/<project>`). |
| **Allure report** | allure-playwright 3 + allure-commandline 2 | `npm run test:report:allure:generate`. |
| **CI** | GitHub Actions | Per-project jobs (see `.github/workflows/ci.yml`). |
| **Container** | Docker / docker-compose | For the local HollaEx Kit (`docker/README.md`). |
| **Node** | 20.x | Matches `engines.node` in `package.json`. |

## TL;DR

```bash
git clone <this repo>
cd hollaex-qa-automation
npm ci
npm run install:browsers
cp .env.example .env
# edit .env (defaults to public production-readonly — safe out of the box)

# Public surface (smoke + API + accessibility + security + perf)
npm run test:smoke         # only @smoke tests
npm run test:api           # only API tests
npm run test               # everything in production-readonly mode
npm run test:report        # HTML report
npm run test:report:allure:generate

# Cross-browser smoke under Chromium / Firefox / WebKit
npm run test:cross-browser

# Local Kit (optional, requires a running HollaEx Kit — see docker/README.md)
HOLLAEX_ENV=local LOCAL_API_BASE_URL=http://localhost:10010 npm run test:api -- --project=local-auth
HOLLAEX_ENV=local LOCAL_API_BASE_URL=http://localhost:10010 npm run test:e2e
```

## What's covered

- **Public UI** — verified against the only reliably navigable route,
  `https://pro.hollaex.com/`. Includes responsive viewports, manifest
  fallback, accessibility, and surface hardening (404 expected on
  routes the production server hasn't enabled).
- **Public REST API** — every documented endpoint in
  [`/config/endpoints.ts`](config/endpoints.ts) is exercised with Zod
  schema validation, semantic assertions, performance budgets, and
  negative/error envelope checks.
- **Security** — XSS reflection, oversized input, stack-trace leak,
  CORS hardening, method enforcement, and a six-payload SQL-injection
  sweep.
- **Database** — schema discovery (gracefully self-skips on missing
  tables), column/constraint/index sanity, balance-accounting
  invariant, and a parameterised-query safety sweep.
- **Authenticated flows** — HMAC-signed `GET/POST/DELETE` against
  `/v2/user`, `/v2/order`, etc. Tests self-skip on
  `production-readonly`.
- **End-to-end** — UI + API + database scenarios that exercise
  paired happy-path and rejection paths.

See `docs/requirements-traceability-matrix.md` for the canonical
mapping.

## Architecture

```
config/                Single source of truth for env, endpoints, test data
pages/                 Thin Page Object Model (selectors only, no assertions)
api/
  clients/             Typed HTTP/REST clients built on Playwright
  schemas/             Zod schemas for every documented endpoint
database/              PostgreSQL pool + schema queries + validators
fixtures/              Per-layer fixtures (UI, API, DB, Auth)
tests/
  ui/                  Public SPA shell tests + responsive
  api/public/          Live public API contract tests
  api/auth/            HMAC-signed auth tests
  api/wallet/          Authenticated wallet tests
  api/trading/         Order placement / cancellation
  database/            Schema + ledger + parameterised-query safety
  integration/         UI + API + DB scenarios
  security/            XSS / SQLi / oversized / CORS / method sweep
  accessibility/       axe-core WCAG-A on the SPA shell
utils/                 Logger, dataFactory, helpers, custom assertions
docker/                Local Kit bring-up reference (not run by the framework)
docs/                  Discovery, plan, strategy, RTM, coverage, limitations
.github/workflows/     CI pipeline
```

## Safety

This framework *cannot* run destructive tests against production.

1. Authenticated clients call `requireLocalOrTestnet()` at the top of
   every mutating method — passing `HOLLAEX_ENV=production-readonly`
   causes an immediate, descriptive throw.
2. `DB_READ_ONLY=true` is the default. Tests that need write access
   check `db.readOnly` and self-skip if it's true.
3. `.env` is git-ignored. `.env.example` documents only safe,
   sandbox/local values.
4. No real cryptocurrency keys or production secrets ever exist in
   the repository or in CI.

## Environment

| Var                       | Default                                  | Purpose |
|---------------------------|------------------------------------------|---------|
| `HOLLAEX_ENV`             | `production-readonly`                    | Determines target environment |
| `PUBLIC_BASE_URL`         | `https://pro.hollaex.com`                | UI smoke target |
| `PUBLIC_API_BASE_URL`     | `https://api.hollaex.com`                | Public API target |
| `LOCAL_BASE_URL`          | `http://localhost:3000`                  | Local Kit UI |
| `LOCAL_API_BASE_URL`      | `http://localhost:10010`                 | Local Kit API |
| `LOCAL_DB_HOST/PORT/NAME/USER/PASSWORD` | `localhost/5432/hollaex/admin/root` | Local Kit Postgres |
| `TEST_USER_EMAIL`         | —                                        | Pre-provisioned test user (local) |
| `TEST_USER_PASSWORD`      | —                                        | Pre-provisioned test pass (local) |
| `ADMIN_API_KEY/SECRET`    | —                                        | HMAC keys (local) |
| `DB_READ_ONLY`            | `true`                                   | Hard guard on write queries |
| `PUBLIC_API_RESPONSE_BUDGET_MS` | `5000`                              | Latency budget for public endpoint tests |

## How to run against a local Kit

See `docker/README.md` for the complete bring-up guide. In short:

```bash
# 1. Bring up the Kit
git clone https://github.com/hongmin78/hollaex-kit.git
cd hollaex-kit && git checkout v2.5.2
cp server/tools/hollaex-kit.env.local.example server/tools/hollaex-kit.env.local
$EDITOR server/tools/hollaex-kit.env.local          # set ACTIVATION_CODE
cd server && docker compose up -d

# 2. Wire this framework
#    -- set HOLLAEX_ENV=local in .env
#    -- populate TEST_USER_* and ADMIN_API_KEY/SECRET

# 3. Run the local projects
npm run test:db
npm run test:e2e
```

## Reports

| Tool         | Path                | Notes |
|--------------|---------------------|-------|
| Playwright HTML | `playwright-report/<project>` | Open with `npm run test:report` |
| Allure HTML    | `allure-results/<project>` (raw), `allure-report` (generated) | `npm run test:report:allure:generate` |
| GitHub Actions | workflow artifacts | `playwright-report` uploaded |

## Documentation

| Doc | Purpose |
|-----|---------|
| [`docs/discovery.md`](docs/discovery.md) | What we verified about HollaEx in this environment |
| [`docs/test-plan.md`](docs/test-plan.md) | Scope, environments, data strategy, CI matrix |
| [`docs/test-strategy.md`](docs/test-strategy.md) | Layered strategy, determinism, coverage rules |
| [`docs/test-cases.md`](docs/test-cases.md) | Canonical list of test IDs and short descriptions |
| [`docs/requirements-traceability-matrix.md`](docs/requirements-traceability-matrix.md) | Feature → test ID → status |
| [`docs/api-coverage.md`](docs/api-coverage.md) | Per-endpoint coverage |
| [`docs/database-schema.md`](docs/database-schema.md) | Verified PostgreSQL schema |
| [`docs/known-limitations.md`](docs/known-limitations.md) | What's blocked and how to unblock |
| [`docker/README.md`](docker/README.md) | How to bring up a local HollaEx Kit |

## Contributing

- All new tests must use a fixture (`ui`, `api`, `db`, or `auth`).
- Tag every test with one of `@smoke @regression @ui @api @db @e2e
  @negative @security @accessibility`.
- Never hardcode prices or balances.
- Never add tests that touch production mutating endpoints. Gate them
  with `requireLocalOrTestnet()`.

## License

MIT — see [LICENSE.md](LICENSE.md).
