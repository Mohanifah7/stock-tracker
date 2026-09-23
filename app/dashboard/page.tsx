'use client'
import {useEffect,useMemo,useState} from 'react'
import type {ReactNode} from 'react'
import {Activity,AlertTriangle,BarChart3,Bell,BriefcaseBusiness,ChevronDown,Clock3,FileText,LayoutDashboard,LineChart,Menu,Play,RefreshCw,Settings,ShieldCheck,SlidersHorizontal,TrendingUp,Wallet,X,Zap} from 'lucide-react'
import type {DashboardData} from '../../lib/dashboard-data'

const money=(n:number)=>\`RM \${n.toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}\`
const pct=(n:number)=>\`\${n>=0?'+':''}\${n.toFixed(2)}%\`

function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'buy'|'sell'|'warn'|'neutral'}){return <span className={\`badge \${tone}\`}>{children}</span>}
function Card({title,sub,children,action}:{title:string;sub?:string;children:ReactNode;action?:ReactNode}){return <section className="dash-card"><div className="dash-card-head"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{action}</div>{children}</section>}

const nav=[
 {label:'Dashboard',icon:LayoutDashboard},{label:'Strategies',icon:SlidersHorizontal},{label:'Trade',icon:Zap},
 {label:'Positions',icon:BriefcaseBusiness},{label:'Orders',icon:FileText},{label:'P&L Analytics',icon:LineChart},
 {label:'Risk & Alerts',icon:ShieldCheck},{label:'Market',icon:TrendingUp},{label:'History',icon:Clock3}
]

export default function Dashboard(){
 const [data,setData]=useState<DashboardData|null>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [menu,setMenu]=useState(false)
 const load=async()=>{setLoading(true);try{const r=await fetch('/api/dashboard',{cache:'no-store'});const d=await r.json();setData(d);setError(d.error||'')}catch{setError('Could not load dashboard.')}finally{setLoading(false)}}
 useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[])
 const maxPnl=useMemo(()=>Math.max(1,...(data?.pnl||[]).map(x=>Math.abs(x.value))),[data])
 const chartPoints=useMemo(()=>{const p=data?.pnl||[];if(!p.length)return '';const max=Math.max(...p.map(x=>x.cumulative),0);const min=Math.min(...p.map(x=>x.cumulative),0);const span=Math.max(1,max-min);return p.map((x,i)=>\`\${(i/Math.max(1,p.length-1))*100},\${92-((x.cumulative-min)/span)*72}\`).join(' ')},[data])
 if(!data)return <main className="dashboard"><div className="dash-loading"><RefreshCw className="spin"/><b>{loading?'Loading trading command center…':'No dashboard data'}</b></div></main>
 const risk=data.account.drawdown*100
 const consensusPct=Math.round((data.consensus.agreement/3)*100)
 return <main className="dashboard">
  <aside className={\`sidebar \${menu?'open':''}\`}>
   <div className="brand"><div className="brand-mark"><TrendingUp size={19}/></div><div><b>Stock Tracker</b><span>AI Trading Command Center</span></div><button className="mobile-close" onClick={()=>setMenu(false)}><X size={17}/></button></div>
   <div className="paper-mode"><span className="live-dot"/><div><b>Paper Trading</b><small>Simulated • No Real Money</small></div></div>
   <nav>{nav.map(({label,icon:Icon},i)=><button className={\`nav-item \${i===0?'active':''}\`} key={label}><Icon size={16}/><span>{label}</span></button>)}</nav>
   <div className="quick-title">QUICK ACTIONS</div>
   <div className="quick-actions"><button className="quick primary"><Play size={14}/>Run Bot Now</button><button className="quick"><BarChart3 size={14}/>Backtest</button><button className="quick"><Activity size={14}/>View Logs</button></div>
   <div className="sidebar-spacer"/>
   <button className="settings-mini"><Settings size={15}/><span>Settings</span><span className="settings-dot"/></button>
   <div className="system-status"><span className="status-check">✓</span><div><b>All Systems Online</b><small>Auto refresh enabled</small></div></div>
  </aside>

  <section className="main">
   <header className="topbar"><button className="mobile-menu" onClick={()=>setMenu(true)}><Menu size={18}/></button>
    <div className="market-open"><span className={data.market.status==='OPEN'?'live-dot':'closed-dot'}/><div><b>Market {data.market.status==='OPEN'?'Open':'Closed'}</b><small>09:30 - 16:00 EST</small></div></div>
    <div className="top-date"><span>{new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span><small>{new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>
    <button className="icon-btn"><Bell size={17}/><i>3</i></button><button className="icon-btn"><Settings size={17}/></button>
    <div className="user-chip"><span>MH</span><b>Paper Account</b><ChevronDown size={14}/></div>
   </header>

   <div className="content">
    <div className="page-head"><div><div className="eyebrow">TRADING COMMAND CENTER</div><h1>Dashboard</h1><p>Portfolio, strategy consensus and risk controls in one place.</p></div><div className="head-actions"><Badge tone="buy"><span className="dot"/> PAPER MODE</Badge><button className="refresh" onClick={load}><RefreshCw size={14} className={loading?'spin':''}/>Refresh</button></div></div>
    {error&&<div className="dash-notice"><AlertTriangle size={15}/>{error}</div>}

    <div className="kpi-grid">
     <div className="kpi-card"><span>Total Equity <Wallet size={12}/></span><b>{money(data.account.equity)}</b><em className="positive">▲ Portfolio value</em><div className="mini-line"><i style={{width:'78%'}}/></div></div>
     <div className="kpi-card"><span>Cash Balance</span><b>{money(data.account.cash)}</b><em>{data.account.equity?((data.account.cash/data.account.equity)*100).toFixed(1):'0.0'}% of total equity</em><div className="mini-progress"><i style={{width:\`\${Math.min(100,data.account.equity?data.account.cash/data.account.equity*100:0)}%\`}}/></div></div>
     <div className="kpi-card"><span>Unrealized P/L <TrendingUp size={12}/></span><b className={data.account.unrealizedPnl>=0?'positive':'negative'}>{money(data.account.unrealizedPnl)}</b><em className={data.account.unrealizedPnl>=0?'positive':'negative'}>{pct(data.account.equity?data.account.unrealizedPnl/data.account.equity*100:0)}</em><div className="mini-line"><i style={{width:'68%'}}/></div></div>
     <div className="kpi-card"><span>Open Positions</span><b>{data.account.openPositions}</b><em>Currently tracked</em><div className="kpi-icon"><BriefcaseBusiness size={18}/></div></div>
     <div className="kpi-card"><span>Win Rate</span><b>—</b><em>Waiting for trade history</em><div className="ring muted-ring"><span>—</span></div></div>
     <div className="kpi-card"><span>Drawdown</span><b className={risk>=5?'negative':''}>{risk.toFixed(2)}%</b><em>of peak equity</em><div className="ring"><span>{risk.toFixed(1)}%</span></div></div>
    </div>

    <div className="dashboard-grid">
     <div className="left-column">
      <Card title="3-Strategy Consensus" sub={\`\${data.consensus.agreement} of 3 strategies agree\`} action={<Badge tone="buy"><span className="dot"/> LIVE</Badge>}>
       <div className="consensus-main"><div><div className={\`consensus-action \${data.consensus.action.toLowerCase()}\`}>{data.consensus.action}</div><small>{data.consensus.symbol}</small></div><div className="agreement"><div className="agreement-bar"><span style={{width:\`\${consensusPct}%\`}}/></div><span>{data.consensus.agreement}/3 strategies agree • {data.consensus.confidence.toFixed(0)}% confidence</span></div></div>
       <div className="strategy-grid">{data.strategies.map(s=><div className="strategy" key={s.name}><div className="strategy-title"><span>{s.name}</span><Badge tone={s.signal==='BUY'?'buy':s.signal==='SELL'?'sell':'neutral'}>{s.signal}</Badge></div><b>{s.confidence.toFixed(0)}%</b><p>{s.reason}</p></div>)}</div>
       <div className="consensus-result"><span>✓ Consensus signal</span><b>{data.consensus.action}</b><small>Execution gate: requires 2/3 agreement + risk checks</small></div>
      </Card>

      <Card title="Portfolio Performance" sub="Cumulative P/L with daily movement" action={<select className="period-select" defaultValue="30"><option value="30">Last 30 Days</option><option value="7">Last 7 Days</option></select>}>
       <div className="chart-legend"><span><i className="legend-line"/> Cumulative P/L</span><span><i className="legend-bar"/> Daily P/L</span><span>— Benchmark</span></div>
       <div className="performance-chart">{chartPoints?<><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopOpacity=".32"/><stop offset="100%" stopOpacity="0"/></linearGradient></defs><polyline points={chartPoints} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/><polygon points={\`0,92 \${chartPoints} 100,92\`} fill="url(#area)"/></svg><strong>{money(data.pnl[data.pnl.length-1]?.cumulative||0)}</strong></>:<div className="empty">P/L history will appear here after trades are recorded.</div>}</div>
       <div className="chart-footer"><span>{data.pnl[0]?.date||'No data'}</span><span>{data.pnl[data.pnl.length-1]?.date||'—'}</span></div>
      </Card>

      <Card title="Current Positions" sub={\`\${data.positions.length} positions • paper account\`} action={<button className="view-link">View all →</button>}>
       <div className="dash-table">{data.positions.length?<table><thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Entry</th><th>Market</th><th>Unrealized P/L</th><th>P/L %</th></tr></thead><tbody>{data.positions.map(p=><tr key={p.symbol}><td><b>{p.symbol}</b></td><td><Badge tone={p.side==='LONG'?'buy':'sell'}>{p.side}</Badge></td><td>{p.quantity}</td><td>{p.entryPrice.toFixed(2)}</td><td>{p.currentPrice.toFixed(2)}</td><td className={p.pnl>=0?'positive':'negative'}>{money(p.pnl)}</td><td className={p.pnlPct>=0?'positive':'negative'}>{pct(p.pnlPct)}</td></tr>)}</tbody></table>:<div className="empty">No open positions yet.</div>}</div>
      </Card>
     </div>

     <aside className="right-column">
      <Card title="Account Overview" action={<select className="period-select" defaultValue="MYR"><option>MYR</option><option>USD</option></select>}><div className="account-list"><div><span>Total Assets</span><b>{money(data.account.equity)}</b></div><div><span>Cash</span><b>{money(data.account.cash)}</b></div><div><span>Stocks / Positions</span><b>{money(Math.max(0,data.account.equity-data.account.cash))}</b></div><div><span>Peak Equity</span><b>{money(data.account.peakEquity)}</b></div></div></Card>
      <Card title="Risk Monitor" sub="Pre-trade controls"><div className="risk-monitor"><div className="risk-ring"><div><b>{risk.toFixed(2)}%</b><span>Drawdown</span></div></div><div className="risk-checks"><div>◉ Equity cap <b>✓ OK</b></div><div>◉ Drawdown breaker <b className={risk>=5?'negative':''}>{risk>=5?'✕ TRIGGERED':'✓ OK'}</b></div><div>◉ Shariah filter <b>✓ ON</b></div><div>◉ Daily loss limit <b>✓ OK</b></div></div></div></Card>
      <Card title="Market Overview" action={<button className="view-link">View all →</button>}><div className="market-panel"><div><span>{data.market.symbol}</span><b>{money(data.market.price)}</b><small className={data.market.changePct>=0?'positive':'negative'}>{pct(data.market.changePct)}</small></div><div className="market-state"><span className={data.market.status==='OPEN'?'live-dot':'closed-dot'}/>{data.market.status}</div></div><div className="index-list"><div><span>S&P 500</span><b>—</b></div><div><span>NASDAQ</span><b>—</b></div><div><span>Dow Jones</span><b>—</b></div></div></Card>
     </aside>
    </div>

    <div className="bottom-grid">
     <Card title="Recent Orders" action={<button className="view-link">View all →</button>}><div className="dash-table">{data.orders.length?<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Status</th></tr></thead><tbody>{data.orders.slice(0,6).map(o=><tr key={o.id}><td>{new Date(o.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td><td><b>{o.symbol}</b></td><td><Badge tone={o.side==='BUY'?'buy':'sell'}>{o.side}</Badge></td><td>{o.quantity}</td><td>{o.price==null?'—':o.price.toFixed(2)}</td><td><Badge tone={o.status==='FILLED'?'buy':o.status==='CANCELLED'?'sell':'warn'}>{o.status}</Badge></td></tr>)}</tbody></table>:<div className="empty">No orders yet.</div>}</div></Card>
     <Card title="Risk Alerts" action={<button className="view-link">View all →</button>}><div className="alerts">{data.alerts.length?data.alerts.slice(0,5).map((a,i)=><div className="alert" key={i}><span className={a.level.toLowerCase()}>{a.level==='CRITICAL'?'!':a.level==='WARNING'?'⚠':'i'}</span><div><b>{a.message}</b><small>{new Date(a.createdAt).toLocaleTimeString()}</small></div></div>):<div className="empty">No alerts.</div>}</div></Card>
     <Card title="Daily P/L" sub="Realized + unrealized"><div className="daily-total">{money(data.pnl.reduce((n,p)=>n+p.value,0))}<small>{data.pnl.length?\`\${data.pnl.length} trading days\`:'No history yet'}</small></div><div className="bars">{data.pnl.slice(-12).map(p=><div className="bar-col" key={p.date} title={\`\${p.date}: \${money(p.value)}\`}><div className={\`bar \${p.value>=0?'up':'down'}\`} style={{height:\`\${Math.max(8,Math.abs(p.value)/maxPnl*100)}%\`}}/></div>)}</div></Card>
    </div>
    <footer className="dash-footer"><ShieldCheck size={14}/><span>Research-first mode • live execution is locked until strategy validation and explicit risk controls are enabled.</span><span className="footer-right">Auto refresh: 30s</span></footer>
   </div>
  </section>
 </main>
}
