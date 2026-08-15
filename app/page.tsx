import { Activity, ArrowUpRight, Bot, ShieldCheck, TrendingUp } from 'lucide-react'

const cards = [
  ['Starting Capital', 'RM100,000', 'Paper portfolio'],
  ['Available Cash', 'RM100,000', 'No live positions'],
  ['AI Confidence', '—', 'Waiting for backtest'],
  ['Total Return', '0.00%', 'Backtest not run'],
]

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400"><Bot size={20}/> Stock Tracker AI</div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">AI Trading Research Lab</h1>
            <p className="mt-2 text-slate-400">Backtest first. Paper trade next. Live execution stays locked.</p>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">PAPER MODE</div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([title, value, note]) => <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>)}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Strategy Pipeline</h2><p className="text-sm text-slate-400">Support → Entry → Exit → Compound</p></div><Activity className="text-slate-500"/></div>
            <div className="mt-6 grid gap-3 md:grid-cols-4">{['Market Scanner','Support Detector','AI Entry/Exit','Compounding'].map((x,i)=><div key={x} className="rounded-xl border border-slate-800 p-4"><div className="text-xs text-slate-500">0{i+1}</div><div className="mt-2 font-medium">{x}</div><div className="mt-2 text-xs text-amber-300">Not started</div></div>)}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Risk Engine</h2><div className="mt-5 space-y-4">{[['Max position','10%'],['Max exposure','50%'],['Daily loss limit','2%'],['Kill switch','10% drawdown']].map(([a,b])=><div className="flex justify-between border-b border-slate-800 pb-3" key={a}><span className="text-slate-400">{a}</span><span className="font-medium">{b}</span></div>)}</div><div className="mt-5 flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck size={17}/> Live execution locked</div></div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center gap-2"><TrendingUp size={20} className="text-emerald-400"/><h2 className="text-xl font-semibold">Backtest Results</h2></div><div className="mt-8 grid min-h-40 place-items-center text-center text-slate-500"><div><ArrowUpRight className="mx-auto mb-3"/><p>No backtest results yet.</p><p className="text-sm">Next step: connect historical market data and run the first walk-forward test.</p></div></div></section>
      </div>
    </main>
  )
}
