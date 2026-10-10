# Known Limitations

Verified 2026-10-09. We document what the framework can't currently
test so future maintainers know exactly what's blocked and why.

## 1. UI sub-routes are unreachable

`https://pro.hollaex.com/{markets,login,signup,trade/*}` returns HTTP
404 from the server, because the production server doesn't configure
an SPA fallback. Concretely:

- `/markets`, `/login`, `/signup` — 404.
- `/trade/{pair}` — 404 for every pair we tried.

The only navigable URL is `/` (the React SPA shell). The framework
tests that and marks the rest as "expected 404" so any future unblock
flips the test outcome automatically.

**Path to unblock**: when HollaEx enables SPA fallback on
`pro.hollaex.com`, remove the negative `tests/ui/public-ui.spec.ts#route X
is intentionally unavailable` tests, replace them with real interaction
tests, and update `pages/` with the discovered selectors.

## 2. The brief's base URL is unreachable

`https://api.pro.hollaex.com` does not resolve from this environment.
The framework uses `https://api.hollaex.com` instead (verified live).

**Path to unblock**: confirm with the HollaEx team which hostname they
intend as the public production REST endpoint and update
`config/environments.ts`.

## 3. The original repo is gone

`https://github.com/hollaex/hollaex-kit` returns 404. We verified the
schema and structure from the public fork
`https://github.com/hongmin78/hollaex-kit` (pinned v2.5.2). Future Kit
versions may diverge.

**Path to unblock**: ask the HollaEx team to republish the repo, or pin
this framework to a known fork.

## 4. Authenticated tests are gated by `HOLLAEX_ENV`

The `local-auth`, `local-trading`, `local-db`, and `local-e2e`
projects use `requireLocalOrTestnet()` to refuse to run against
production. When no local Kit is available, the tests self-skip — they
never silently switch to production credentials.

**Path to unblock**: stand up a local Kit following `docker/README.md`,
or acquire sandbox credentials from the HollaEx Network dashboard and
run with `HOLLAEX_ENV=testnet`.

## 5. Database tests are read-only by default

`DB_READ_ONLY=true` is the default in `.env.example`. The single test
that needs write access (`tests/database/balance.spec.ts`) requires
`DB_READ_ONLY=false` and an isolated local Kit.

**Path to unblock**: provision a disposable Postgres + HollaEx Kit for
integration runs; never lower the guard on a shared database.

## 6. Rate-limit tests

We do not currently exercise rate-limit behaviour because:

- The public API doesn't expose rate-limit headers (`X-RateLimit-*`,
  `Retry-After`) — only Cloudflare edge headers.
- Hammering the live API just to test limits is rude and not aligned
  with the project's safety guidance.

**Path to unblock**: when a sandbox Kit with documented limits is
available, add rate-limit tests with `auth.fixture`.

## 7. Deposit/withdrawal flows

The brief asks for end-to-end deposit/withdrawal tests. HollaEx's
production withdrawal flow uses external crypto networks — it isn't
practical to simulate without real chain connectivity. Local Kit mode
supports synthetic wallets for deposits and withdrawals, but requires
an activated exchange.

**Path to unblock**: run on local Kit with the
`hollaex-cli` provisioner (sandbox plan) to create disposable wallets.

## 8. UDF / TradingView adapter

`/v2/udf/{config,symbols,history}` returned 404 from a live probe in
our environment. We log this as "documented but 404 in this build"
but don't have live ground truth, so we don't write tests against
them yet.

**Path to unblock**: when a HollaEx Cloud deployment we can access
exposes them, add tests.

## 9. Cybersecurity red-team scope

The brief explicitly forbade credential stuffing, password spraying,
and brute-force. We also do not test 2FA bypass, social engineering,
or any test that would risk suspending accounts.
