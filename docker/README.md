# HollaEx Kit Local Dev Reference (verified 2026-10-09)

> **Status**: the upstream `hollaex/hollaex-kit` repository returns HTTP 404.
> Use the public fork `hongmin78/hollaex-kit` (pinned v2.5.2) for the source
> tree, or pull the published `bitholla/hollaex-kit:2.5.2` Docker image.

This `docker/` directory ships **templates and documentation only**. We do
not run a HollaEx Kit container inside this QA framework — the framework
only tests against an already-running Kit that you provision separately.
The reason: a HollaEx Kit needs an `ACTIVATION_CODE` issued from the
HollaEx Network (sandbox or production) before it can boot. Automation
that provision this code would itself need access to your HollaEx
credentials, so we keep the boundary explicit.

## 1. The local stack (from `server/docker-compose.yaml`)

Services:

| Service               | Image                          | Port  | Purpose                                  |
|-----------------------|--------------------------------|-------|------------------------------------------|
| `hollaex-kit-redis`   | `redis:5.0.5-alpine`           | 6379  | pub/sub + cache (AUTH `bitholla`)        |
| `hollaex-kit-db`      | `postgres:10.9`                | 5432  | DB `hollaex` / user `admin` / pass `root` |
| `hollaex-kit-server`  | built from `tools/Dockerfile.pm2` | 10010, 10011, 10080 | PM2: api + ws + plugins |
| `hollaex-kit-nginx`   | `nginx:1.15.8-alpine`          | 80    | `/v2` → `api`, `/stream` → `socket`, `/plugins` → `plugins` |

The compose file is in the source tree at `server/docker-compose.yaml`.
The env template lives at `server/tools/hollaex-kit.env.local.example`.

## 2. Required env (verbatim from `server/tools/hollaex-kit.env.local.example`)

Only the variables you must set to get a working local instance:

```env
API_HOST=localhost
API_NAME=hollaex-kit
DOMAIN=http://localhost:3000
NETWORK=testnet
NETWORK_URL=
ACTIVATION_CODE=        # sandbox code from the HollaEx Network dashboard
CURRENCIES=xht,usdt,btc,eth,bch,xrp
PAIRS=xht-usdt
NATIVE_CURRENCY=usdt
DEFAULT_THEME=dark
NEW_USER_DEFAULT_LANGUAGE=en
NEW_USER_IS_ACTIVATED=true
VALID_LANGUAGES=en
NODE_ENV=development
PORT=10010
WEBSOCKET_PORT=10080
PLUGIN_PORT=10011

PUBSUB_HOST=hollaex-kit-redis
PUBSUB_PORT=6379
PUBSUB_PASSWORD=bitholla
REDIS_HOST=hollaex-kit-redis
REDIS_PORT=6379
REDIS_PASSWORD=bitholla

DB_HOST=hollaex-kit-db
DB_NAME=hollaex
DB_USERNAME=admin
DB_PASSWORD=root
DB_PORT=5432
DB_DIALECT=postgres
DB_SSL=false

ISSUER=bitholla
SECRET=secret
ADMIN_EMAIL=admin@hollaex.com
ADMIN_PASSWORD=        # set after first run if you use the seeder
SENDER_EMAIL=support@holla.tech
SUPPORT_EMAIL=support@holla.tech

API_KEY=               # populated post-activation by setExchange.js
API_SECRET=            # populated post-activation by setExchange.js
KIT_VERSION=           # set to the contents of `./version`
CAPTCHA_SECRET_KEY=
CAPTCHA_SITE_KEY=
ADMIN_WHITELIST_IP=127.0.0.1/32
ALLOWED_DOMAINS=http://localhost:3000
```

## 3. Bring-up commands

```bash
# 1. Acquire the source
git clone https://github.com/hongmin78/hollaex-kit.git
cd hollaex-kit
git checkout v2.5.2   # or any compatible tag

# 2. Prepare env
cp server/tools/hollaex-kit.env.local.example server/tools/hollaex-kit.env.local
$EDITOR server/tools/hollaex-kit.env.local
#   set ACTIVATION_CODE=  (sandbox code from HollaEx dashboard)
#   set ADMIN_PASSWORD=   (any non-empty value, used by the seeder)
#   set NODE_ENV=development (so admin endpoints are visible in swagger)

# 3. Start the stack
cd server
docker compose up -d

# 4. Wait for the API to come up
until curl -sf http://localhost:10010/v2/health >/dev/null; do sleep 1; done

# 5. Read out the auto-generated admin API key/secret
docker compose exec hollaex-kit-server \
  cat /home/hollaex/.hollaex-kit/secrets.json | jq '{api_key, api_secret}'
```

## 4. Smoke checks

```bash
curl -s http://localhost:10010/v2/health
curl -s http://localhost:10010/v2/constants | jq '.coins | keys'
curl -s http://localhost:10010/v2/tickers | jq 'keys'
open http://localhost/api/explorer        # swagger UI
```

WebSocket gateway is reachable at `ws://localhost:stream?authorization=Bearer <jwt>`.

## 5. Wiring this QA framework to the local stack

The framework's `.env` (copy from `.env.example`) must be set as follows
when targeting a local Kit:

```env
HOLLAEX_ENV=local
LOCAL_BASE_URL=http://localhost:3000
LOCAL_API_BASE_URL=http://localhost:10010
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=5432
LOCAL_DB_NAME=hollaex
LOCAL_DB_USER=admin
LOCAL_DB_PASSWORD=root
TEST_USER_EMAIL=tester@holla.tech          # matches the kit's seeded test user
TEST_USER_PASSWORD=hunter2
ADMIN_API_KEY=<from secrets.json>
ADMIN_API_SECRET=<from secrets.json>
DB_READ_ONLY=true                          # prevent destructive tests
INTEGRATION_WORKERS=1
```

Switch `HOLLAEX_ENV` to `production-readonly` to flip the framework
back to the safe public-surface mode.

## 6. What does NOT exist

- Top-level `docker-compose.yml` (use `server/docker-compose.yaml`).
- Top-level `local-bash/` directory (the bootstrap is `install.sh` at
  the root).
- No `/v2/markets` or `/v2/currencies` REST endpoint — `/v2/constants`
  returns them under `coins` and `pairs`.
- `/v2/login` and `/v2/user` are scoped JWT-only or HMAC-only endpoints;
  there is no anonymous password login endpoint on the public API.
