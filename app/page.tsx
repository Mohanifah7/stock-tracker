'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Bot, Download, FileSpreadsheet, Pause, Play, RotateCcw, ShieldCheck, TrendingDown, TrendingUp, Upload } from 'lucide-react'

const demoCsv = `Date,Open,High,Low,Close,Volume
2026-01-02,100,103,99,102,1200000
2026-01-05,102,104,101,103,1100000
2026-01-06,103,105,102,104,1250000
2026-01-07,104,105,100,101,1500000
2026-01-08,101,102,98,99,1800000
2026-01-09,99,101,97,100,1700000
2026-01-12,100,103,99,102,1400000
2026-01-13,102,106,101,105,1550000
2026-01-14,105,109,104,108,1750000
2026-01-15,108,110,106,107,1600000
2026-01-16,107,112,106,111,1900000
2026-01-20,111,114,110,113,1850000
2026-01-21,113,116,112,115,2000000
2026-01-22,115,117,113,114,1750000
2026-01-23,114,118,113,117,2100000`

type ReplayPoint = { date: string; close: number; equity: number; signal: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL'; action: 'BUY' | 'SELL' | 'HOLD' }

type Result = { finalCapital: number; totalReturn: number; winRate: number; maxDrawdown: number; latestSignal: string; latestConfidence: number; directionAccuracy: number; trades: number; mode: 'FULL' | 'QUICK'; replay: ReplayPoint[] }

function ReplayChart({ data }: { data: ReplayPoint[] }) {
  const [step, setStep] = useState(Math.max(0, data.length - 1))
  const [playing, setPlaying] = useState(false)
  const visible = data.slice(0, step + 1)
  const points = visible.length ? visible : data.slice(0, 1)
  const width = 1000, height = 390, pad = 42
  const prices = points.map(x => x.close)
  const min = Math.min(...prices), max = Math.max(...prices), range = Math.max(max - min, 0.000001)
  const xy = (i: number, value: number) => ({ x: pad + (i / Math.max(points.length - 1, 1)) * (width - pad * 2), y: height - pad - ((value - min) / range) * (height - pad * 2) })
  const line = points.map((p, i) => { const q = xy(i, p.close); return `${q.x},${q.y}` }).join(' ')
  const last = points[points.length - 1]

  useEffect(() => {
    if (!playing) return
    if (step >= data.length - 1) { setPlaying(false); return }
    const timer = window.setTimeout(() => setStep(s => Math.min(s + 1, data.length - 1)), 80)
    return () => window.clearTimeout(timer)
  }, [playing, step, data.length])

  return <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-medium">Historical Backtest Replay</div><div className="text-xs text-slate-500">Replay the strategy candle-by-candle, similar to a chart backtest.</div></div><div className="flex items-center gap-2"><button onClick={() => setPlaying(p => !p)} className="rounded-lg border border-slate-700 p-2" title="Play / pause">{playing ? <Pause size={16}/> : <Play size={16}/>}</button><button onClick={() => { setPlaying(false); setStep(0) }} className="rounded-lg border border-slate-700 p-2" title="Restart"><RotateCcw size={16}/></button></div></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-auto w-full overflow-visible">
      <line x1={pad} x2={width-pad} y1={height-pad} y2={height-pad} stroke="currentColor" className="text-slate-800"/><line x1={pad} x2={pad} y1={pad} y2={height-pad} stroke="currentColor" className="text-slate-800"/>
      <polyline fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400" points={line}/>
      {points.map((p, i) => { if (p.action === 'HOLD') return null; const q = xy(i, p.close); return <g key={`${p.date}-${i}`}><circle cx={q.x} cy={q.y} r="6" className={p.action === 'BUY' ? 'fill-emerald-400' : 'fill-rose-400'}/><text x={q.x} y={q.y - 12} textAnchor="middle" className="fill-slate-300 text-[12px]">{p.action}</text></g> })}
    </svg>
    <input type="range" min="0" max={Math.max(data.length - 1, 0)} value={step} onChange={e => { setPlaying(false); setStep(Number(e.target.value)) }} className="w-full"/>
    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4"><div><span className="text-slate-500">Date</span><div>{last?.date ?? '—'}</div></div><div><span className="text-slate-500">Price</span><div>{last ? last.close.toFixed(4) : '—'}</div></div><div><span className="text-slate-500">Signal</span><div>{last?.signal ?? '—'}</div></div><div><span className="text-slate-500">Action</span><div>{last?.action ?? '—'}</div></div></div>
  </div>
}

export default function Home() {
  const [csv, setCsv] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [asset, setAsset] = useState('Moomoo Stocks')
  const [symbol, setSymbol] = useState('NVDA')
  const [loading, setLoading] = useState(false)
  const rowCount = useMemo(() => csv.trim() ? Math.max(0, csv.trim().split(/\r?\n/).length - 1) : 0, [csv])

  function loadDemo() { setCsv(demoCsv); setResult(null); setError('') }
  function downloadTemplate() { const blob = new Blob([demoCsv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'stock-tracker-market-data-template.csv'; a.click(); URL.revokeObjectURL(url) }
  function handleFile(file?: File) { if (!file) return; file.text().then(text => { setCsv(text); setResult(null); setError('') }).catch(() => setError('Unable to read this CSV file.')) }
  async function run() { setError(''); setResult(null); setLoading(true); try { const response = await fetch('/api/backtest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, capital: 100000 }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Backtest failed'); setResult(data.result) } catch (e) { setError(e instanceof Error ? e.message : 'Backtest failed') } finally { setLoading(false) } }
  const signal = result?.latestSignal, signalIsUp = signal === 'UPTREND'

  return <main className="min-h-screen bg-slate-950 p-6 text-white md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-emerald-400"><Bot size={20}/> Stock Tracker AI</div><h1 className="mt-2 text-4xl font-bold tracking-tight">AI Trading Research Lab</h1><p className="mt-2 text-slate-400">Import market data → backtest → replay the movement → study trend direction.</p></div><div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">RESEARCH / PAPER MODE</div></header>
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2"><FileSpreadsheet className="text-emerald-400" size={20}/><h2 className="text-xl font-semibold">1. Import Market Data</h2></div><p className="mt-1 text-sm text-slate-400">Use daily OHLCV data from Moomoo, Luno, or another market-data export.</p></div><div className="flex flex-wrap gap-2"><button onClick={downloadTemplate} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm"><Download size={16}/> CSV template</button><button onClick={loadDemo} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">Load demo data</button></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3"><label className="text-sm text-slate-400">Source<select value={asset} onChange={e=>setAsset(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white"><option>Moomoo Stocks</option><option>Luno Crypto</option><option>Other Market Data</option></select></label><label className="text-sm text-slate-400">Symbol<input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white"/></label><label className="text-sm text-slate-400">Timeframe<input value="1D" readOnly className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-300"/></label></div>
      <label className="mt-5 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-700 p-8 text-slate-400 hover:border-emerald-500"><Upload className="mr-2" size={18}/> Choose CSV file<input type="file" accept=".csv,text/csv" className="hidden" onChange={e=>handleFile(e.target.files?.[0])}/></label><div className="mt-4"><label className="text-sm text-slate-400">Or paste CSV data</label><textarea value={csv} onChange={e=>{setCsv(e.target.value);setResult(null);setError('')}} placeholder="Date,Open,High,Low,Close,Volume" className="mt-1 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs"/></div><div className="mt-3 text-xs text-slate-500">{rowCount} data rows loaded · Required: Date, Open, High, Low, Close · Volume optional</div><button onClick={run} disabled={!csv.trim() || loading} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40"><Play size={17}/>{loading?'Running backtest...':`Run ${symbol || 'Asset'} Backtest`}</button>{error&&<p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}</section>
    {result&&<section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">2. Backtest Replay</h2><p className="text-sm text-slate-400">{result.mode==='FULL'?'Full mode: 12/26 EMA + 20/50 SMA.':'Quick mode: under 60 candles, using 8/21 EMA + 10/20 SMA so you can preview the replay.'}</p></div><div className="text-xs text-amber-300">Research simulation — not a guaranteed forecast.</div></div><ReplayChart data={result.replay}/></section>}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['Final Capital',result?`RM ${result.finalCapital.toFixed(2)}`:'—'],['Total Return',result?`${(result.totalReturn*100).toFixed(2)}%`:'—'],['Win Rate',result?`${(result.winRate*100).toFixed(1)}%`:'—'],['Trades',result?String(result.trades):'—'],['Max Drawdown',result?`${(result.maxDrawdown*100).toFixed(2)}%`:'—']].map(([a,b])=><div key={a} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{a}</p><p className="mt-2 text-2xl font-semibold">{b}</p></div>)}</section>
    <section className="grid gap-6 lg:grid-cols-3"><div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">3. Trend Research</h2><p className="mt-1 text-sm text-slate-400">Research signal based on moving-average trend structure.</p>{result?<div className="mt-8 flex items-center gap-4">{signalIsUp?<TrendingUp className="text-emerald-400" size={38}/>:<TrendingDown className="text-rose-400" size={38}/>}<div><div className="text-3xl font-bold">{signal}</div><div className="mt-1 text-slate-400">Confidence: {result.latestConfidence}% · Tested direction accuracy: {(result.directionAccuracy*100).toFixed(1)}%</div></div></div>:<div className="mt-10 text-slate-500">Run a backtest to generate the trend signal.</div>}</div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Risk Engine</h2><div className="mt-5 space-y-4">{[['Max position','10%'],['Max exposure','50%'],['Daily loss limit','2%'],['Kill switch','10% drawdown']].map(([a,b])=><div className="flex justify-between border-b border-slate-800 pb-3" key={a}><span className="text-slate-400">{a}</span><span>{b}</span></div>)}</div><div className="mt-5 flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck size={17}/> Live orders disabled</div></div></section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center gap-2"><Activity className="text-emerald-400"/><h2 className="text-xl font-semibold">Current Research Pipeline</h2></div><div className="mt-5 grid gap-3 md:grid-cols-4">{['Import market data','Support detection','Trend filter','Backtest + compounding'].map((x,i)=><div className="rounded-xl border border-slate-800 p-4" key={x}><div className="text-xs text-slate-500">0{i+1}</div><div className="mt-2 font-medium">{x}</div><div className="mt-2 text-xs text-emerald-300">Ready / evolving</div></div>)}</div></section>
  </div></main>
}
