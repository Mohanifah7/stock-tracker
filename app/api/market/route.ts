import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const WORKER_URL = process.env.MOOMOO_WORKER_URL || 'http://127.0.0.1:8787'
const ALLOWED_SYMBOLS = new Set(['US.NVDA', 'US.GOOGL', 'US.MSFT'])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'US.NVDA'
  const rawLimit = Number(searchParams.get('limit') || '100')
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), 500)
    : 100

  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json(
      { ok: false, message: 'Unsupported symbol.' },
      { status: 400 },
    )
  }

  try {
    const response = await fetch(
      `${WORKER_URL}/candles?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
      { cache: 'no-store' },
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: data?.message || 'Moomoo worker request failed.' },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: 'Moomoo worker is unavailable. Start scripts/moomoo_market_worker.py first.',
      },
      { status: 503 },
    )
  }
}
