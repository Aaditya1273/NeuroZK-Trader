import { BrowserProvider, JsonRpcProvider, formatEther } from 'ethers'

export async function getProvider(): Promise<BrowserProvider | JsonRpcProvider> {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new BrowserProvider((window as any).ethereum)
  }
  const url = import.meta.env.VITE_PUBLIC_RPC || 'https://rpc.ankr.com/eth'
  return new JsonRpcProvider(url)
}

export async function getAddress(provider: BrowserProvider | JsonRpcProvider): Promise<string | null> {
  if (provider instanceof BrowserProvider) {
    const accounts = await provider.send('eth_requestAccounts', [])
    return accounts?.[0] || null
  }
  return null
}

export async function getNativeBalance(provider: any, address: string): Promise<string> {
  const bal = await provider.getBalance(address)
  return formatEther(bal)
}
