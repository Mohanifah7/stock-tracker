'use client'

import { useMemo, useState } from 'react'
import { Activity, Bot, Download, FileSpreadsheet, Play, ShieldCheck, TrendingDown, TrendingUp, Upload } from 'lucide-react'

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

export default function Home() {
  const [csv, setCsv] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [asset, setAsset] = useState('Moomoo Stocks')
  const [symbol, setSymbol] = useState('NVDA')
  const [loading, setLoading] = useState(false)

  const rowCount = useMemo(() => csv.trim() ? Math.max(0, csv.trim().split(/\r?\n/).length - 1) : 0, [csv])

  function loadDemo() {
    setCsv(demoCsv)
    setResult(null)
    setError('')
  }

  function downloadTemplate() {
    const blob = new Blob([demoCsv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stock-tracker-market-data-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(file?: File) {
    if (!file) return
    file.text().then(text => {
      setCsv(text)
      setResult(null)
      setError('')
    }).catch(() => setError('Unable to read this CSV file.'))
  }

  async function run() {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, capital: 100000 })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Backtest failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backtest failed')
    } finally {
      setLoading(false)
    }
  }

  const signal = result?.result?.latestSignal
  const signalIsUp = signal === 'UPTREND'

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400"><Bot size={20} /> Stock Tracker AI</div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">AI Trading Research Lab</h1>
            <p className="mt-2 text-slate-400">Import market data → backtest → study trend direction. Live execution is locked.</p>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">RESEARCH / PAPER MODE</div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2"><FileSpreadsheet className="text-emerald-400" size={20} /><h2 className="text-xl font-semibold">Import Market Data</h2></div>
              <p className="mt-1 text-sm text-slate-400">Use daily OHLCV data from Moomoo, Luno, or another market-data export.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadTemplate} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"><Download size={16} /> CSV template</button>
              <button onClick={loadDemo} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10">Load demo data</button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="text-sm text-slate-400">Source<select value={asset} onChange={e => setAsset(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white"><option>Moomoo Stocks</option><option>Luno Crypto</option><option>Other Market Data</option></select></label>
            <label className="text-sm text-slate-400">Symbol<input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="NVDA / BTC" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white" /></label>
            <label className="text-sm text-slate-400">Timeframe<input value="1D" readOnly className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-300" /></label>
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-700 p-8 text-slate-400 hover:border-emerald-500 hover:bg-slate-950">
            <Upload className="mr-2" size={18} /> Choose CSV file
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </label>

          <div className="mt-4">
            <label className="text-sm text-slate-400">Or paste CSV data</label>
            <textarea value={csv} onChange={e => { setCsv(e.target.value); setResult(null); setError('') }} placeholder={'Date,Open,High,Low,Close,Volume\n2026-01-02,100,103,99,102,1200000'} className="mt-1 min-h-36 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{rowCount} data rows loaded</span>
            <span>•</span>
            <span>Required: Date, Open, High, Low, Close</span>
            <span>•</span>
            <span>Volume optional</span>
          </div>

          <button onClick={run} disabled={!csv.trim() || loading} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Play size={17} />{loading ? 'Running backtest...' : `Run ${symbol || 'Asset'} Backtest`}</button>
          {error && <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Final Capital', result ? `RM ${result.result.finalCapital.toFixed(2)}` : '—'],
            ['Total Return', result ? `${(result.result.totalReturn * 100).toFixed(2)}%` : '—'],
            ['Win Rate', result ? `${(result.result.winRate * 100).toFixed(1)}%` : '—'],
            ['Max Drawdown', result ? `${(result.result.maxDrawdown * 100).toFixed(2)}%` : '—']
          ].map(([title, value]) => <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Trend Research</h2>
            <p className="mt-1 text-sm text-slate-400">A research signal from the current strategy, not a guaranteed prediction of future prices.</p>
            {result ? <div className="mt-8 flex items-center gap-4">{signalIsUp ? <TrendingUp className="text-emerald-400" size={38} /> : <TrendingDown className="text-rose-400" size={38} />}<div><div className="text-3xl font-bold">{signal}</div><div className="mt-1 text-slate-400">Confidence: {result.result.latestConfidence}% · Tested direction accuracy: {(result.result.directionAccuracy * 100).toFixed(1)}%</div></div></div> : <div className="mt-10 text-slate-500">Import data and run a backtest to generate a trend signal.</div>}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Risk Engine</h2><div className="mt-5 space-y-4">{[['Max position','10%'],['Max exposure','50%'],['Daily loss limit','2%'],['Kill switch','10% drawdown']].map(([a,b]) => <div className="flex justify-between border-b border-slate-800 pb-3" key={a}><span className="text-slate-400">{a}</span><span>{b}</span></div>)}</div><div className="mt-5 flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck size={17} /> Live orders disabled</div></div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center gap-2"><Activity className="text-emerald-400" /><h2 className="text-xl font-semibold">Current Research Pipeline</h2></div><div className="mt-5 grid gap-3 md:grid-cols-4">{['Import market data','Support detection','Trend filter','Backtest + compounding'].map((x, i) => <div className="rounded-xl border border-slate-800 p-4" key={x}><div className="text-xs text-slate-500">0{i + 1}</div><div className="mt-2 font-medium">{x}</div><div className="mt-2 text-xs text-emerald-300">Ready / evolving</div></div>)}</div></section>
      </div>
    </main>
  )
}
