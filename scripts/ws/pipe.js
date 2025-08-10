#!/usr/bin/env node
// Pipe any CLI command's stdout lines to the WS feeder as { type: 'analysis', payload: { source, line, ts } }
// Usage: node scripts/ws/pipe.js --name okx -- npx jest --config jest.config.js --verbose --runTestsByPath tests/okx/client.test.ts

const WebSocket = require('ws')
const { spawn } = require('child_process')

const nameIdx = process.argv.indexOf('--name')
const dashIdx = process.argv.indexOf('--')
const tee = process.argv.includes('--tee')
const source = nameIdx !== -1 ? process.argv[nameIdx + 1] : 'cli'
if (dashIdx === -1) {
  console.error('Usage: node scripts/ws/pipe.js --name <source> [--tee] -- <command> [args...]')
  process.exit(1)
}
const cmd = process.argv[dashIdx + 1]
const args = process.argv.slice(dashIdx + 2)

const host = process.env.WS_HOST || 'localhost'
const port = process.env.WS_PORT || '8080'
const url = `ws://${host}:${port}`

const ws = new WebSocket(url)
ws.on('open', () => {
  console.log(`[pipe] connected to ${url}. Spawning: ${cmd} ${args.join(' ')}`)
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })

  const stripAnsi = (s) => s
    // ANSI escape sequences (color/style)
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
    // Other control chars except tab(\t) to preserve spacing
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')

  const send = (line) => {
    const clean = stripAnsi(String(line))
    const msg = { type: 'analysis', payload: { source, line: clean, ts: Date.now() } }
    if (tee) console.log(clean)
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }

  const onData = (buf) => {
    const lines = buf.toString().split(/\r?\n/)
    for (const l of lines) if (l.trim().length) send(l)
  }

  child.stdout.on('data', onData)
  child.stderr.on('data', onData)

  child.on('close', (code) => {
    send(`[${source}] process exited with code ${code}`)
    ws.close()
    process.exit(code ?? 0)
  })
})

ws.on('error', (err) => {
  console.error('[pipe] ws error:', err.message)
  process.exit(1)
})
