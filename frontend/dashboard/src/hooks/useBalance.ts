import { useEffect, useState } from 'react'
import { formatEther } from 'ethers'

export function useBalance(provider: any, address: string | null) {
  const [balance, setBalance] = useState<string>('0')

  useEffect(() => {
    let active = true
    async function fetchBal() {
      if (!provider || !address) return
      try {
        const b = await provider.getBalance(address)
        if (!active) return
        setBalance(formatEther(b))
      } catch (e) {
        // ignore
      }
    }
    fetchBal()
    const id = setInterval(fetchBal, 15000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [provider, address])

  return balance
}
