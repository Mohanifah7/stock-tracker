"""
Local Moomoo -> Stock Tracker market-data bridge.

Paper/research only:
- Connects to Moomoo OpenD on localhost.
- Subscribes to 1-minute candles for NVDA, GOOGL and MSFT.
- Keeps a small in-memory candle cache.
- Exposes localhost HTTP endpoints for the Next.js app.
- Does NOT place, modify, or cancel brokerage orders.
"""

from __future__ import annotations
import json
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

try:
    from moomoo import OpenQuoteContext, SubType, Session, RET_OK, CurKlineHandlerBase
except ImportError as exc:
    raise SystemExit("Moomoo SDK is missing. Install it with: py -m pip install moomoo-api") from exc

HOST = "127.0.0.1"
OPEND_PORT = 11111
HTTP_HOST = "127.0.0.1"
HTTP_PORT = 8787
SYMBOLS = ["US.NVDA", "US.GOOGL", "US.MSFT"]
CACHE_SIZE = 500
candles = defaultdict(lambda: deque(maxlen=CACHE_SIZE))
state = {"connected": False, "message": "Starting...", "updatedAt": None}

def json_candle(row: dict, symbol: str) -> dict:
    return {
        "symbol": symbol,
        "time": str(row.get("time_key", "")),
        "open": float(row.get("open", 0)),
        "high": float(row.get("high", 0)),
        "low": float(row.get("low", 0)),
        "close": float(row.get("close", 0)),
        "volume": float(row.get("volume", 0)),
        "turnover": float(row.get("turnover", 0)),
    }

class CandleHandler(CurKlineHandlerBase):
    def on_recv_rsp(self, rsp_pb):
        ret, data = super().on_recv_rsp(rsp_pb)
        if ret != RET_OK:
            state["message"] = "Market-data callback error: " + str(data)
            state["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
            return ret, data
        if data is None or data.empty:
            return ret, data

        for _, row in data.iterrows():
            symbol = str(row.get("code", ""))
            if symbol not in SYMBOLS:
                continue
            candle = json_candle(row.to_dict(), symbol)
            items = [x for x in candles[symbol] if x["time"] != candle["time"]]
            candles[symbol] = deque(items, maxlen=CACHE_SIZE)
            candles[symbol].append(candle)

        state["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        state["message"] = "Receiving 1-minute market data."
        return ret, data

class Handler(BaseHTTPRequestHandler):
    def send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "http://localhost:3000")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        if parsed.path == "/status":
            self.send_json(200, {
                "ok": True,
                "connected": state["connected"],
                "host": HOST,
                "port": OPEND_PORT,
                "symbols": SYMBOLS,
                "message": state["message"],
                "updatedAt": state["updatedAt"] or time.strftime("%Y-%m-%dT%H:%M:%S"),
            })
            return

        if parsed.path == "/candles":
            symbol = query.get("symbol", ["US.NVDA"])[0]
            if symbol not in SYMBOLS:
                self.send_json(400, {"ok": False, "message": "Unsupported symbol."})
                return
            try:
                limit = min(max(int(query.get("limit", ["100"])[0]), 1), CACHE_SIZE)
            except ValueError:
                limit = 100
            self.send_json(200, {
                "ok": True,
                "symbol": symbol,
                "candles": list(candles[symbol])[-limit:],
            })
            return

        self.send_json(404, {"ok": False, "message": "Not found."})

    def log_message(self, *_args):
        return

def main():
    quote_ctx = OpenQuoteContext(host=HOST, port=OPEND_PORT)
    handler = CandleHandler()
    quote_ctx.set_handler(handler)

    ret, message = quote_ctx.subscribe(
        SYMBOLS,
        [SubType.K_1M],
        is_first_push=True,
        subscribe_push=True,
        session=Session.RTH,
    )
    if ret != RET_OK:
        quote_ctx.close()
        raise SystemExit("Moomoo subscription failed: " + str(message))

    state["connected"] = True
    state["message"] = "Connected to OpenD; subscribed to US 1-minute candles."
    state["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")

    server = ThreadingHTTPServer((HTTP_HOST, HTTP_PORT), Handler)
    print("Stock Tracker Moomoo worker: http://127.0.0.1:8787")
    print("OpenD: 127.0.0.1:11111")
    print("Symbols: " + ", ".join(SYMBOLS))
    print("Paper/research mode: no broker orders are implemented.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        quote_ctx.unsubscribe_all()
        quote_ctx.close()

if __name__ == "__main__":
    main()
