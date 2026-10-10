# Requirements Traceability Matrix

Maps HollaEx features (verified) → automated test IDs → status.

| Feature                                       | Test IDs                                                           | Status         |
|-----------------------------------------------|--------------------------------------------------------------------|----------------|
| **Public UI** — `/` (SPA shell)                | HOL-UI-001…HOL-UI-009                                              | Executable     |
| **Public UI** — `/markets`, `/trade/*`, `/login`, `/signup` | HOL-UI-010…HOL-UI-013                                  | Executable (verifies the missing-route 404) |
| **Public UI** — Responsive                    | HOL-RES-001…HOL-RES-005                                            | Executable     |
| **Public UI** — Accessibility (axe-core WCAG-A) | HOL-A11Y-001…HOL-A11Y-004                                          | Executable     |
| **REST API** — `/v2/health`                   | HOL-API-020, HOL-PERF-001                                          | Executable     |
| **REST API** — `/v2/constants`                | HOL-API-021, HOL-PERF-002                                          | Executable     |
| **REST API** — `/v2/kit`                      | HOL-API-022, HOL-API-024                                           | Executable     |
| **REST API** — `/v2/tiers`                    | HOL-API-023, HOL-API-025, HOL-PERF-004                             | Executable     |
| **REST API** — `/v2/tickers`                  | HOL-API-001, HOL-API-002, HOL-PERF-003                             | Executable     |
| **REST API** — `/v2/ticker?symbol=`           | HOL-API-003, HOL-API-004                                           | Executable     |
| **REST API** — `/v2/orderbook?symbol=`        | HOL-API-005, HOL-API-007, HOL-PERF-005                             | Executable     |
| **REST API** — `/v2/orderbooks`               | HOL-API-005 (broader envelope check)                              | Executable     |
| **REST API** — `/v2/trades?symbol=`           | HOL-API-006                                                        | Executable     |
| **REST API** — `/v2/chart`                    | HOL-API-010, HOL-API-011, HOL-API-012                              | Executable     |
| **REST API** — `/v2/charts`                   | HOL-API-028                                                        | Executable     |
| **REST API** — `/v2/minicharts`               | HOL-API-027                                                        | Executable     |
| **REST API** — `/v2/oracle/prices`            | HOL-API-026                                                        | Executable     |
| **REST API** — error envelopes                | HOL-API-030, HOL-API-031, HOL-API-032                              | Executable     |
| **Security** — XSS reflection                 | HOL-SEC-001                                                        | Executable     |
| **Security** — Oversized query                | HOL-SEC-002                                                        | Executable     |
| **Security** — Stack trace leak               | HOL-SEC-003                                                        | Executable     |
| **Security** — CORS hardening                 | HOL-SEC-004                                                        | Executable     |
| **Security** — Method/content-type enforcement | HOL-SEC-005                                                       | Executable     |
| **Security** — SQL injection sweep            | HOL-SEC-010…HOL-SEC-015                                            | Executable     |
| **Database** — Connection                     | HOL-DB-001                                                         | Self-skip on production-readonly        |
| **Database** — Core table presence            | HOL-DB-002                                                         | Self-skip on production-readonly        |
| **Database** — Column constraints             | HOL-DB-003…HOL-DB-006                                              | Self-skip on production-readonly        |
| **Database** — Balance accounting             | HOL-DB-010                                                         | Self-skip on production-readonly        |
| **Database** — Parameterised SQL injection     | HOL-DB-011                                                         | Self-skip on production-readonly        |
| **Auth** — HMAC sign + verification           | HOL-AUTH-001, HOL-AUTH-002                                         | Self-skip on production-readonly        |
| **End-to-end** — Place limit buy              | HOL-E2E-001                                                        | Self-skip on production-readonly        |
| **End-to-end** — Reject negative price         | HOL-E2E-002                                                        | Self-skip on production-readonly        |
| **End-to-end** — Reject zero size             | HOL-E2E-003                                                        | Self-skip on production-readonly        |

Coverage by category:

| Category                     | Test IDs                                |
|------------------------------|------------------------------------------|
| UI smoke                     | HOL-UI-001…HOL-UI-013, HOL-RES-001…HOL-RES-005 |
| UI negative                  | HOL-UI-010…HOL-UI-013                   |
| Accessibility                | HOL-A11Y-001…HOL-A11Y-004               |
| API positive                 | HOL-API-001…HOL-API-007, HOL-API-020…HOL-API-028 |
| API chart                    | HOL-API-010…HOL-API-012                 |
| API negative                 | HOL-API-030…HOL-API-032                 |
| API performance              | HOL-PERF-001…HOL-PERF-005               |
| API security                 | HOL-SEC-001…HOL-SEC-015                 |
| Database (read-only default) | HOL-DB-001…HOL-DB-006, HOL-DB-010…HOL-DB-011 |
| Auth (local Kit)             | HOL-AUTH-001, HOL-AUTH-002              |
| E2E (local Kit)              | HOL-E2E-001…HOL-E2E-003                 |

Status legend:

- **Executable**: test runs today against the production surface.
- **Self-skip**: test runs but skips when environment is missing,
  never silently switches to production.
- **Blocked**: test cannot run because of an upstream defect — see
  [known-limitations.md](known-limitations.md).
