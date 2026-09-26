# Moomoo OpenD setup for Stock Tracker

This integration is market-data + paper/research only. The Stock Tracker worker in this repository does not place, modify, cancel, or submit brokerage orders.

## 1. Install OpenD

Use the official Moomoo OpenAPI download page:

https://www.moomoo.com/download/OpenAPI

Install the current OpenD build for Windows. Moomoo documents OpenD as the local gateway between an API program and Moomoo's servers.

## 2. Sign in to OpenD

Start OpenD and complete the normal Moomoo login shown by OpenD.

Do not put your Moomoo password, one-time code, or other account secrets into GitHub, Vercel environment variables, Next.js source code, or this repository.

Keep the OpenD API service local. The expected API endpoint for this worker is 127.0.0.1:11111.

## 3. Install the Python SDK

From the Stock Tracker project folder on Windows:

    py -m pip install -r requirements-moomoo.txt

Or:

    py -m pip install moomoo-api

## 4. Start the local market-data bridge

In one terminal:

    py scripts/moomoo_market_worker.py

You should see:

    Stock Tracker Moomoo worker: http://127.0.0.1:8787
    OpenD: 127.0.0.1:11111
    Symbols: US.NVDA, US.GOOGL, US.MSFT
    Paper/research mode: no broker orders are implemented.

## 5. Run Stock Tracker locally

In a second terminal:

    npm install
    npm run dev

Then open:

    http://localhost:3000

The Next.js /api/moomoo route proxies the local worker so the dashboard can consume the Moomoo candles.

## 6. Verify the connection

Open:

    http://localhost:3000/api/moomoo

A healthy response has connected=true.

To inspect candles:

    http://localhost:3000/api/moomoo?action=candles&symbol=US.NVDA&limit=20

You can substitute US.GOOGL or US.MSFT.

If the market is closed, the connection can still be healthy while the candle cache remains unchanged until market data is flowing.

## 7. Important deployment detail

The worker connects to 127.0.0.1:11111. A Vercel deployment cannot directly reach OpenD running on your Windows PC.

For the first live-market-data test, run OpenD + the worker + Next.js on the same PC. Later, the ingestion worker can be moved to a properly secured always-on machine.

Do not expose OpenD port 11111 or worker port 8787 to the public internet.

## Troubleshooting

- Connection refused on 11111: OpenD is not running or is not listening on the expected port.
- Login failure: complete the normal OpenD sign-in flow in OpenD.
- Subscription rejected: check the market-data entitlement for the requested US symbols.
- No new candles: the US market may be closed or the required market-data permission may be unavailable.
- Python import error: run py -m pip install --upgrade moomoo-api.

Official references:

- OpenD overview: https://openapi.moomoo.com/moomoo-api-doc/en/opend/opend-intro.html
- Moomoo API download: https://www.moomoo.com/download/OpenAPI
- Python API sample: https://openapi.moomoo.com/moomoo-api-doc/en/quick/demo.html
- Real-time candlestick callback: https://openapi.moomoo.com/moomoo-api-doc/en/quote/update-kl.html
