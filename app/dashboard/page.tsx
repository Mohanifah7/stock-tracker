'use client'\nimport './dashboard.css'
import {useEffect,useMemo,useState} from 'react'
import {Activity,AlertTriangle,ArrowDownRight,ArrowUpRight,BarChart3,ShieldCheck,RefreshCw,TrendingUp,Wallet,Radio} from 'lucide-react'
import type {DashboardData} from '@/lib/dashboard-data'

const money=(n:number)=>`RM ${n.toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const pct=(n:number)=>`${n>=0?'+':''}${n.toFixed(2)}%`

function Badge({children,tone='neutral'}:{children:React.ReactNode;tone?:'buy'|'sell'|'warn'|'neutral'}){return <span className={`badge ${tone}`}>{children}</span>}
function Card({title,sub,children,action}:{title:string;sub?:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="dash-card"><div className="dash-card-head"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{action}</div>{children}</section>}

export default function Dashboard(){
 const [data,setData]=useState<DashboardData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{setLoading(true);try{const r=await fetch('/api/dashboard',{cache:'no-store'});const d=await r.json();setData(d);setError(d.error||'')}catch(e){setError('Could not load dashboard.')}finally{setLoading(false)}}
 useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[])
 const maxPnl=useMemo(()=>Math.max(1,...(data?.pnl||[]).map(x=>Math.abs(x.value))),[data])
 if(!data)return <main className="dashboard"><div className="dash-loading"><RefreshCw className="spin"/><b>{loading?'Loading trading command center…':'No dashboard data'}</b></div></main>
 const risk=data.account.drawdown*100
 return <main className="dashboard">
   <header className="dash-top"><div><div className="dash-kicker">STOCK TRACKER AI</div><h1>Trading Command Center</h1><p>Research-first paper trading • 3-strategy consensus • risk-first execution</p></div><div className="dash-actions"><Badge tone="buy"><span className="dot"/> PAPER MODE</Badge><button className="refresh" onClick={load}><RefreshCw size={15}/>{loading?'Refreshing':'Refresh'}</button></div></header>
   {error&&<div className="dash-notice"><AlertTriangle size={16}/>{error}</div>}
   <div className="hero-grid">
    <Card title="Account overview" sub="Paper account / simulated capital"><div className="hero-number">{money(data.account.equity)}</div><div className="metric-row"><div><span>Cash</span><b>{money(data.account.cash)}</b></div><div><span>Unrealized P/L</span><b className={data.account.unrealizedPnl>=0?'positive':'negative'}>{money(data.account.unrealizedPnl)}</b></div><div><span>Open positions</span><b>{data.account.openPositions}</b></div></div></Card>
    <Card title="Risk monitor" sub="Hard limits before any paper order"><div className="risk-ring"><div><b>{risk.toFixed(1)}%</b><span>drawdown</span></div></div><div className="risk-lines"><div><span>Max drawdown</span><b>5.0%</b></div><div><span>Per-trade loss cap</span><b>1.0%</b></div><div><span>Circuit breaker</span><Badge tone={risk>=5?'sell':'buy'}>{risk>=5?'TRIGGERED':'OPEN'}</Badge></div></div></Card>
   </div>
   <Card title="Signal consensus" sub={`${data.consensus.symbol} • agreement required: 2 of 3`} action={<div className="consensus"><span>Confidence</span><b>{data.consensus.confidence.toFixed(0)}%</b></div>}>
    <div className="consensus-main"><div className={`consensus-action ${data.consensus.action.toLowerCase()}`}>{data.consensus.action}</div><div className="agreement"><div className="agreement-bar"><span style={{width:`${(data.consensus.agreement/3)*100}%`}}/></div><span>{data.consensus.agreement}/3 strategies agree</span></div></div>
    <div className="strategy-grid">{data.strategies.map(s=><div className="strategy" key={s.name}><div className="strategy-title"><span>{s.name}</span><Badge tone={s.signal==='BUY'?'buy':s.signal==='SELL'?'sell':'neutral'}>{s.signal}</Badge></div><b>{s.confidence.toFixed(0)}%</b><p>{s.reason}</p></div>)}</div>
   </Card>
   <div className="two-col">
    <Card title="Open positions" sub="Live-ready data model; execution remains paper-only"><div className="dash-table">{data.positions.length?<table><thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Current</th><th>P/L</th></tr></thead><tbody>{data.positions.map(p=><tr key={p.symbol}><td><b>{p.symbol}</b></td><td><Badge tone={p.side==='LONG'?'buy':'sell'}>{p.side}</Badge></td><td>{p.quantity}</td><td>{p.entryPrice.toFixed(2)}</td><td>{p.currentPrice.toFixed(2)}</td><td className={p.pnl>=0?'positive':'negative'}>{money(p.pnl)}<small>{pct(p.pnlPct)}</small></td></tr>)}</tbody></table>:<div className="empty">No open positions yet.</div>}</div></Card>
    <Card title="Market status" sub="Configured market monitor"><div className="market-panel"><div><span>{data.market.symbol}</span><b>{money(data.market.price)}</b><small className={data.market.changePct>=0?'positive':'negative'}>{pct(data.market.changePct)}</small></div><div className="market-state"><Radio size={15}/>{data.market.status}</div></div><div className="market-foot"><span>Auto refresh</span><b>30 sec</b></div></Card>
   </div>
   <div className="two-col">
    <Card title="30-day P/L" sub="Realized + unrealized daily result"><div className="bars">{data.pnl.length?data.pnl.map((p,i)=><div className="bar-col" key={p.date} title={`${p.date}: ${money(p.value)}`}><div className={`bar ${p.value>=0?'up':'down'}`} style={{height:`${Math.max(5,Math.abs(p.value)/maxPnl*100)}%`}}/><span>{i%5===0?p.date.slice(5):''}</span></div>):<div className="empty">No daily P/L records yet.</div>}</div></Card>
    <Card title="Risk alerts" sub="Most recent events"><div className="alerts">{data.alerts.length?data.alerts.map((a,i)=><div className="alert" key={i}><span className={a.level.toLowerCase()}>{a.level==='CRITICAL'?'!':a.level==='WARNING'?'⚠':'✓'}</span><div><b>{a.message}</b><small>{new Date(a.createdAt).toLocaleString()}</small></div></div>):<div className="empty">No alerts.</div>}</div></Card>
   </div>
   <Card title="Recent orders" sub="Market • limit • stop • stop-limit"><div className="dash-table">{data.orders.length?<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Price</th><th>Status</th></tr></thead><tbody>{data.orders.map(o=><tr key={o.id}><td>{new Date(o.createdAt).toLocaleString()}</td><td><b>{o.symbol}</b></td><td><Badge tone={o.side==='BUY'?'buy':'sell'}>{o.side}</Badge></td><td>{o.type}</td><td>{o.quantity}</td><td>{o.price==null?'—':o.price.toFixed(2)}</td><td>{o.status}</td></tr>)}</tbody></table>:<div className="empty">No orders yet. The dashboard is ready for paper-order data.</div>}</div></Card>
   <footer className="dash-footer"><ShieldCheck size={15}/> Research-first mode • live order execution is intentionally locked until strategy validation and explicit risk controls are in place.</footer>
 </main>
}
