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
