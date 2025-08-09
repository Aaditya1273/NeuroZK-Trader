# NeuroZK Trader — zkSNARK Trade Verification (Circom)

This circuit proves a trade was executed according to an AI strategy without revealing private strategy parameters.

Circuit: `zk/circuits/trade_verification.circom`
- Checks:
  - Poseidon(secretSalt, k1, k2) equals public `strategyCommitment`
  - `minSize <= size <= maxSize`
  - Slippage bps between `refPrice` and `executedPrice` <= `maxSlippageBps`
  - `executedPrice` is within ±`allowedBandBps` of `refPrice`
  - Direction enforcement: buy(1) => executed ≥ reference; sell(0) => executed ≤ reference

## Prerequisites
- Node.js and npm
- `snarkjs` installed locally (already added as dev dependency)
- Circom compiler installed and available as `circom` on PATH
  - Install guide: https://docs.circom.io/getting-started/installation/

## Install deps
```
npm i -D snarkjs circomlib circomlibjs
```

## Compute Poseidon commitment for inputs (Windows PowerShell)
```
node zk/utils/commit.js --salt 1 --k1 123456 --k2 9999
```
Copy the decimal output and set `strategyCommitment` in `zk/inputs/example.json`.

## Example inputs
Edit `zk/inputs/example.json` and set a consistent commitment:
```
{
  "strategyCommitment": "<decimal from commit.js>",
  "refPrice": "50000000",           // 50.000000 (scaled 1e6)
  "executedPrice": "49950000",      // 49.95
  "size": "2000000",               // 2.0 units (1e6 scale)
  "signalDirection": "0",           // 0=sell, 1=buy
  "minSize": "1000000",
  "maxSize": "5000000",
  "maxSlippageBps": "100",         // 1%
  "allowedBandBps": "150",         // 1.5%
  "secretSalt": "1",
  "k1": "123456",
  "k2": "9999"
}
```

## Build and prove (Groth16)
```
# 1) Compile circuit
npx circom zk/circuits/trade_verification.circom --r1cs --wasm --sym -o zk/build

# 2) Powers of Tau (small ceremony for local testing)
npx snarkjs powersoftau new bn128 12 zk/build/pot12_0000.ptau -v
npx snarkjs powersoftau contribute zk/build/pot12_0000.ptau zk/build/pot12_0001.ptau --name="local" -v

# 3) Groth16 setup
npx snarkjs groth16 setup zk/build/trade_verification.r1cs zk/build/pot12_0001.ptau zk/build/trade_verification_0001.zkey
npx snarkjs zkey export verificationkey zk/build/trade_verification_0001.zkey zk/build/verification_key.json

# 4) Witness
node zk/build/trade_verification_js/generate_witness.js zk/build/trade_verification_js/trade_verification.wasm zk/inputs/example.json zk/build/witness.wtns

# 5) Proof + verify
npx snarkjs groth16 prove zk/build/trade_verification_0001.zkey zk/build/witness.wtns zk/build/proof.json zk/build/public.json
npx snarkjs groth16 verify zk/build/verification_key.json zk/build/public.json zk/build/proof.json
```

## Negative test
Change `executedPrice` to violate slippage or band constraints (e.g., set it 10% away) and re-run steps 4–5. Verification should fail.

## Notes
- All prices and sizes are treated as integers with an external scale (e.g., 1e6) to avoid division inside the circuit. Adjust as needed.
- For production, use a proper multi-contributor ceremony, stronger constraints, and potentially Plonk or Halo2 depending on your requirements.
