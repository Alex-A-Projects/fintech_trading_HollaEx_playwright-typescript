# HollaEx Kit Database Schema (verified 2026-10-09)

This document describes the **verified** HollaEx Kit PostgreSQL schema
as it appears in the public fork `hongmin78/hollaex-kit` v2.5.2 (the
upstream `hollaex/hollaex-kit` repository is no longer reachable).

## Engine

- **PostgreSQL only.** `DB_DIALECT=postgres` is mandatory; the JSONB
  column types and SQL trigger functions all assume Postgres.
- Default local credentials (from `server/docker-compose.yaml`):
  `host=hollaex-kit-db`, `port=5432`, `database=hollaex`,
  `user=admin`, `password=root`.
- Image: `postgres:10.9` (compose default) or
  `postgres:10.9-alpine` (the k8s configmap image).

## Schema lifecycle

1. `server/entrypoint.sh` runs `pm2-runtime start ecosystem.config.js`.
2. The API process runs `sequelize db:migrate` to apply migrations.
3. The seeders execute next: `20190825120350-add-status.js` (network
   activation) and `20201014074533-add-tiers.js` (default tier rows).
4. `server/init.js → checkStatus()` pulls fresh exchange state from
   the HollaEx Network over HTTPS and publishes it via Redis pub/sub.

After activation, the **network** owns the authoritative list of
coins, pairs, tiers, fees, and limits. The local DB stores the result
of that activation. New tables for `Orders`, `Trades`, `Balances`,
`Wallets`, `Deposits`, `Withdrawals` may be created dynamically by the
network-seeded activation process; their exact names vary by Kit
version.

## Tables present after migrations (before activation)

Run order is determined by `sequelize-cli` timestamp ordering, so the
typical production schema (pre-activation) looks like:

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `Users`                | primary user table; JSONB `settings`, `meta`, `bank_account` |
| `Logins`               | login attempt log                                    |
| `Affiliations`         | referral/affiliate pairs                             |
| `Audits`               | audit log                                            |
| `Tokens`               | `type='hmac'` and `type='bearer'` API tokens         |
| `OtpCodes`             | one-time password codes                              |
| `VerificationCodes`    | email verification codes                             |
| `VerificationImages`   | KYC document references                              |
| `ResetPasswordCodes`   | password reset tokens                                |
| `Status`               | singleton row holding `kit`, `secrets`, `email`      |
| `Tiers`                | KYC tier rows (seeded by activation seeder)         |
| `Plugins`              | installed plugin registry                            |
| `Brokers`              | OTC broker counterparties                            |

## Columns by table (verified)

### Users (`server/db/models/user.js`)
- `id` — `BIGSERIAL` PK
- `email` — `CITEXT` UNIQUE NOT NULL
- `password` — text (NOT NULL; the seeder hashes it)
- `is_active` — bool, defaults true
- `flagged` — bool
- `verification_level` — int (mapped from tiers)
- `settings`, `meta`, `bank_account` — JSONB
- `created_at`, `updated_at` — timestamptz

### Tokens
- `id`, `user_id` (FK → Users.id)
- `type` — `'hmac' | 'bearer'`
- `key`, `secret_hash`
- `permissions` — JSONB `{ can_read, can_trade, can_withdraw }`
- `whitelisted_ips` — text[] (jsonb) when `whitelisting_enabled`
- `expires_at` — timestamptz NULL
- `is_active` — bool

### Status (singleton — exactly one row)
- `kit` — JSONB containing coins/pairs/limits
- `secrets` — JSONB, holds `api_key`, `api_secret`, `jwt_secret`,
  `admin_whitelist`, `security.token_time`
- `email` — JSONB (SMTP/SES config)

### Tiers
- `id` (PK)
- `name`, `icon`, `description`
- `fees` — JSONB with shape:
  ```
  fees: { maker: { "btc-usdt": 0.001 }, taker: { "btc-usdt": 0.002 } }
  ```
- `deposit_limit`, `withdrawal_limit`, `native_currency_limit`
- `created_at`, `updated_at`

## Constraints & integrity

- `Users.email` is `UNIQUE NOT NULL`. No two rows can share an email.
- `Users.settings`, `Users.meta`, `Users.bank_account` are JSONB so
  application-level schema validation is required to keep shape consistent.
- Trigger `db/triggers/update_userlevel_after_verify.js` increments
  `Users.verification_level` after email/OTP verification.
- Foreign keys are declared inside Sequelize associations
  (`hasMany`, `belongsTo`); physical `FOREIGN KEY` clauses appear
  only on a subset of relations and may require manual inspection per
  Kit version.

## Operations

- **Read-only queries** are safe in a shared environment.
- **Writes** (INSERT/UPDATE/DELETE) require `DB_READ_ONLY=false` AND a
  schema test that explicitly opts in (`tests/database/balance.spec.ts`
  is the only one that does so today).
- The framework asserts that the database client **always uses
  parameterised queries** — see
  [tests/security/sql-injection.spec.ts](tests/security/sql-injection.spec.ts)
  and `tests/database/balance.spec.ts`.

## Schema drift

This schema doc is verified as of v2.5.2. Future Kit versions may add
fields or tables. The schema test suite (`tests/database/schema.spec.ts`)
is intentionally permissive: unknown tables cause `test.skip` rather
than failure, so you can point the framework at a newer Kit and only
need to update this doc + the expected table list.
