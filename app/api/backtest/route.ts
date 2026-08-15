import { NextResponse } from 'next/server'
import { parseCsv, runBacktest } from '@/lib/backtest'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const candles = parseCsv(String(body.csv ?? ''))
    return NextResponse.json({ rows: candles.length, result: runBacktest(candles, Number(body.capital) || 100000) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Backtest failed' }, { status: 400 })
  }
}
