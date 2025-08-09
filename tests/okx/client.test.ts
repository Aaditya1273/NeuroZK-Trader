import nock from 'nock';
import { OkxClient, OkxError } from '../../src/okx/client';

const BASE = 'https://www.okx.com';

describe('OkxClient', () => {
  const client = new OkxClient({
    baseURL: BASE,
    apiKey: 'key',
    apiSecret: 'secret',
    passphrase: 'pass',
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('attaches signed headers and unwraps ok response', async () => {
    const scope = nock(BASE)
      .post('/api/v5/trade/order')
      .reply(200, { code: '0', msg: '', data: [{ ordId: '123' }] });

    const data = await client.request<{ ordId: string }[]>({
      path: '/api/v5/trade/order',
      method: 'POST',
      data: { instId: 'BTC-USDT' },
      signed: true,
    });

    expect(scope.isDone()).toBe(true);
    expect(data[0].ordId).toBe('123');
  });

  it('throws OkxError when API code != 0', async () => {
    nock(BASE).get('/api/v5/account/balance').reply(200, { code: '51000', msg: 'auth error', data: [] });
    await expect(
      client.request({ path: '/api/v5/account/balance', method: 'GET', signed: true })
    ).rejects.toBeInstanceOf(OkxError);
  });

  it('throws OkxError on HTTP error', async () => {
    nock(BASE).get('/api/v5/market/ticker').reply(500, { msg: 'server err' });
    await expect(
      client.request({ path: '/api/v5/market/ticker', method: 'GET' })
    ).rejects.toBeInstanceOf(OkxError);
  });
});
