import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    return NextResponse.json({ok:false,message:'Unsupported symbol.'},{status:400})
  }

  // Local development: use the Moomoo/OpenD worker first.
  try {
    const response = await fetch(
      `${WORKER_URL}/candles?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
      {cache:'no-store', signal:AbortSignal.timeout(2500)}
    )
    const data = await response.json()
    if (response.ok && Array.isArray(data?.candles) && data.candles.length) {
      return NextResponse.json({...data,source:'moomoo-worker'})
    }
  } catch {
    // On Vercel the local worker is normally unreachable; continue to Supabase.
  }

  // Deployed fallback: read candles persisted by the market-data ingestor.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    try {
      const supabase = createClient(url,key,{auth:{persistSession:false}})
      const {data,error} = await supabase
        .from('price_history')
        .select('timestamp,open,high,low,close,volume')
        .eq('symbol',symbol)
        .order('timestamp',{ascending:false})
        .limit(limit)

      if (!error && data?.length) {
        return NextResponse.json({
          ok:true,
          symbol,
          candles:data.reverse().map((x:any)=>({
            time:x.timestamp,
            open:Number(x.open),
            high:Number(x.high),
            low:Number(x.low),
            close:Number(x.close),
            volume:Number(x.volume||0)
          })),
          source:'supabase'
        })
      }
    } catch {
      // Fall through to a useful offline response.
    }
  }

  return NextResponse.json({
    ok:false,
    symbol,
    candles:[],
    message:'No market candles are available yet. Local development needs the Moomoo worker; deployed Vercel needs persisted candles in Supabase.'
  },{status:503})
}
