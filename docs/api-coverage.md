# API Coverage

## Public endpoints

| Endpoint                                       | Tested? | Test IDs                |
|------------------------------------------------|---------|-------------------------|
| `GET /v2/health`                               | Yes     | HOL-API-020, HOL-PERF-001 |
| `GET /v2/constants`                            | Yes     | HOL-API-021, HOL-PERF-002 |
| `GET /v2/kit`                                  | Yes     | HOL-API-022, HOL-API-024 |
| `GET /v2/tiers`                                | Yes     | HOL-API-023, HOL-API-025, HOL-PERF-004 |
| `GET /v2/ticker?symbol=`                       | Yes     | HOL-API-003, HOL-API-004 |
| `GET /v2/tickers`                              | Yes     | HOL-API-001, HOL-API-002, HOL-PERF-003 |
| `GET /v2/orderbook?symbol=`                    | Yes     | HOL-API-005, HOL-API-007, HOL-PERF-005 |
| `GET /v2/orderbooks`                           | Yes     | HOL-API-005 (broader check) |
| `GET /v2/trades?symbol=`                       | Yes     | HOL-API-006 |
| `GET /v2/chart?symbol=&resolution=&from=&to=`  | Yes     | HOL-API-010, HOL-API-011, HOL-API-012 |
| `GET /v2/charts?resolution=&from=&to=`         | Yes     | HOL-API-028 |
| `GET /v2/minicharts?assets=&quote=&from=&to=`  | Yes     | HOL-API-027 |
| `GET /v2/oracle/prices?assets=&quote=&amount=` | Yes     | HOL-API-026 |

## Private endpoints (local Kit only)

These are tested in the `local-auth`, `local-trading`, `local-e2e` projects.
Each test self-skips when the local Kit isn't reachable.

| Endpoint                            | Tested in               | Notes                                  |
|-------------------------------------|-------------------------|----------------------------------------|
| `POST /v2/login`                    | HOL-AUTH-001, HOL-AUTH-002 | HMAC-signed against local Kit        |
| `GET /v2/user`                      | HOL-AUTH-001, HOL-E2E-*  | HMAC-signed                            |
| `GET /v2/user/balance`              | HOL-DB-010              | Asserted against DB ledger             |
| `POST /v2/order`                    | HOL-E2E-001, HOL-E2E-002, HOL-E2E-003 | Place/cancel scenarios     |
| `DELETE /v2/order`                  | (covered by E2E)        | Documented but not asserted yet        |
| `GET /v2/user/deposits`             | Not yet                 | Awaiting fixtures                      |
| `GET /v2/user/withdrawals`          | Not yet                 | Awaiting fixtures                      |

## Security surface

| Vector                          | Tested? | Test IDs             |
|---------------------------------|---------|----------------------|
| XSS via query parameter         | Yes     | HOL-SEC-001          |
| Oversized URL parameter         | Yes     | HOL-SEC-002          |
| Stack-trace leakage in errors   | Yes     | HOL-SEC-003          |
| CORS hardening                  | Yes     | HOL-SEC-004          |
| Wrong HTTP method               | Yes     | HOL-API-031, HOL-SEC-005 |
| SQL injection (parameter form)  | Yes     | HOL-SEC-010…HOL-SEC-015 |
| Local credential stuffing attempts | **No** (intentionally) | This is documented out of scope. |
| Rate-limit stress              | Not yet | Awaiting testnet creds |

## Note on the brief's example URLs

The brief specified the following URLs to verify:

| URL                                          | Verdict                              |
|----------------------------------------------|---------------------------------------|
| `https://api.pro.hollaex.com/v2/constants`   | DNS unreachable — use `api.hollaex.com` |
| `https://api.pro.hollaex.com/v2/markets`     | Not an endpoint on `api.hollaex.com` either — use `/v2/constants` (`pairs`) |
| `https://api.pro.hollaex.com/v2/currencies`  | Not an endpoint on `api.hollaex.com` either — use `/v2/constants` (`coins`) |
| `https://api.pro.hollaex.com/v2/orderbook?symbol=btc-usdt` | DNS unreachable — use `api.hollaex.com` |
| `https://api.pro.hollaex.com/v2/trades?symbol=btc-usdt`   | DNS unreachable — use `api.hollaex.com` |

Every test in this suite targets the verified URL.
