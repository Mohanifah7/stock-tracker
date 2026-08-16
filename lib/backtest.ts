export type Candle = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type ReplayPoint = Candle & {
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
  if (candles.length < 25) throw new Error('At least 25 candles are required. For a meaningful backtest, 60+ candles are recommended.')

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
  const replay: ReplayPoint[] = candles.map(c => ({ ...c, equity: startingCapital, signal: 'NEUTRAL', action: 'HOLD' }))

  for (let i = startIndex; i < candles.length; i++) {
    const sShort = sma(closes, shortSmaPeriod, i)
    const sLong = sma(closes, longSmaPeriod, i)
    const candle = candles[i]
    const current = candle.close
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
    replay[i] = { ...candle, equity, signal, action }
  }

  if (position) {
    const lastClose = closes[closes.length - 1]
    capital += position * (lastClose - entry)
    trades++
    if (lastClose > entry) wins++
    const last = replay[replay.length - 1]
    last.action = 'SELL'
    last.equity = capital
  }

  let runningEquity = startingCapital
  replay.forEach((p, i) => { if (i < startIndex) p.equity = runningEquity })
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

// Small CSV parser that correctly handles quoted fields, commas inside values,
// UTF-8 BOMs, CRLF line endings, and common Moomoo/Luno column-name variants.
function parseCsvRow(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (ch === ',' && !quoted) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell.trim())
  return cells
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[()\[\]{}]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function parseCsv(text: string): Candle[] {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r/g, '')
  const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV has no data rows.')

  const headers = parseCsvRow(lines[0]).map(normalizeHeader)
  const index = (names: string[]) => {
    const normalized = names.map(normalizeHeader)
    return normalized.map(name => headers.indexOf(name)).find(i => i >= 0) ?? -1
  }

  const d = index(['date', 'datetime', 'time', 'timestamp', 'date/time'])
  const o = index(['open', 'openprice', 'open_price'])
  const h = index(['high', 'highprice', 'high_price'])
  const l = index(['low', 'lowprice', 'low_price'])
  const c = index(['close', 'closeprice', 'close_price', 'last'])
  const v = index(['volume', 'vol', 'volumeqty', 'volumequantity'])

  if ([d, o, h, l, c].some(x => x < 0)) {
    throw new Error(`CSV columns not recognised. Found: ${headers.join(', ')}. Required: Date, Open, High, Low, Close.`)
  }

  const rows: Candle[] = []
  for (const line of lines.slice(1)) {
    const p = parseCsvRow(line)
    const open = Number(String(p[o] ?? '').replace(/,/g, ''))
    const high = Number(String(p[h] ?? '').replace(/,/g, ''))
    const low = Number(String(p[l] ?? '').replace(/,/g, ''))
    const close = Number(String(p[c] ?? '').replace(/,/g, ''))
    const volume = v >= 0 ? Number(String(p[v] ?? '').replace(/,/g, '')) || 0 : 0
    const date = String(p[d] ?? '').trim()

    if (date && [open, high, low, close].every(Number.isFinite)) {
      rows.push({ date, open, high, low, close, volume })
    }
  }

  if (rows.length < 2) throw new Error('CSV was found, but no valid OHLC rows could be read. Check the delimiter and column values.')
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}
