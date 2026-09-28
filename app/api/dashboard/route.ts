import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { demoDashboard, type DashboardData } from '../../../lib/dashboard-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return NextResponse.json({...demoDashboard, source:'demo'})

  try {
    const supabase = createClient(url, key, {auth:{persistSession:false}})

    const [account, positions, orders, pnl, alerts, signals] = await Promise.all([
      supabase.from('account_state').select('*').eq('account_id','default').maybeSingle(),
      supabase.from('positions').select('*').eq('account_id','default').order('updated_at',{ascending:false}).limit(20),
      supabase.from('orders').select('*').eq('account_id','default').order('created_at',{ascending:false}).limit(20),
      supabase.from('daily_pnl').select('*').eq('account_id','default').order('trade_date',{ascending:true}).limit(30),
      supabase.from('risk_logs').select('*').eq('account_id','default').order('timestamp',{ascending:false}).limit(10),
      supabase.from('strategy_signals').select('*').eq('symbol','US.NVDA').order('created_at',{ascending:false}).limit(20)
    ])

    if (account.error || positions.error || orders.error || pnl.error || alerts.error || signals.error) {
      return NextResponse.json({...demoDashboard,source:'demo',error:'Supabase data is not available yet.'})
    }

    const a = account.data || {total_equity:100000,cash:100000}
    const rows = signals.data || []
    const byStrategy = new Map<string, any>()
    for (const row of rows) {
      if (!byStrategy.has(row.strategy)) byStrategy.set(row.strategy,row)
    }

    const strategyRows = [
      ['Mean Reversion', byStrategy.get('Mean Reversion')],
      ['Momentum Breakout', byStrategy.get('Momentum Breakout')],
      ['Trend Following', byStrategy.get('Trend Following')]
    ]

    const strategies = strategyRows.map(([name,row]) => ({
      name,
      signal: row?.signal_type || 'HOLD',
      confidence: Number(row?.strength || 0),
      reason: row?.signal_data?.reason || 'Waiting for strategy engine data.'
    }))

    const signalValues = strategies.map(s => s.signal)
    const counts = ['BUY','SELL','HOLD'].map(action => ({
      action,
      count: signalValues.filter(x => x === action).length
    })).sort((x,y) => y.count-x.count)
    const consensusAction = counts[0]?.action || 'HOLD'
    const latestConfidence = Math.max(...strategies.map(s => s.confidence),0)

    const result: DashboardData = {
      account:{
        equity:Number(a.total_equity ?? 100000),
        cash:Number(a.cash ?? a.available_balance ?? 100000),
        unrealizedPnl:(positions.data||[]).reduce((n:any,p:any)=>n+Number(p.unrealized_pnl||0),0),
        openPositions:(positions.data||[]).filter((p:any)=>Number(p.quantity||0)!==0).length,
        drawdown:0,
        peakEquity:Number(a.total_equity ?? 100000),
      },
      consensus:{
        symbol:'US.NVDA',
        action:consensusAction as 'BUY'|'SELL'|'HOLD',
        agreement:counts[0]?.count || 0,
        confidence:latestConfidence
      },
      strategies:strategies as DashboardData['strategies'],
      positions:(positions.data||[]).map((p:any)=>({
        symbol:p.symbol,
        side:p.side,
        quantity:Number(p.quantity),
        entryPrice:Number(p.avg_entry_price),
        currentPrice:Number(p.current_price),
        pnl:Number(p.unrealized_pnl||0),
        pnlPct:Number(p.unrealized_pnl_pct||0)
      })),
      orders:(orders.data||[]).map((o:any)=>({
        id:String(o.order_id || o.id),
        symbol:o.symbol,
        side:o.side,
        type:o.order_type,
        quantity:Number(o.quantity),
        price:o.price==null?null:Number(o.price),
        status:o.status,
        createdAt:o.created_at
      })),
      pnl:(pnl.data||[]).map((p:any)=>({
        date:p.trade_date,
        value:Number(p.total_pnl ?? Number(p.realized_pnl||0)+Number(p.unrealized_pnl||0)),
        cumulative:0
      })),
      alerts:(alerts.data||[]).map((x:any)=>({
        level:x.severity || 'INFO',
        message:x.message,
        createdAt:x.timestamp
      })),
      market:demoDashboard.market
    }

    let running=0
    result.pnl=result.pnl.map(p=>{running+=p.value;return {...p,cumulative:running}})

    return NextResponse.json({...result,source:'supabase'})
  } catch {
    return NextResponse.json({...demoDashboard,source:'demo',error:'Dashboard service unavailable.'})
  }
}
