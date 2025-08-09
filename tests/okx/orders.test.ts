import nock from 'nock';
import { OkxClient } from '../../src/okx/client';
import { OkxOrders } from '../../src/okx/orders';

const BASE = 'https://www.okx.com';

describe('OkxOrders', () => {
  const client = new OkxClient({
    baseURL: BASE,
    apiKey: 'key',
    apiSecret: 'secret',
    passphrase: 'pass',
  });
  const orders = new OkxOrders(client);

  afterEach(() => nock.cleanAll());

  it('places market order', async () => {
    const scope = nock(BASE)
      .post('/api/v5/trade/order', (body) => {
        return body.instId === 'BTC-USDT' && body.ordType === 'market' && body.side === 'buy' && body.sz === '0.01';
      })
      .reply(200, { code: '0', msg: '', data: [{ ordId: '111' }] });

    const res = await orders.placeMarketOrder({ instId: 'BTC-USDT', side: 'buy', sz: '0.01' });
    expect(scope.isDone()).toBe(true);
    expect(res.ordId).toBe('111');
  });

  it('places limit order', async () => {
    const scope = nock(BASE)
      .post('/api/v5/trade/order', (body) => body.ordType === 'limit' && body.px === '30000')
      .reply(200, { code: '0', msg: '', data: [{ ordId: '222' }] });

    const res = await orders.placeLimitOrder({ instId: 'BTC-USDT', side: 'sell', sz: '0.02', px: '30000' });
    expect(scope.isDone()).toBe(true);
    expect(res.ordId).toBe('222');
  });

  it('rejects limit order without px', async () => {
    await expect(
      orders.placeLimitOrder({ instId: 'BTC-USDT', side: 'sell', sz: '0.02' } as any)
    ).rejects.toThrow();
  });

  it('propagates per-item sCode errors', async () => {
    nock(BASE)
      .post('/api/v5/trade/order')
      .reply(200, { code: '0', msg: '', data: [{ ordId: '', sCode: '51001', sMsg: 'invalid size' }] });

    await expect(
      orders.placeMarketOrder({ instId: 'BTC-USDT', side: 'buy', sz: 'bad' })
    ).rejects.toThrow(/invalid size/i);
  });
});
