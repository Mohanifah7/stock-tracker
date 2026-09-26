export type MoomooSymbol = 'US.NVDA' | 'US.GOOGL' | 'US.MSFT'

export type MoomooCandle = {
  symbol: MoomooSymbol
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  turnover?: number
}

export type MoomooStatus = {
  ok: boolean
  connected: boolean
  host: string
  port: number
  symbols: string[]
  message: string
  updatedAt: string
}

const DEFAULT_URL = process.env.MOOMOO_WORKER_URL || 'http://127.0.0.1:8787'

export async function getMoomooStatus(): Promise<MoomooStatus> {
  const response = await fetch(DEFAULT_URL + '/status', {
    cache: 'no-store',
    signal: AbortSignal.timeout(2500),
  })
  if (!response.ok) throw new Error('Moomoo worker returned HTTP ' + response.status)
  return response.json() as Promise<MoomooStatus>
}

export async function getMoomooCandles(symbol: MoomooSymbol, limit = 100): Promise<MoomooCandle[]> {
  const response = await fetch(
    DEFAULT_URL + '/candles?symbol=' + encodeURIComponent(symbol) + '&limit=' + Math.min(Math.max(limit, 1), 1000),
    {cache: 'no-store', signal: AbortSignal.timeout(2500)},
  )
  if (!response.ok) throw new Error('Moomoo worker returned HTTP ' + response.status)
  const data = await response.json() as {candles?: MoomooCandle[]}
  return data.candles ?? []
}
