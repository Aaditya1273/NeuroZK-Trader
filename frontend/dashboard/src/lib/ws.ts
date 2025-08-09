export type WSMessage = {
  type: 'prediction' | 'trade' | 'health' | string
  payload: any
}

export function createWS(url: string, onMessage: (msg: WSMessage) => void) {
  let ws: WebSocket | null = null
  let closed = false
  let retry = 1000

  const connect = () => {
    if (closed) return
    ws = new WebSocket(url)
    ws.onopen = () => {
      retry = 1000
    }
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        onMessage(data)
      } catch {}
    }
    ws.onclose = () => {
      if (closed) return
      setTimeout(connect, Math.min(10000, retry))
      retry *= 2
    }
    ws.onerror = () => {
      ws?.close()
    }
  }

  connect()

  return {
    close() {
      closed = true
      ws?.close()
    },
    send(obj: any) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj))
    },
  }
}
