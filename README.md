# Stock Tracker AI

A research-first stock trading system for backtesting, paper trading, support/resistance detection, entry/exit scoring, and compounding simulation.

## Safety

This project starts in backtesting and paper-trading mode. Live order execution is intentionally disabled until the strategy has been validated with out-of-sample testing and explicit risk controls.

## Planned pipeline

1. Historical data ingestion
2. Support/resistance detection
3. Entry and exit signal engine
4. Walk-forward backtesting
5. Compounding/rolling-profit simulation
6. Paper trading
7. Performance monitoring
8. Optional future broker integration behind hard risk limits

## Risk controls

- Maximum position size
- Maximum portfolio exposure
- Daily loss limit
- Stop-loss
- Maximum drawdown kill switch
- Data/API failure protection
- No look-ahead bias in backtests

## Initial app

The first web app is a dashboard for strategy configuration, backtesting, paper-trading status, positions, signals, and performance metrics.
