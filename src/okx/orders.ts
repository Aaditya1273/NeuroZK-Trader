import { OkxClient, OkxError } from './client';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';

export interface PlaceOrderParams {
  instId: string; // e.g., "BTC-USDT"
  side: OrderSide; // buy/sell
  sz: string; // size in quote/contract units as per OKX
  tdMode?: 'cash' | 'cross' | 'isolated'; // default cash (spot)
  px?: string; // required for limit
  clOrdId?: string; // optional client order id
}

export interface OkxOrderResponse {
  ordId: string;
  clOrdId?: string;
  sCode?: string;
  sMsg?: string;
}

export class OkxOrders {
  constructor(private client: OkxClient) {}

  async placeMarketOrder(params: PlaceOrderParams): Promise<OkxOrderResponse> {
    const body = this.buildOrderBody({ ...params, ordType: 'market' });
    const data = await this.client.request<OkxOrderResponse[]>({
      path: '/api/v5/trade/order',
      method: 'POST',
      data: body,
      signed: true,
    });
    return this.unwrapSingle(data);
  }

  async placeLimitOrder(params: PlaceOrderParams): Promise<OkxOrderResponse> {
    if (!params.px) throw new OkxError('px (price) is required for limit order');
    const body = this.buildOrderBody({ ...params, ordType: 'limit' });
    const data = await this.client.request<OkxOrderResponse[]>({
      path: '/api/v5/trade/order',
      method: 'POST',
      data: body,
      signed: true,
    });
    return this.unwrapSingle(data);
  }

  // Helper to build OKX order payload (CEX v5). For DEX variants, expose a different path/body as needed.
  private buildOrderBody(params: PlaceOrderParams & { ordType: OrderType }): Record<string, any> {
    const tdMode = params.tdMode || 'cash';
    const base: Record<string, any> = {
      instId: params.instId,
      tdMode,
      side: params.side,
      ordType: params.ordType,
      sz: params.sz,
    };
    if (params.px && params.ordType === 'limit') base.px = params.px;
    if (params.clOrdId) base.clOrdId = params.clOrdId;
    return base;
  }

  private unwrapSingle(arr: OkxOrderResponse[]): OkxOrderResponse {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new OkxError('Empty OKX order response');
    }
    const item = arr[0];
    if (item.sCode && item.sCode !== '0') {
      throw new OkxError(item.sMsg || 'Order rejected', item.sCode);
    }
    return item;
  }
}
