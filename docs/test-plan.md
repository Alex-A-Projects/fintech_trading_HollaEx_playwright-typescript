# HollaEx QA — Test Plan

## 1. Scope

The framework covers HollaEx Pro (`https://pro.hollaex.com`) and the
HollaEx Kit (`hollaex/hollaex-kit`) reference implementation. Scope by
test category:

| Category        | In scope                                                            |
|-----------------|---------------------------------------------------------------------|
| **Smoke**       | The only navigable UI route (`/`) and every documented public API. |
| **Regression**  | Public REST endpoints and root SPA shell — repeatable baseline.     |
| **Functional**  | Order placement, cancellation, balance reservation (local Kit only). |
| **Security**    | XSS / SQLi / oversized payload / CORS / content-type — public API.   |
| **Accessibility** | axe-core WCAG-A on the SPA shell.                                |
| **Performance** | Response budgets (5s) on all public endpoints.                      |
| **Integration** | UI + API + DB scenario verification (local Kit only, self-skips).  |
| **DB**          | Schema/column existence and FK/index sanity (read-only by default). |

## 2. Out of scope

- Trading against production `https://pro.hollaex.com`. The framework's
  entire authenticated suite is gated on `HOLLAEX_ENV=local|testnet` so
  we never accidentally wire production credentials.
- Real fund custody flows. We never request, store, or expose private
  keys, seed phrases, or production API secrets.
- Long-running load / soak tests. We set baselines only.
- Sub-route UI tests (`/markets`, `/trade/{symbol}`, `/login`).
  Currently unreachable from `pro.hollaex.com` — see
  `docs/discovery.md` and `docs/known-limitations.md`.

## 3. Environments

| Env var             | Default                                       | Purpose |
|---------------------|-----------------------------------------------|---------|
| `HOLLAEX_ENV`       | `production-readonly`                          | Switches guard rails |
| `PUBLIC_BASE_URL`   | `https://pro.hollaex.com`                     | UI smoke tests |
| `PUBLIC_API_BASE_URL` | `https://api.hollaex.com`                    | Public API tests |
| `LOCAL_BASE_URL`    | `http://localhost:3000`                        | Local Kit UI |
| `LOCAL_API_BASE_URL` | `http://localhost:10010`                      | Local Kit API |
| `LOCAL_DB_HOST`     | `localhost`                                   | Local Postgres |
| `LOCAL_DB_PORT`     | `5432`                                        | - |
| `DB_READ_ONLY`      | `true`                                        | Hard guard on writes |

## 4. Test data strategy

- **Public tests**: never mutate state, no fixtures needed.
- **Local auth tests**: pre-provisioned test user (`TEST_USER_EMAIL`,
  `TEST_USER_PASSWORD`). Seeder values come from `server/test/integration/helpers.js`
  on the Kit side (`tester@holla.tech / hunter2`).
- **DB tests**: read-only by default. Test fixtures generate unique
  values per run via `dataFactory.uniqueId()`.
- **Isolated**: every test owns its own API request context and DB pool.
  No test depends on a previous test.

## 5. CI matrix

| Stage           | Steps                                  |
|-----------------|----------------------------------------|
| lint + typecheck | ESLint clean, `tsc --noEmit` clean     |
| install         | `npm ci`, `playwright install`         |
| public-api      | All `@api` tests against `api.hollaex.com` |
| public-ui       | All `@ui @smoke` tests against the SPA root |
| accessibility   | axe-core WCAG-A scan                   |
| security        | XSS / SQLi / oversized / CORS sweep    |
| cross-browser   | `@smoke` repeated under Chromium / Firefox / WebKit |
| local-*         | Only on dispatch with `HOLLAEX_ENV=local` — runs against self-hosted Kit |

## 6. Reporting

- `playwright-report/` — Playwright HTML report, one folder per project.
- `allure-results/` — Allure raw results, one folder per project.
- `test-results/` — Playwright artifacts (traces, screenshots, videos).

Generate the aggregate Allure report with
`npm run test:report:allure:generate`.

## 7. Safety controls

1. **Destructive tests are gated.** Any API client that hits an
   authenticated endpoint calls `requireLocalOrTestnet()` at the top of
   every mutating method.
2. **No anonymous login against production.** Auth clients use the
   configured `ADMIN_API_KEY`/`ADMIN_API_SECRET` to sign requests —
   which, when `HOLLAEX_ENV=production-readonly`, was never set (the
   helper throws).
3. **No hardcoded secret leakage.** `.env` is git-ignored.
   `.env.example` is the only committed configuration template.
4. **DB writes guarded by `DB_READ_ONLY`.** The default is true; tests
   that require writes set it explicitly via `DatabaseClient({ readOnly: false })`.

## 8. Adding new tests

- Tag with the right tag(s): `@smoke`, `@regression`, `@ui`, `@api`,
  `@db`, `@e2e`, `@negative`, `@security`, `@accessibility`.
- Place in the right `tests/<category>/` directory.
- Use the appropriate fixture (`ui.fixture`, `api.fixture`, `db.fixture`,
  `auth.fixture`).
- Never hardcode prices, addresses, or balances.

See `docs/test-cases.md` for the current list of test IDs.
