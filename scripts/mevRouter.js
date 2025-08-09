#!/usr/bin/env node
/**
 * MEV-Resistant Transaction Router
 * - Sends transactions via private relays (Flashbots/Eden/bloXroute Protect-style RPCs)
 * - Randomizes send times and relay selection to reduce MEV risk
 * - Supports ERC-4337 UserOperation relay to private bundlers
 *
 * Environment variables:
 *  - PRIVATE_RELAYS: comma-separated RPC URLs (e.g., https://rpc.flashbots.net,https://virginia.edennetwork.io/v1/rpc)
 *  - PUBLIC_RPC: fallback public RPC URL
 *  - CHAIN_ID: numeric chain id (default 1)
 *  - PK: private key for EOA flows (0x...)
 *  - BUNDLER_URLS: comma-separated bundler RPC URLs for AA (e.g., https://api.pimlico.io/v2/chain/bundler, ...)
 *  - BUNDLER_API_KEY: optional API key applied as header Authorization: Bearer <key>
 *  - ENTRYPOINT: ERC-4337 EntryPoint address
 */

const { ethers } = require("ethers");

const DEFAULT_RELAYS = [
  // Flashbots Protect RPC (mainnet)
  "https://rpc.flashbots.net",
  // Eden Network Protect RPC (example)
  "https://virginia.edennetwork.io/v1/rpc",
  // bloXroute Protect RPC (requires key; left as placeholder)
  // "https://<YOUR-BLOXROUTE-ENDPOINT>",
];

function envArray(name, fallbackArr = []) {
  const v = process.env[name];
  if (!v) return fallbackArr;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function jitteredDelay(minMs = 120, maxMs = 1200) {
  const span = Math.max(0, maxMs - minMs);
  return minMs + Math.floor(Math.random() * span);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function providerFromUrl(url) {
  return new ethers.JsonRpcProvider(url, parseInt(process.env.CHAIN_ID || "1"));
}

async function sendPrivateTx({ wallet, txRequest, relays, maxRetries = 3 }) {
  if (!relays || relays.length === 0) throw new Error("No private relays configured");
  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    const url = pickRandom(relays);
    const provider = providerFromUrl(url);
    const signer = wallet.connect(provider);

    // Randomized delay to de-sync from predictable timing
    await sleep(jitteredDelay());

    try {
      // Populate missing fields from provider
      const populated = await signer.populateTransaction(txRequest);
      // Set gas params if needed (1559)
      if (!populated.maxFeePerGas || !populated.maxPriorityFeePerGas) {
        const fee = await provider.getFeeData();
        populated.maxFeePerGas = populated.maxFeePerGas || fee.maxFeePerGas;
        populated.maxPriorityFeePerGas = populated.maxPriorityFeePerGas || fee.maxPriorityFeePerGas;
      }
      if (!populated.nonce) populated.nonce = await provider.getTransactionCount(await signer.getAddress(), "pending");

      const tx = await signer.sendTransaction(populated);
      return { relay: url, hash: tx.hash, tx };
    } catch (err) {
      lastErr = err;
      // small backoff before retrying different relay
      await sleep(200 + i * 300);
    }
  }
  throw lastErr || new Error("Failed to send private tx");
}

// --- ERC-4337: send UserOperation to a private bundler ---
// Expects a fully formed, signed userOp object and EntryPoint address
async function sendUserOperation({ userOp, entryPoint, bundlers, apiKey, maxRetries = 3 }) {
  if (!bundlers || bundlers.length === 0) throw new Error("No bundlers configured");
  if (!entryPoint) throw new Error("ENTRYPOINT required");

  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    const url = pickRandom(bundlers);
    await sleep(jitteredDelay());
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "eth_sendUserOperation",
          params: [userOp, entryPoint],
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(JSON.stringify(json.error));
      return { bundler: url, userOpHash: json.result };
    } catch (err) {
      lastErr = err;
      await sleep(250 + i * 300);
    }
  }
  throw lastErr || new Error("Failed to send userOp");
}

// --- Example CLI ---
// EOA tx: node scripts/mevRouter.js eoa --to 0x... --value 0 --data 0x...
// AA  tx: node scripts/mevRouter.js aa --userop ./userop.json
async function main() {
  const [,, mode, ...rest] = process.argv;
  const relays = envArray("PRIVATE_RELAYS", DEFAULT_RELAYS);
  const bundlers = envArray("BUNDLER_URLS", []);

  if (mode === "eoa") {
    const args = require("minimist")(rest);
    const pk = process.env.PK;
    if (!pk) throw new Error("Set PK for EOA mode");
    const wallet = new ethers.Wallet(pk);

    const txRequest = {
      to: args.to,
      data: args.data || "0x",
      value: args.value ? ethers.parseEther(args.value) : 0n,
      chainId: parseInt(process.env.CHAIN_ID || "1"),
      // gasLimit optional; provider can estimate
    };
    const out = await sendPrivateTx({ wallet, txRequest, relays });
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (mode === "aa") {
    const args = require("minimist")(rest);
    const userOpPath = args.userop;
    const entryPoint = process.env.ENTRYPOINT;
    if (!userOpPath) throw new Error("Provide --userop path to signed UserOperation JSON");
    if (!entryPoint) throw new Error("Set ENTRYPOINT for AA mode");
    const fs = require("fs");
    const userOp = JSON.parse(fs.readFileSync(userOpPath, "utf-8"));
    const out = await sendUserOperation({ userOp, entryPoint, bundlers, apiKey: process.env.BUNDLER_API_KEY });
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log("Usage:\n  node scripts/mevRouter.js eoa --to 0x... --value 0.0 --data 0x...\n  node scripts/mevRouter.js aa --userop ./userop.json");
}

if (require.main === module) {
  // Node18+ has global fetch; if older Node, require('node-fetch')
  if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
  }
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { sendPrivateTx, sendUserOperation, jitteredDelay };
