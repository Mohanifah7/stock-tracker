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

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./()]+/g, '')
}

function splitCsvLine(line: string, delimiter = ',') {
  const result: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i++ } else quoted = !quoted
    } else if (ch === delimiter && !quoted) {
      result.push(current.trim())
      current = ''
    } else current += ch
  }
  result.push(current.trim())
  return result
}

function detectDelimiter(line: string) {
  const candidates = [',', '\t', ';']
  return candidates
    .map(delimiter => ({ delimiter, count: splitCsvLine(line, delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0].delimiter
}

function findHeaderLine(lines: string[]) {
  const requiredGroups = [
    ['date', 'datetime', 'time', 'timestamp', 'tradingdate', 'tradetime', 'updatetime'],
    ['open', 'openprice'],
    ['high', 'highprice'],
    ['low', 'lowprice'],
    ['close', 'closelast', 'closelastprice', 'last', 'lastprice', 'price'],
  ]

  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const delimiter = detectDelimiter(lines[i])
    const headers = splitCsvLine(lines[i], delimiter).map(normalizeHeader)
    const hasOhlc = requiredGroups.slice(1).every(group => group.some(name => headers.includes(normalizeHeader(name))))
    if (hasOhlc || (headers.includes('symbol') && headers.includes('price'))) {
      return { index: i, delimiter, headers }
    }
  }

  return null
}

export function parseCsv(text: string): Candle[] {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r/g, '')
  const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV has no data rows.')

  const headerInfo = findHeaderLine(lines)
  if (!headerInfo) {
    throw new Error('CSV header could not be detected. Export Moomoo historical/candlestick data with Date, Open, High, Low and Close/Last columns.')
  }

  const { index: headerIndex, delimiter, headers } = headerInfo
  const find = (names: string[]) => {
    const normalized = names.map(normalizeHeader)
    return normalized.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1
  }

  const d = find(['date', 'datetime', 'time', 'timestamp', 'tradingdate', 'tradetime', 'updatetime'])
  const o = find(['open', 'openprice'])
  const h = find(['high', 'highprice'])
  const l = find(['low', 'lowprice'])
  // Moomoo exports can use Close/Last, CloseLast, Last or Price.
  const c = find(['close', 'closelast', 'closelastprice', 'last', 'lastprice', 'price'])
  const v = find(['volume', 'vol'])

  const looksLikeMoomooSnapshot = headers.includes('symbol') && headers.includes('price') && headers.includes('prevclose')

  if (d < 0) {
    if (looksLikeMoomooSnapshot) {
      throw new Error('This is a Moomoo stock snapshot, not historical price data. It has Price/Open/High/Low but no Date column, so it cannot be backtested. In Moomoo, export historical/candlestick data for the selected symbol with a Date/Time column.')
    }
    throw new Error(`CSV is missing a Date/Time column. Found: ${headers.join(', ')}. Required for backtesting: Date, Open, High, Low, Close/Last.`)
  }

  if ([o, h, l, c].some(x => x < 0)) {
    throw new Error(`CSV columns not recognised. Found: ${headers.join(', ')}. Required: Date, Open, High, Low and Close (Close/Last or CloseLast is accepted).`)
  }

  const parseNumber = (value: string) => {
    const cleanedValue = String(value ?? '').replace(/,/g, '').replace(/^\$/,'').replace(/%$/,'').trim()
    return Number(cleanedValue)
  }

  const candles = lines.slice(headerIndex + 1).map(line => {
    const p = splitCsvLine(line, delimiter)
    return {
      date: p[d]?.trim() ?? '',
      open: parseNumber(p[o]),
      high: parseNumber(p[h]),
      low: parseNumber(p[l]),
      close: parseNumber(p[c]),
      volume: v >= 0 ? parseNumber(p[v]) || 0 : 0,
    }
  }).filter(x =>
    x.date &&
    Number.isFinite(x.close) &&
    Number.isFinite(x.open) &&
    Number.isFinite(x.high) &&
    Number.isFinite(x.low)
  )

  if (!candles.length) throw new Error('No valid OHLC rows were found in this CSV.')
  if (candles.length < 25) throw new Error(`Only ${candles.length} valid candle(s) were found. At least 25 are required; 60+ is recommended for a meaningful backtest.`)

  return candles.sort((a, b) => a.date.localeCompare(b.date))
}
