#!/usr/bin/env node
/*
Usage:
  node scripts/session/add-session-key.js \
    --account 0xSmartAccount \
    --rpc https://sepolia.infura.io/v3/KEY \
    --ownerKey 0xOWNER_PRIVATE_KEY \
    --valid 2592000 \
    --outDir ./session_keys

Env alternatives:
  SESSION_VAULT_PASSPHRASE  - passphrase for AES-256-GCM
  OWNER_PRIVATE_KEY         - fallback for --ownerKey
  RPC_URL                   - fallback for --rpc
*/
const fs = require('fs')
const path = require('path')
const { Wallet, JsonRpcProvider } = require('ethers')
const { encryptPrivKey } = require('./crypto')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i]
    const v = args[i + 1]
    if (!v || v.startsWith('--')) { i -= 1; continue }
    if (k.startsWith('--')) out[k.slice(2)] = v
  }
  return out
}

async function main() {
  const a = parseArgs()
  const rpc = a.rpc || process.env.RPC_URL
  const ownerKey = a.ownerKey || process.env.OWNER_PRIVATE_KEY || process.env.PK
  const account = a.account
  const valid = Number(a.valid || 0)
  const outDir = a.outDir || path.join(process.cwd(), 'session_keys')
  const passphrase = process.env.SESSION_VAULT_PASSPHRASE

  if (!rpc) throw new Error('Missing --rpc or RPC_URL')
  if (!ownerKey) throw new Error('Missing --ownerKey or OWNER_PRIVATE_KEY')
  if (!account) throw new Error('Missing --account (ModularSmartAccount address)')
  if (!valid || valid <= 0) throw new Error('Missing/invalid --valid seconds')
  if (!passphrase) throw new Error('Missing SESSION_VAULT_PASSPHRASE env')

  const provider = new JsonRpcProvider(rpc)
  const owner = new Wallet(ownerKey, provider)

  // Generate session wallet
  const session = Wallet.createRandom()
  const sessionAddr = await session.getAddress()
  const sessionPriv = session.privateKey

  // Encrypt private key
  const enc = await encryptPrivKey(sessionPriv, passphrase)

  // Prepare storage
  fs.mkdirSync(outDir, { recursive: true })
  const file = path.join(outDir, `session-${sessionAddr}.json`)
  const meta = {
    version: 1,
    createdAt: new Date().toISOString(),
    account,
    sessionAddress: sessionAddr,
    validForSeconds: valid,
    enc,
  }
  fs.writeFileSync(file, JSON.stringify(meta, null, 2))

  // Minimal ABI for addSessionKey(address,uint256)
  const abi = [
    'function addSessionKey(address key, uint256 validForSeconds) external',
    'function isSessionKeyValid(address key) public view returns (bool)'
  ]
  const acct = new (require('ethers').Contract)(account, abi, owner)

  console.log(`Adding session key ${sessionAddr} valid for ${valid}s to ${account} ...`)
  const tx = await acct.addSessionKey(sessionAddr, valid)
  console.log('tx sent:', tx.hash)
  const rc = await tx.wait()
  console.log('confirmed in block', rc.blockNumber)

  // Optional check
  try {
    const ok = await acct.isSessionKeyValid(sessionAddr)
    console.log('isSessionKeyValid:', ok)
  } catch {}

  console.log('Encrypted key saved at', file)
}

main().catch((e) => {
  console.error('Error:', e.message || e)
  process.exit(1)
})
