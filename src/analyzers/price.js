
import { config } from "../config.js";

const INTERVAL_MS = 15 * 60 * 1000;

// ==========================================
// ANALYZE FUTURES VS INDEX PRICE
// ==========================================

export function analyzePrice(data) {
  const futures = data.futures;
  const index = data.index;

  if (!Array.isArray(futures) || !Array.isArray(index)) {
    throw new Error("Invalid Futures or Index data");
  }

  const indexMap = new Map(
    index.map(k => [Number(k[0]), k])
  );

  const candles = [];

  for (const futureKline of futures) {
    const openTime = Number(futureKline[0]);
    const closeTime = Number(futureKline[6]);

    const indexKline = indexMap.get(openTime);

    if (!indexKline) continue;

    // Exclude running candle
    if (closeTime > data.endTime) continue;

    // Match closing time
    if (Number(indexKline[6]) !== closeTime) {
      continue;
    }

    const futuresPrice = Number(futureKline[4]);
    const indexPrice = Number(indexKline[4]);

    if (
      !Number.isFinite(futuresPrice) ||
      !Number.isFinite(indexPrice) ||
      futuresPrice <= 0 ||
      indexPrice <= 0
    ) {
      continue;
    }

    candles.push({
      openTime,
      closeTime,
      futuresPrice,
      indexPrice
    });
  }

  candles.sort((a, b) => a.openTime - b.openTime);

  const result = candles.slice(-config.CANDLE_COUNT);

  if (result.length !== config.CANDLE_COUNT) {
    throw new Error(
      `Not enough price candles: ${result.length}/${config.CANDLE_COUNT}`
    );
  }

  // Verify candle continuity
  for (let i = 1; i < result.length; i++) {
    if (
      result[i].openTime - result[i - 1].openTime !==
      INTERVAL_MS
    ) {
      throw new Error(
        "Missing or discontinuous M15 candles"
      );
    }
  }

  return result;
}
