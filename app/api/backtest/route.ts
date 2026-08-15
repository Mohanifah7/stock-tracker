import { NextResponse } from 'next/server'
import { parseCsv, runBacktest } from '../../../lib/backtest'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const candles = parseCsv(String(body.csv ?? ''))
    const capital = Number(body.capital)
    const startingCapital = Number.isFinite(capital) && capital > 0 ? capital : 100000
    return NextResponse.json({
      rows: candles.length,
      result: runBacktest(candles, startingCapital),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Backtest failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
