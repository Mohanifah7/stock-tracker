import {getMoomooCandles, getMoomooStatus} from '../../../lib/moomoo-adapter'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'status'

  try {
    if (action === 'candles') {
      const symbol = (url.searchParams.get('symbol') || 'US.NVDA') as Parameters<typeof getMoomooCandles>[0]
      const limit = Number(url.searchParams.get('limit') || 100)
      return Response.json({ok: true, candles: await getMoomooCandles(symbol, limit)})
    }

    return Response.json(await getMoomooStatus())
  } catch (error) {
    return Response.json({
      ok: false,
      connected: false,
      message: error instanceof Error ? error.message : 'Moomoo worker is unavailable.',
      updatedAt: new Date().toISOString(),
    }, {status: 503})
  }
}
