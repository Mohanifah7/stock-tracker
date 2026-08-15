export type AssetClass = 'STOCK' | 'CRYPTO'

export type Asset = {
  symbol: string
  name: string
  broker: 'Moomoo' | 'Luno' | 'Research'
  assetClass: AssetClass
  price: number
  support: number
  supportScore: number
  upside: number
  signal: 'WATCH' | 'PAPER BUY' | 'PAPER SELL'
}

export const demoAssets: Asset[] = [
  { symbol: 'AAPL', name: 'Apple', broker: 'Moomoo', assetClass: 'STOCK', price: 100, support: 96, supportScore: 84, upside: 9.8, signal: 'WATCH' },
  { symbol: 'NVDA', name: 'NVIDIA', broker: 'Moomoo', assetClass: 'STOCK', price: 100, support: 94, supportScore: 79, upside: 14.2, signal: 'WATCH' },
  { symbol: 'BTC/MYR', name: 'Bitcoin', broker: 'Luno', assetClass: 'CRYPTO', price: 100, support: 91, supportScore: 76, upside: 12.1, signal: 'WATCH' },
  { symbol: 'ETH/MYR', name: 'Ethereum', broker: 'Luno', assetClass: 'CRYPTO', price: 100, support: 93, supportScore: 81, upside: 10.4, signal: 'WATCH' },
]
