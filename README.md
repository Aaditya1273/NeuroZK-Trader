# NeuroZK-Trader

Modular ERC-4337 smart account with session keys and social recovery, ZK-verified trade pipeline, MEV-resistant routing, OKX integration, AI backtesting, and a live dashboard.

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
