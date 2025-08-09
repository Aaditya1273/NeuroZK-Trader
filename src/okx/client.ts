import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';

export type OkxEnv = {
  baseURL: string; // e.g., https://www.okx.com
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  demo?: boolean; // demo trading flag if needed
  // Optional custom signer for non-standard endpoints (e.g., DEX variants)
  customSigner?: (args: { ts: string; method: string; path: string; bodyStr: string }) => Record<string, string>;
};

export type OkxRequestOptions = {
  path: string; // e.g., /api/v5/trade/order
  method?: 'GET' | 'POST' | 'DELETE';
  params?: Record<string, any>;
  data?: Record<string, any> | string;
  timeoutMs?: number;
  signed?: boolean; // whether to attach OKX auth headers
};

export class OkxError extends Error {
  public code?: string | number;
  public httpStatus?: number;
  public details?: any;
  constructor(message: string, code?: string | number, httpStatus?: number, details?: any) {
    super(message);
    this.name = 'OkxError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export class OkxClient {
  private axios: AxiosInstance;
  private env: OkxEnv;

  constructor(env: OkxEnv) {
    this.env = env;
    this.axios = axios.create({ baseURL: env.baseURL, timeout: 15000 });
  }

  private timestamp(): string {
    // OKX expects ISO8601 format with milliseconds, UTC
    return new Date().toISOString();
  }

  private sign(ts: string, method: string, path: string, body: string = ''): string {
    const prehash = `${ts}${method}${path}${body}`;
    return crypto.createHmac('sha256', this.env.apiSecret || '').update(prehash).digest('base64');
  }

  private authHeaders(ts: string, method: string, path: string, body?: any): Record<string, string> {
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    if (this.env.customSigner) {
      return this.env.customSigner({ ts, method, path, bodyStr });
    }
    if (!this.env.apiKey || !this.env.apiSecret || !this.env.passphrase) {
      throw new OkxError('Missing API credentials for signed request');
    }
    const sign = this.sign(ts, method, path, bodyStr);
    return {
      'OK-ACCESS-KEY': this.env.apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': ts,
      'OK-ACCESS-PASSPHRASE': this.env.passphrase,
      'OK-ACCESS-PROJECT': this.env.demo ? 'demo' : undefined,
    } as Record<string, string>;
  }

  async request<T = any>({ path, method = 'GET', params, data, timeoutMs, signed = false }: OkxRequestOptions): Promise<T> {
    const urlPath = path; // path must start with '/'
    const ts = this.timestamp();
    const headers: Record<string, string> = {};
    if (signed) Object.assign(headers, this.authHeaders(ts, method, urlPath, data));

    const cfg: AxiosRequestConfig = {
      url: urlPath,
      method,
      params,
      data,
      timeout: timeoutMs ?? 15000,
      headers,
    };

    try {
      const res = await this.axios.request(cfg);
      // OKX wraps payload under { code, msg, data }
      if (res.data && typeof res.data === 'object' && 'code' in res.data) {
        if (res.data.code !== '0') {
          throw new OkxError(`OKX error: ${res.data.msg || res.data.code}`, res.data.code, res.status, res.data);
        }
        return res.data.data as T;
      }
      return res.data as T;
    } catch (err: any) {
      if (err.isAxiosError) {
        const status = err.response?.status;
        const payload = err.response?.data;
        throw new OkxError(`HTTP ${status}: ${payload?.msg || err.message}`.trim(), payload?.code, status, payload);
      }
      throw err;
    }
  }
}
