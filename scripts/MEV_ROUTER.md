# MEV-Resistant Transaction Router

Script: `scripts/mevRouter.js`

Features:
- Sends EOA transactions via private relays (Flashbots/Eden/bloXroute Protect-style RPCs)
- Randomizes send times and relay selection to reduce MEV risk
- Sends ERC-4337 UserOperations to private bundlers

## Environment
- `PRIVATE_RELAYS`: comma-separated private RPCs (default includes Flashbots Protect)
- `PUBLIC_RPC`: optional fallback public RPC
- `CHAIN_ID`: chain id (default 1)
- `PK`: private key for EOA mode (0x...)
- `BUNDLER_URLS`: comma-separated bundler URLs
- `BUNDLER_API_KEY`: optional Authorization bearer for bundlers
- `ENTRYPOINT`: ERC-4337 EntryPoint address

## Install deps
```
npm i ethers minimist
# If using Node < 18, also:
npm i node-fetch@2
```

## EOA mode (private relays)
```
$env:PK="0xabc..."
$env:PRIVATE_RELAYS="https://rpc.flashbots.net,https://virginia.edennetwork.io/v1/rpc"
$env:CHAIN_ID="1"
node scripts/mevRouter.js eoa --to 0xRecipient --value 0.01 --data 0x
```
Output: JSON with relay url and tx hash.

## AA mode (UserOperation)
Prepare a signed userOp JSON (see `scripts/examples/userop.example.json`).
```
$env:ENTRYPOINT="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
$env:BUNDLER_URLS="https://api.pimlico.io/v2/1/rpc"
node scripts/mevRouter.js aa --userop scripts/examples/userop.example.json
```
Output: JSON with bundler url and userOpHash.

## Notes
- Randomized jitter is applied per attempt; multiple relays/bundlers reduce single-point leakage.
- For ERC-4337 signing/building userOps, integrate with `@account-abstraction/sdk` or your custom builder.
