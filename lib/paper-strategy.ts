import type { Candle } from './backtest'

export type PaperConfig = {
  lookback: number
  entryLevels: number
  allocationPerEntry: number
  stopLossPct: number
  maxEntries: number
}

export type PaperLevel = {
  index: number
  price: number
  kind: 'ENTRY' | 'RESISTANCE'
  status: 'WAITING' | 'TRIGGERED'
}

export type PaperTrade = {
  id: number
  date: string
  side: 'BUY' | 'SELL'
  level: number
  price: number
  qty: number
  pnl: number
  reason: 'RESISTANCE' | 'STOP'
}

export type PaperResult = {
  startingCapital: number
  endingCapital: number
  returnPct: number
  trades: number
  wins: number
  winRate: number
  openEntries: number
  realizedPnl: number
  levels: PaperLevel[]
  tradesLog: PaperTrade[]
  lastDate: string
}

/**
 * Paper-only range strategy.
 * Levels are derived only from candles BEFORE the current candle, avoiding look-ahead.
 * With daily OHLC data, intrabar order is inherently ambiguous, so only one new entry
 * is allowed per candle and a newly opened entry cannot exit on that same candle.
 */
export function runPaperRangeStrategy(
  candles: Candle[],
  startingCapital = 100000,
  config: Partial<PaperConfig> = {},
): PaperResult {
  const cfg: PaperConfig = {
    lookback: 20,
    entryLevels: 3,
    allocationPerEntry: 0.03,
    stopLossPct: 0.03,
    maxEntries: 3,
    ...config,
  }

  if (candles.length < cfg.lookback + 5) {
    throw new Error(`Paper simulation needs at least ${cfg.lookback + 5} candles.`)
  }

  let cash = startingCapital
  const open: Array<{ level: number; price: number; qty: number; target: number }> = []
  const tradesLog: PaperTrade[] = []
  let wins = 0
  let realizedPnl = 0
  let id = 0
  let lastLevels: PaperLevel[] = []

  for (let i = cfg.lookback; i < candles.length; i++) {
    const candle = candles[i]
    const prior = candles.slice(i - cfg.lookback, i)
    const support = Math.min(...prior.map(x => x.low))
    const resistance = Math.max(...prior.map(x => x.high))
    const range = Math.max(resistance - support, 0.000001)

    const entries = Array.from({ length: cfg.entryLevels }, (_, n) => {
      const fraction = 0.15 + (0.55 * n) / Math.max(cfg.entryLevels - 1, 1)
      return support + range * fraction
    }).sort((a, b) => b - a)

    lastLevels = [
      ...entries.map((price, n) => ({ index: n + 1, price, kind: 'ENTRY' as const, status: 'WAITING' as const })),
      { index: 0, price: resistance, kind: 'RESISTANCE' as const, status: 'WAITING' as const },
    ]

    // Existing positions get first priority. Resistance exits are the requested take-profit.
    for (let j = open.length - 1; j >= 0; j--) {
      const position = open[j]
      const stop = position.price * (1 - cfg.stopLossPct)
      const hitStop = candle.low <= stop
      const hitResistance = candle.high >= position.target
      if (!hitStop && !hitResistance) continue

      const exitPrice = hitStop ? stop : position.target
      const pnl = (exitPrice - position.price) * position.qty
      cash += exitPrice * position.qty
      realizedPnl += pnl
      if (pnl > 0) wins++
      tradesLog.push({
        id: ++id,
        date: candle.date,
        side: 'SELL',
        level: position.target,
        price: exitPrice,
        qty: position.qty,
        pnl,
        reason: hitStop ? 'STOP' : 'RESISTANCE',
      })
      open.splice(j, 1)
    }

    // One fresh entry per candle avoids pretending we know the intrabar path of an OHLC candle.
    if (open.length < cfg.maxEntries) {
      const alreadyUsed = new Set(open.map(x => x.level))
      const reached = entries.find(level => candle.low <= level && candle.close <= level && !alreadyUsed.has(level))
      if (reached !== undefined) {
        const allocation = Math.min(cash, startingCapital * cfg.allocationPerEntry)
        if (allocation > 0) {
          const qty = allocation / reached
          cash -= allocation
          open.push({ level: reached, price: reached, qty, target: resistance })
          tradesLog.push({
            id: ++id,
            date: candle.date,
            side: 'BUY',
            level: reached,
            price: reached,
            qty,
            pnl: 0,
            reason: 'RESISTANCE',
          })
        }
      }
    }
  }

  const lastClose = candles[candles.length - 1].close
  const marked = open.reduce((sum, p) => sum + p.qty * lastClose, 0)
  const endingCapital = cash + marked
  const sellTrades = tradesLog.filter(t => t.side === 'SELL')
  const completedTrades = sellTrades.length

  return {
    startingCapital,
    endingCapital,
    returnPct: (endingCapital / startingCapital - 1) * 100,
    trades: completedTrades,
    wins,
    winRate: completedTrades ? (wins / completedTrades) * 100 : 0,
    openEntries: open.length,
    realizedPnl,
    levels: lastLevels,
    tradesLog: tradesLog.slice(-100),
    lastDate: candles[candles.length - 1].date,
  }
}
