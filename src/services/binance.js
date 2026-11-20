
import { config } from "../config.js";

async function request(path, params = {}) {
  const url = new URL(config.BINANCE_BASE_URL + path);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Binance HTTP ${response.status}: ${body.slice(0, 200)}`
    );
  }

  const data = await response.json();

  if (data?.code && data.code < 0) {
    throw new Error(data.msg || "Binance API error");
  }

  return data;
}

export function normalizeSymbol(input) {
  let symbol = input.trim().toUpperCase();

  symbol = symbol.replace(/\.P$/, "");
  symbol = symbol.replace(/[^A-Z0-9]/g, "");

  if (!symbol.endsWith("USDT")) {
    symbol += "USDT";
  }

  if (!/^[A-Z0-9]{2,30}USDT$/.test(symbol)) {
    throw new Error("Tên coin không hợp lệ.");
  }

  return symbol;
}

export async function validateSymbol(symbol) {
  const data = await request("/fapi/v1/exchangeInfo");

  const found = data.symbols?.find(s =>
    s.symbol === symbol &&
    s.status === "TRADING" &&
    s.contractType === "PERPETUAL" &&
    s.quoteAsset === "USDT" &&
    s.marginAsset === "USDT"
  );

  if (!found) {
    throw new Error(
      `${symbol} không phải USDT Perpetual đang giao dịch.`
    );
  }

  return true;
}

export async function fetchCandles(symbol) {
  const intervalMs = 15 * 60 * 1000;

  // Last closed candle ends before this timestamp.
  const endTime =
    Math.floor(Date.now() / intervalMs) * intervalMs - 1;

  const params = {
    interval: config.TIMEFRAME,
    limit: config.CANDLE_COUNT + 5,
    endTime
  };

  const [futures, index] = await Promise.all([
    request("/fapi/v1/klines", {
      ...params,
      symbol
    }),
    request("/fapi/v1/indexPriceKlines", {
      ...params,
      pair: symbol
    })
  ]);

  return { futures, index, endTime };
}
