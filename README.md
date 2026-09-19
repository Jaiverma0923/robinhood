# Boundary — a risk guardrail for AI trading agents

A working prototype of a policy enforcement layer that sits between an AI trading
agent and Robinhood's Trading MCP / execution API. Every trade request is evaluated
against configurable risk limits before it can reach execution — the agent has no
path that bypasses the check.

```
AI Trading Agent → Guardrail Proxy → Robinhood Trading MCP / Execution API
```

This is an MVP built to demonstrate the guardrail concept end-to-end, not a
brokerage. Execution is simulated; the architecture shows exactly where a real
Robinhood integration would connect.

## Overview

An AI trading agent can send orders at machine speed. Boundary makes sure every
one of those orders is checked against hard, human-configured limits — spend,
position size, concentration, and loss — before it's allowed anywhere near a real
execution API. If a request violates any rule it's rejected with a specific reason;
everything else is forwarded and simulated as executed. Every decision, approved or
blocked, is written to an audit log.

## Problem

Autonomous trading agents don't pause to reconsider a risky order the way a person
might. Once an agent is wired directly to a brokerage's execution API, every
request it generates goes through — a bug, a bad prompt, or a runaway strategy can
turn into real financial damage in seconds. Guardrails need to sit *between* the
agent and the market, enforcing limits the agent cannot negotiate around, at the
same speed the agent operates.

## Architecture

```
AI Trading Agent
       │
       ▼
POST /api/trade  (Guardrail Proxy)
       │
       ├─ evaluate against Risk Policy (5 independent checks)
       ├─ record the decision to the Activity Log
       │
   ┌───┴────┐
   │        │
BLOCKED   APPROVED
   │        │
   ▼        ▼
 return   POST /api/execute  (Mock Robinhood Execution Layer)
 reason        │
               ▼
        simulated fill + order id
```

- The frontend never calls the execution layer directly — it only calls the
  guardrail proxy (`/api/trade`).
- The guardrail proxy is the only caller of the execution layer, and only after
  every check passes.
- `/api/execute` is also exposed as its own route so the proxy → execution
  boundary is visible and independently testable — in a production system, this
  is the only piece that would be swapped for a real Robinhood Trading MCP call.

## Features

- **Guardrail engine** (`src/lib/guardrail.ts`) — a pure, dependency-free function
  that evaluates a trade request against five independent risk checks and returns
  a detailed pass/fail breakdown for each one.
- **Trading simulator** — submit a request the way an agent would (symbol, side,
  quantity, estimated price), watch it move through an animated request → guardrail
  → execution flow, and see exactly which checks passed or failed. Includes
  one-click "dangerous" and "safe" demo scenarios.
- **Risk policy configuration** — daily spend cap, max single trade, max position,
  max concentration, and daily loss limit are all editable from the UI and take
  effect on the very next request. Nothing here is a static mock; the values are
  read by the backend on every trade.
- **Portfolio dashboard** — live risk metrics (daily spend, remaining budget, daily
  loss, largest position, concentration, approved/blocked counts) with progress
  meters, plus current holdings.
- **Activity / audit log** — every request, approved or blocked, with filters and
  a detail view showing the full per-check breakdown.
- **Mock Robinhood execution layer** — clearly labeled simulated execution with
  mock order IDs (`RH-MOCK-xxxxx`). No real trades are ever placed.
- **Automated tests** for the guardrail engine covering all required scenarios.

## Guardrail logic

Every check is evaluated independently on every request — the engine doesn't
short-circuit on the first failure, so the caller (and the audit log) always sees
the complete picture.

| Check | Rule |
|---|---|
| **Single trade** | Reject if `tradeValue > maxSingleTrade`. Applies to both buys and sells. |
| **Daily spend** | Reject a BUY if `dailySpendSoFar + tradeValue > dailySpendCap`. Sell orders don't draw from the spend budget. |
| **Position limit** | For BUY orders, reject if `currentPositionValue + tradeValue > maxPositionValue`. |
| **Concentration** | Reject if the projected position would exceed `maxConcentration` of total portfolio value. |
| **Daily loss** | Circuit breaker — once the portfolio's simulated daily loss reaches `dailyLossLimit`, all new trades are blocked regardless of size. |

`tradeValue = quantity × estimatedPrice`. `dailyLoss = max(0, -portfolio.dailyPnl)`.

## Local setup

Requires Node.js 18.18+.

```bash
cd guardrail
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page links to
`/dashboard`, which is where the interactive product lives.

To reset all demo data (portfolio, policy, activity log) back to its original
seeded state:

```bash
curl -X POST http://localhost:3000/api/reset
```

(or just delete `data/db.json` and restart the dev server.)

### Running tests

```bash
npm test
```

Runs the guardrail engine's test suite (Vitest) covering every required scenario.

### Production build

```bash
npm run build
npm start
```

## Environment variables

None are required. This MVP uses a mock execution layer instead of real Robinhood
credentials — there is nothing to configure. State is persisted to a local JSON
file at `data/db.json` (created automatically on first run) so the demo survives a
server restart; delete it at any time to reset.

## API documentation

### `POST /api/trade`
The guardrail proxy. Accepts a trade request, evaluates it against the current
risk policy, executes it (simulated) if approved, and logs the decision either way.

```json
// Request
{ "symbol": "AAPL", "side": "BUY", "quantity": 10, "estimatedPrice": 250, "agent": "my-agent" }

// Response
{
  "approved": false,
  "reason": "$2,500.00 exceeds the $500.00 per-trade limit.",
  "failedCheck": "singleTrade",
  "checks": { "singleTrade": false, "dailySpend": true, "positionLimit": true, "concentration": true, "dailyLoss": true },
  "checkDetails": [ { "key": "singleTrade", "label": "Single-trade limit", "passed": false, "detail": "…" } ],
  "tradeValue": 2500,
  "execution": { "status": "not_attempted", "orderId": null }
}
```

### `POST /api/execute`
Mock Robinhood execution layer. Always "fills" the order and returns a mock order
ID. In this MVP only `/api/trade` calls it, after a request has cleared every
check — it's exposed separately so the proxy → execution architecture is visible.

### `GET /api/portfolio`
Returns current cash, holdings, and today's simulated P&L.

### `GET /api/activity`
Returns the full audit log, newest first.

### `GET /api/policies` / `PUT /api/policies`
Read or update the current risk policy. `PUT` validates the payload (positive
numbers, concentration between 1–100%, single-trade limit not greater than the
daily cap) and immediately affects every subsequent `/api/trade` call.

### `GET /api/risk-snapshot`
Aggregated dashboard metrics: daily spend vs. cap, daily loss vs. limit, largest
position vs. max position, concentration vs. limit, and approved/blocked counts.

### `POST /api/reset`
Restores the seeded demo data (portfolio, policy, activity log).

## Demo

1. Open the landing page and read the problem statement — the hero shows a live,
   auto-cycling example of the guardrail blocking then approving a trade.
2. Click **Launch dashboard** to see the current portfolio and risk limits.
3. Open **Trade simulator**.
4. Click the **Dangerous request** preset (20 shares of NVDA at $180 = $3,600) and
   send it — watch it get blocked, with all four violated checks called out
   individually (single-trade, daily spend, position limit, and concentration).
5. Click the **Safe request** preset (2 shares of AAPL at $180 = $360) and send it —
   watch it get approved and "executed," with a mock order ID.
6. Open **Activity** to see both requests in the audit trail; click either row for
   the full per-check breakdown.
7. Open **Risk policies**, lower **Maximum single trade** to something small (e.g.
   $50), save, then go back to the simulator and submit a trade above that amount —
   it's blocked immediately, with no code change or redeploy.

## Future improvements

For a production version of this system:

- Replace the mock execution layer with a real Robinhood Trading MCP / execution
  API integration, including proper OAuth and account-scoped credentials.
- Replace the JSON-file store with a real database (Postgres) and move the
  guardrail evaluation to a durable, transactional path so concurrent requests
  can't race past a limit.
- Add authentication and per-user/per-agent policies instead of a single global
  policy.
- Add rate limiting and anomaly detection independent of the dollar-based checks
  (e.g. order frequency, symbol diversity, time-of-day patterns).
- Real-time price feeds for `estimatedPrice` validation, and slippage-aware
  position/concentration math instead of the simplified cash↔holding swap used
  here.
- Multi-agent support with per-agent audit trails and independently configurable
  limits.
- Alerting (email/Slack/webhook) when the daily loss circuit breaker trips or a
  policy is changed.

## Code quality

- The guardrail engine (`src/lib/guardrail.ts`) is pure and has no dependency on
  Next.js, the database, or the UI — it's fully unit-testable in isolation
  (`src/lib/__tests__/guardrail.test.ts`).
- Business logic lives entirely in `src/lib/`; API routes are thin adapters, and
  UI components never encode risk rules directly.
- Request payloads are validated with `zod` before touching the guardrail.
