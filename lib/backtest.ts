export type Candle = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type ReplayPoint = {
  date: string
  close: number
  equity: number
  signal: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL'
  action: 'BUY' | 'SELL' | 'HOLD'
}

export type BacktestResult = {
  trades: number
  wins: number
  winRate: number
  totalReturn: number
  maxDrawdown: number
  finalCapital: number
  directionAccuracy: number
  latestSignal: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL'
  latestConfidence: number
  replay: ReplayPoint[]
  mode: 'FULL' | 'QUICK'
}

function sma(values: number[], period: number, i: number) {
  if (i < period - 1) return null
  let sum = 0
  for (let j = i - period + 1; j <= i; j++) sum += values[j]
  return sum / period
}

function ema(values: number[], period: number) {
  const out: number[] = []
  const k = 2 / (period + 1)
  values.forEach((value, i) => out.push(i === 0 ? value : value * k + out[i - 1] * (1 - k)))
  return out
}

export function runBacktest(candles: Candle[], startingCapital = 100000): BacktestResult {
  if (candles.length < 25) throw new Error('At least 25 candles are required.')

  const quickMode = candles.length < 60
  const fastPeriod = quickMode ? 8 : 12
  const slowPeriod = quickMode ? 21 : 26
  const shortSmaPeriod = quickMode ? 10 : 20
  const longSmaPeriod = quickMode ? 20 : 50
  const startIndex = longSmaPeriod

  const closes = candles.map(c => c.close)
  const fast = ema(closes, fastPeriod)
  const slow = ema(closes, slowPeriod)
  let capital = startingCapital
  let peak = capital
  let maxDrawdown = 0
  let position = 0
  let entry = 0
  let trades = 0
  let wins = 0
  let directionCorrect = 0
  let directionSamples = 0
  const replay: ReplayPoint[] = []

  for (let i = startIndex; i < candles.length; i++) {
    const sShort = sma(closes, shortSmaPeriod, i)
    const sLong = sma(closes, longSmaPeriod, i)
    const current = closes[i]
    let signal: ReplayPoint['signal'] = 'NEUTRAL'
    let action: ReplayPoint['action'] = 'HOLD'

    if (sShort !== null && sLong !== null) {
      const predictedUp = fast[i] > slow[i] && current > sShort && sShort > sLong
      const predictedDown = fast[i] < slow[i] && current < sShort && sShort < sLong
      signal = predictedUp ? 'UPTREND' : predictedDown ? 'DOWNTREND' : 'NEUTRAL'

      if (i < candles.length - 1) {
        const actualUp = closes[i + 1] > current
        if (predictedUp || predictedDown) {
          directionSamples++
          if ((predictedUp && actualUp) || (predictedDown && !actualUp)) directionCorrect++
        }
      }

      const support = Math.min(...closes.slice(Math.max(0, i - shortSmaPeriod), i + 1))
      const nearSupport = current <= support * 1.025

      if (!position && predictedUp && nearSupport) {
        position = (capital * 0.1) / current
        entry = current
        action = 'BUY'
      }

      if (position && (current >= entry * 1.05 || current <= entry * 0.97 || predictedDown)) {
        capital += position * (current - entry)
        trades++
        if (current > entry) wins++
        position = 0
        entry = 0
        action = 'SELL'
      }
    }

    const equity = capital + (position ? position * (current - entry) : 0)
    peak = Math.max(peak, equity)
    maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak)
    replay.push({ date: candles[i].date, close: current, equity, signal, action })
  }

  if (position) {
    const lastClose = closes[closes.length - 1]
    capital += position * (lastClose - entry)
    trades++
    if (lastClose > entry) wins++
    const last = replay[replay.length - 1]
    if (last) {
      last.action = 'SELL'
      last.equity = capital
    }
  }

  const i = candles.length - 1
  const sShort = sma(closes, shortSmaPeriod, i) ?? closes[i]
  const sLong = sma(closes, longSmaPeriod, i) ?? closes[i]
  const up = fast[i] > slow[i] && closes[i] > sShort && sShort > sLong
  const down = fast[i] < slow[i] && closes[i] < sShort && sShort < sLong
  const spread = Math.abs(fast[i] - slow[i]) / Math.max(closes[i], 0.000001)

  return {
    trades,
    wins,
    winRate: trades ? wins / trades : 0,
    totalReturn: capital / startingCapital - 1,
    maxDrawdown,
    finalCapital: capital,
    directionAccuracy: directionSamples ? directionCorrect / directionSamples : 0,
    latestSignal: up ? 'UPTREND' : down ? 'DOWNTREND' : 'NEUTRAL',
    latestConfidence: Math.round(Math.min(99, 50 + spread * 1000)),
    replay,
    mode: quickMode ? 'QUICK' : 'FULL',
  }
}

export function parseCsv(text: string): Candle[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV has no data rows.')

  const headers = lines[0].split(',').map(x => x.trim().toLowerCase())
  const index = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1
  const d = index(['date', 'datetime', 'time'])
  const o = index(['open'])
  const h = index(['high'])
  const l = index(['low'])
  const c = index(['close'])
  const v = index(['volume', 'vol'])

  if ([d, o, h, l, c].some(x => x < 0)) {
    throw new Error('CSV must contain Date, Open, High, Low and Close columns.')
  }

  return lines.slice(1).map(line => {
    const p = line.split(',')
    return {
      date: p[d],
      open: Number(p[o]),
      high: Number(p[h]),
      low: Number(p[l]),
      close: Number(p[c]),
      volume: v >= 0 ? Number(p[v]) || 0 : 0,
    }
  }).filter(x => Number.isFinite(x.close) && Number.isFinite(x.open) && Number.isFinite(x.high) && Number.isFinite(x.low)).sort((a, b) => a.date.localeCompare(b.date))
}
