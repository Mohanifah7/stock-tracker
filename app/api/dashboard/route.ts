import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { demoDashboard, type DashboardData } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({...demoDashboard, source:'demo'})

  try {
    const supabase = createClient(url, key, {auth:{persistSession:false}})
    const [account, positions, orders, pnl, alerts, signals] = await Promise.all([
      supabase.from('account_state').select('*').eq('id','default').maybeSingle(),
      supabase.from('positions').select('*').order('updated_at',{ascending:false}).limit(20),
      supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(20),
      supabase.from('daily_pnl').select('*').order('trade_date',{ascending:true}).limit(30),
      supabase.from('risk_logs').select('*').order('created_at',{ascending:false}).limit(10),
      supabase.from('strategy_signals').select('*').order('created_at',{ascending:false}).limit(1)
    ])
    if (account.error || positions.error || orders.error || pnl.error || alerts.error || signals.error) {
      return NextResponse.json({...demoDashboard,source:'demo',error:'Supabase data is not available yet.'})
    }
    const a=account.data || {equity:100000,cash:100000,peak_equity:100000}
    const s=signals.data?.[0]
    const strategy = s ? [
      {name:'Mean Reversion',signal:s.mean_reversion,confidence:Number(s.confidence),reason:'Latest strategy engine result.'},
      {name:'Momentum Breakout',signal:s.momentum,confidence:Number(s.confidence),reason:'Latest strategy engine result.'},
      {name:'Trend Following',signal:s.trend,confidence:Number(s.confidence),reason:'Latest strategy engine result.'}
    ] : demoDashboard.strategies
    const consensus = s ? {symbol:s.symbol,action:s.consensus,agreement:[s.mean_reversion,s.momentum,s.trend].filter((x:string)=>x===s.consensus).length,confidence:Number(s.confidence)} : demoDashboard.consensus
    const result:DashboardData = {
      account:{equity:Number(a.equity),cash:Number(a.cash),unrealizedPnl:(positions.data||[]).reduce((n:any,p:any)=>n+Number(p.unrealized_pnl||0),0),openPositions:(positions.data||[]).length,drawdown:Number(a.peak_equity)>0?(Number(a.peak_equity)-Number(a.equity))/Number(a.peak_equity):0,peakEquity:Number(a.peak_equity)},
      consensus,strategies,
      positions:(positions.data||[]).map((p:any)=>({symbol:p.symbol,side:p.side,quantity:Number(p.quantity),entryPrice:Number(p.entry_price),currentPrice:Number(p.current_price),pnl:Number(p.unrealized_pnl),pnlPct:Number(p.entry_price)?(Number(p.unrealized_pnl)/(Number(p.entry_price)*Number(p.quantity)))*100:0})),
      orders:(orders.data||[]).map((o:any)=>({id:o.id,symbol:o.symbol,side:o.side,type:o.order_type,quantity:Number(o.quantity),price:o.price==null?null:Number(o.price),status:o.status,createdAt:o.created_at})),
      pnl:(pnl.data||[]).map((p:any)=>({date:p.trade_date,value:Number(p.realized_pnl||0)+Number(p.unrealized_pnl||0),cumulative:0})),
      alerts:(alerts.data||[]).map((x:any)=>({level:x.level,message:x.message,createdAt:x.created_at})),
      market:demoDashboard.market
    }
    let running=0; result.pnl=result.pnl.map(p=>{running+=p.value;return {...p,cumulative:running}})
    return NextResponse.json({...result,source:'supabase'})
  } catch {
    return NextResponse.json({...demoDashboard,source:'demo',error:'Dashboard service unavailable.'})
  }
}
