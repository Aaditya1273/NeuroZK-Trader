// Minimal WebSocket feeder for the dashboard
// Emits: prediction, trade, health messages periodically

const WebSocket = require('ws');

const PORT = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`[ws-feeder] listening on ws://localhost:${PORT}`);

function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

// Fake streams
setInterval(() => {
  // prediction: { type: 'prediction', symbol, prob_up, prob_down, ts }
  const probUp = Math.random();
  broadcast({
    type: 'prediction',
    symbol: 'BTC-USDT',
    prob_up: probUp,
    prob_down: 1 - probUp,
    ts: Date.now(),
  });
}, 1500);

setInterval(() => {
  // trade: { type: 'trade', symbol, side, size, price, tx, zkVerified, ts }
  const sides = ['BUY', 'SELL'];
  broadcast({
    type: 'trade',
    symbol: 'BTC-USDT',
    side: sides[Math.floor(Math.random() * sides.length)],
    size: (Math.random() * 0.05 + 0.01).toFixed(4),
    price: (30000 + Math.random() * 1000).toFixed(2),
    tx: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 10)}`,
    zkVerified: Math.random() > 0.3,
    ts: Date.now(),
  });
}, 4000);
process.env.WS_PORT = process.env.WS_PORT || '8080';

setInterval(() => {
  // health: { type: 'health', bundlerBacklog, accountStatus, balance }
  broadcast({
    type: 'health',
    bundlerBacklog: Math.floor(Math.random() * 5),
    accountStatus: Math.random() > 0.1 ? 'healthy' : 'degraded',
    balance: (Math.random() * 0.5 + 0.1).toFixed(4),
  });
}, 5000);

wss.on('connection', () => console.log('[ws-feeder] client connected'));
