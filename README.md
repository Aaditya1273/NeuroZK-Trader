# NeuroZK-Trader

Modular ERC-4337 smart account with session keys and social recovery, ZK-verified trade pipeline, MEV-resistant routing, OKX integration, AI backtesting, and a live dashboard.

## Overview

NeuroZK-Trader is a modular Web3 trading stack that unifies:

- ERC‑4337 smart accounts with session keys and social recovery
- ZK‑verified trade pipeline (prove policy/limits without leaking strategy)
- MEV‑resistant execution via private relays
- OKX DEX integration for liquidity
- AI backtesting/predictions
- Live React dashboard with WebSocket feeds

### The Problem in Web3

- **Key management & UX**: EOAs are brittle; one leaked key = total loss; no granular permissions.
- **MEV & execution risk**: Sandwiching/front‑running → slippage and losses.
- **Trust in strategies**: Hard to prove compliance with risk limits without revealing alpha.
- **Operational security**: Bots/tools often need raw keys; dangerous privileges.
- **Fragmented infra**: Data, routing, execution across providers; inconsistent reliability/latency.

### Our Solution

- **Modular ERC‑4337 Smart Account**: Policy‑driven account with fine‑grained permissions.
- **Session Keys + Social Recovery**: Temporary, scoped keys (limits, expiry) and guardian recovery.
- **ZK‑Verified Trading**: Proofs that trades respect constraints (risk caps, model bounds) without revealing the model.
- **MEV‑Resistant Routing**: Private order flow via Flashbots/relays; bundling to reduce exposure.
- **OKX DEX Integration**: Access deep liquidity; unified routing.
- **AI Core & Backtesting**: Train/predict signals; validate strategies offline; stream predictions live.
- **Live Dashboard**: Real‑time predictions/trades/health via WS; clean Vite/React UI.

### How the System Works

1. **Setup & Accounts**
   - Deploy factories/`EntryPoint`; create session keys via `scripts/session/*.js` (scoped TTL/limits), encrypted in `SESSION_KEYS_DIR` using `SESSION_VAULT_PASSPHRASE`.
2. **Signal → Intent**
   - AI module emits signals (e.g., BTC‑USDT prob_up). Create a trade intent with constraints (size, slippage, risk bounds).
3. **ZK Proof**
   - Circom circuits (under `zk/`) prove the intent respects policy; share proof + public inputs only.
4. **UserOperation (ERC‑4337)**
   - Build a `UserOperation` signed by a session key (no owner key exposure) for smart‑account execution.
5. **MEV‑Safe Submission**
   - Submit via bundler/Flashbots/private relays to minimize front‑running.
6. **Execution & Observability**
   - Execute swap via OKX/router; `scripts/ws/feeder.js` streams prediction/trade/health; frontend subscribes to `VITE_WS_URL`.
7. **Recovery & Ops**
   - Guardians can rotate ownership; session keys are revocable/time‑bounded.

## Quick Start

- Requirements: Node.js 20+, Python 3.11+, Git
- Install Node deps:
  ```bash
  npm install
  ```
- Frontend install & dev:
  ```bash
  cd frontend/dashboard && npm install && npm run dev
  ```
- AI deps:
  ```bash
  pip install -r ai/requirements.txt
  ```

## Environment

Copy `.env.examples` as a base. For local dev, place values in a `.env` at the repo root (never commit secrets):

Important entries:
- `SEPOLIA_RPC_URL` – testnet RPC
- `DEPLOYER_KEY` – deployer private key (0x...)
- `SESSION_VAULT_PASSPHRASE`, `SESSION_KEYS_DIR` – session key vault
- `WS_PORT` – local WS feeder port
- OKX/Binance keys (optional for real data)

## Contracts

- Hardhat config: `hardhat.config.js` (networks: `sepolia`, `xlayer`)
- Compile & Test:
  ```bash
  npx hardhat compile
  npm run test:contracts
  ```
- Deploy (local):
  ```bash
  SEPOLIA_RPC_URL=... DEPLOYER_KEY=... npx hardhat run scripts/bridge/deployBridge.js --network sepolia
  ```

### Session Keys

- Add session key:
  ```bash
  node scripts/session/add-session-key.js --account <smartAccount> --valid 3600
  ```
- Revoke session key:
  ```bash
  node scripts/session/revoke-session-key.js --account <smartAccount> --key <address>
  ```

## ZK (Circom)
- Circuits under `zk/circuits/` with a README and test workflow via `snarkjs`.

## AI Core & Backtesting

- Train or predict via `ai/core.py`; backtest via `ai/backtest.py`:
  ```bash
  python -m ai.core train --inst BTC-USDT --bar 1m --horizon 5
  python -m ai.backtest --inst BTC-USDT --bar 1m --horizon 5 --limit 2000 --plotOut backtests/equity.png
  ```
- Models: store artifacts under `models/` (ignored by git) or an object store; AI Docker can fetch/copy them at runtime.

## MEV Router

- Docs in `scripts/MEV_ROUTER.md`
- Run locally:
  ```bash
  node scripts/mevRouter.js
  ```

## Dashboard

- Vite + React + Tailwind in `frontend/dashboard/`.
- Local feeder for live data:
  ```bash
  npm run ws:feeder   # ws://localhost:8080
  cd frontend/dashboard && npm run dev
  ```

## Docker

- AI service: `docker/ai.Dockerfile`
- MEV router: `docker/mev-router.Dockerfile`

Build locally:
```bash
docker build -f docker/ai.Dockerfile -t neurozk/ai:dev .
docker build -f docker/mev-router.Dockerfile -t neurozk/mev-router:dev .
```

## CI/CD (GitHub Actions)
- Workflow: `.github/workflows/ci.yml`
- Jobs: contracts compile/tests, optional testnet deploy on main/tags, build & push Docker images to GHCR.
- Required GitHub Secrets (Settings → Secrets and variables → Actions):
  - `RPC_URL` → used as `SEPOLIA_RPC_URL` in workflow
  - `DEPLOYER_PRIVATE_KEY` → used as `DEPLOYER_KEY`
- Optional:
  - `WORKFLOW_DEPLOY_SCRIPT` (default `scripts/deployBridge.js`)

## Tests

- Contract tests (session keys, guardians): `test/ModularSmartAccount.test.ts`
  ```bash
  npm run test:contracts
  ```
- OKX tests: `npm run test:okx`

## Example Scenario

Goal: Let a trading bot place orders for 1 hour using your smart account, while you keep ownership and recovery controls. Off‑chain, use OKX API to place market/limit orders with clear error handling.

### On‑chain: Smart Account usage
- Contracts: `contracts/ModularSmartAccount.sol`
- What you do:
  1. Deploy the smart account with your owner EVM key and an EntryPoint address (tests use a dummy `MinimalEntryPoint`).
  2. Add a temporary “session key” for your bot for 1 hour.
  3. Bot acts using its session key (only while valid).
  4. You can revoke the session key anytime or recover ownership via a guardian.

- Example flow (as in `test/ModularSmartAccount.test.ts`):
  - Add a session key:
    - `msa.addSessionKey(sessionKey.address, 3600 * 1000)` emits `SessionKeyAdded`.
  - Validate:
    - `msa.isSessionKeyValid(sessionKey.address)` returns `true` until expiry.
  - Revoke:
    - `msa.revokeSessionKey(sessionKey.address)` emits `SessionKeyRevoked`, and `isSessionKeyValid` returns `false`.
  - Social recovery:
    - A guardian calls `msa.recoverOwner(newOwner)` to change ownership, emitting `OwnerRecovered`.

- Commands (terminal):
  - Compile/tests:
    ```bash
    npm run test:contracts:ts
    ```

### Off‑chain: Trading with OKX
- Client tests: `tests/okx/*.test.ts`
- What you do:
  1. Put OKX API credentials in `.env`:
     ```env
     OKX_API_KEY=...
     OKX_API_SECRET=...
     OKX_PASSPHRASE=...
     OKX_BASE_URL=https://www.okx.com   # or demo URL
     ```
  2. Run tests that verify:
     - Signed headers are attached correctly.
     - Market/limit order params are validated (e.g., limit orders require `px`).
     - API error codes are surfaced as `OkxError`.

- Commands (terminal):
  - Run OKX tests with explicit config:
    ```bash
    npx jest --config jest.config.js --verbose --runTestsByPath tests/okx/client.test.ts tests/okx/orders.test.ts
    ```

### What you gain
- Secure delegation: Session keys let a bot act for a limited time without giving it full control.
- Recovery: Guardians can recover ownership if needed.
- Typed & tested: TypeChain for contract types, Jest for OKX flows, Hardhat for Solidity tests.
- Headless workflow: Everything runs from the terminal; no UI required.

### Quick commands recap
- Contracts (TS tests): `npm run test:contracts:ts`
- Single contract test: `npx hardhat test test/ModularSmartAccount.test.ts --show-stack-traces --bail`
- OKX tests: `npx jest --config jest.config.js --verbose --runTestsByPath tests/okx/client.test.ts tests/okx/orders.test.ts`

## Live Demo (for judges)

Make it visual but zero‑risk. Use local tests and a simple flow.

### 1) Contracts demo (session keys & guardians)
```bash
npm run demo:contracts
```
Shows: add/revoke session key, owner recovery event, and validations.

### 2) OKX client demo (signed requests, orders)
```bash
npm run demo:okx
```
Shows: signed headers, market/limit order validation, and error handling.

### 3) Optional: live dashboard
- Start feeder: `npm run ws:feeder` (ws://localhost:8080)
- Start frontend: `cd frontend/dashboard && npm run dev`

Tips:
- For real networks, set `SEPOLIA_RPC_URL` and `DEPLOYER_KEY` in `.env`. For demos, tests are enough.
- Never commit secrets; `.env*` is git‑ignored.

## Notes
- Git ignores `session_keys/`, `models/`, `.env*`, build artifacts.
- On Windows, line endings may convert to CRLF. To normalize, add `.gitattributes`:
  ```gitattributes
  * text=auto
  *.sol text eol=lf
  *.ts text eol=lf
  *.js text eol=lf
  *.yml text eol=lf
  *.py text eol=lf
  ```
