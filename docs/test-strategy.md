# Test Strategy

## 1. Objectives

- **Catch regressions fast** on the public surface (REST API + SPA shell).
- **Verify the documented contract** of every endpoint that ships today
  (15+ public endpoints and 4 private endpoint families).
- **Block unsafe usage** — production credentials, destructive DB ops,
  anonymous trading.
- **Document the actual state** of the platform, including gaps
  (sub-route UI unreachable, repo URL 404, auth dual-mode).

## 2. Layers

### Layer 1 — Unit-ish (dataFactory, validators)

Pure functions in `utils/`. Test inputs and outputs directly, no
Playwright involvement. Fastest layer, runs first.

### Layer 2 — API contract tests

End-to-end via `playwright.request`. Each `tests/api/public/*.spec.ts`
file is a self-contained contract test that:

1. Issues the request,
2. Parses the response with the matching Zod schema,
3. Asserts semantic invariants (price > 0, ISO-8601 timestamps,
   asks >= bids, balanced volumes).

### Layer 3 — UI smoke tests

Exercise the documented navigable URL (the SPA root). Use page objects
that wrap selectors but never embed assertions. Verified mobile, tablet,
and desktop layouts.

### Layer 4 — Security tests

Sweep the public API with crafted inputs (XSS, SQLi, oversized,
content-type, method, CORS origin). Assert that no input causes a 500
or reflects into the response body.

### Layer 5 — Database tests

Connection, schema, integrity, parameterised-query safety. Most tests
gracefully skip when tables are absent (Kit version drift).

### Layer 6 — Integration scenarios

UI + API + DB together. Only run on a local/testnet Kit.

## 3. Independent verification

No test depends on another test's side effects. Each fixture owns its
request context and database pool. Cross-account scenarios use the
`TEST_USER_*` and `TEST_USER_2_*` credentials rather than mutating
shared state.

## 4. Determinism

- We never assume a specific cryptocurrency price.
- We never assume a specific blockchain height or block timestamp.
- For time-sensitive checks we generate timestamps from `Date.now()`
  with a fixed offset, not a fixed absolute value.

## 5. Failure isolation

Each spec file is self-contained. A failing schema test never blocks a
subsequent performance test. The `beforeAll`/`afterAll` lifecycle is
explicit at the file level.

## 6. Coverage matrix

See `docs/requirements-traceability-matrix.md` for the canonical
mapping between HollaEx features, our test IDs, and their execution
status.

## 7. Review cadence

- Schema docs and discovery notes are reviewed whenever:
  - a HollaEx release adds or removes an endpoint,
  - the upstream repo URL changes,
  - the production SPA gains a fallback route.
- Coverage matrix is reviewed when a test file is added or moved.
