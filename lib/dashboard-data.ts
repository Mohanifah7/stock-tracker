export type StrategySignal = { name:string; signal:'BUY'|'SELL'|'HOLD'; confidence:number; reason:string }
export type DashboardData = {
  account:{equity:number;cash:number;unrealizedPnl:number;openPositions:number;drawdown:number;peakEquity:number}
  consensus:{symbol:string;action:'BUY'|'SELL'|'HOLD';agreement:number;confidence:number}
  strategies:StrategySignal[]
  positions:Array<{symbol:string;side:'LONG'|'SHORT';quantity:number;entryPrice:number;currentPrice:number;pnl:number;pnlPct:number}>
  orders:Array<{id:string;symbol:string;side:'BUY'|'SELL';type:string;quantity:number;price:number|null;status:string;createdAt:string}>
  pnl:Array<{date:string;value:number;cumulative:number}>
  alerts:Array<{level:'INFO'|'WARNING'|'CRITICAL';message:string;createdAt:string}>
  market:{symbol:string;price:number;changePct:number;status:'OPEN'|'CLOSED'}
}
export const demoDashboard:DashboardData = {
  account:{equity:100000,cash:100000,unrealizedPnl:0,openPositions:0,drawdown:0,peakEquity:100000},
  consensus:{symbol:'NVDA',action:'HOLD',agreement:1,confidence:50},
  strategies:[
    {name:'Mean Reversion',signal:'HOLD',confidence:52,reason:'Waiting for an extreme away from the recent range.'},
    {name:'Momentum Breakout',signal:'HOLD',confidence:48,reason:'No confirmed support/resistance break.'},
    {name:'Trend Following',signal:'HOLD',confidence:50,reason:'Trend strength is currently neutral.'}
  ],
  positions:[],
  orders:[],
  pnl:[],
  alerts:[{level:'INFO',message:'Paper trading dashboard ready. Live execution remains locked.',createdAt:new Date().toISOString()}],
  market:{symbol:'NVDA',price:100,changePct:0,status:'CLOSED'}
}
