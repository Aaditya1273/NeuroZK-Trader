#!/usr/bin/env node
/*
Usage:
  node scripts/session/revoke-session-key.js \
    --account 0xSmartAccount \
    --rpc https://sepolia.infura.io/v3/KEY \
    --ownerKey 0xOWNER_PRIVATE_KEY \
    --key 0xSESSION_KEY_ADDRESS [--deleteFile true]

Or provide --file path to previously saved encrypted key JSON to infer --key automatically:
  node scripts/session/revoke-session-key.js --account 0x.. --rpc ... --ownerKey 0x.. --file ./session_keys/session-0xABC.json

Env alternatives:
  OWNER_PRIVATE_KEY         - fallback for --ownerKey
  RPC_URL                   - fallback for --rpc
*/
const fs = require('fs')
const path = require('path')
const { JsonRpcProvider, Contract, Wallet } = require('ethers')

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
  let key = a.key
  const file = a.file
  const deleteFile = String(a.deleteFile || '').toLowerCase() === 'true'

  if (!rpc) throw new Error('Missing --rpc or RPC_URL')
  if (!ownerKey) throw new Error('Missing --ownerKey or OWNER_PRIVATE_KEY')
  if (!account) throw new Error('Missing --account')

  if (!key && file) {
    const raw = fs.readFileSync(path.resolve(file), 'utf-8')
    const json = JSON.parse(raw)
    key = json.sessionAddress
  }
  if (!key) throw new Error('Provide --key 0x.. or --file JSON that contains sessionAddress')

  const provider = new JsonRpcProvider(rpc)
  const owner = new Wallet(ownerKey, provider)
  const abi = [
    'function revokeSessionKey(address key) external',
    'function isSessionKeyValid(address key) public view returns (bool)'
  ]
  const acct = new Contract(account, abi, owner)

  console.log(`Revoking session key ${key} on ${account} ...`)
  const tx = await acct.revokeSessionKey(key)
  console.log('tx sent:', tx.hash)
  const rc = await tx.wait()
  console.log('confirmed in block', rc.blockNumber)

  try {
    const ok = await acct.isSessionKeyValid(key)
    console.log('isSessionKeyValid after revoke:', ok)
  } catch {}

  if (deleteFile && file && fs.existsSync(file)) {
    fs.unlinkSync(file)
    console.log('Deleted key file:', file)
  }
}

main().catch((e) => {
  console.error('Error:', e.message || e)
  process.exit(1)
})
