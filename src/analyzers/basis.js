
import { config } from "../config.js";

const INTERVAL_MS = 15 * 60 * 1000;

export function analyzeBasis(data) {
  const { futures, index, endTime } = data;

  const indexMap = new Map(
    index.map(k => [Number(k[0]), k])
  );

  const candles = [];

  for (const f of futures) {
    const openTime = Number(f[0]);
    const closeTime = Number(f[6]);

    if (closeTime > endTime) continue;

    const i = indexMap.get(openTime);
    if (!i || Number(i[6]) !== closeTime) continue;

    const futuresClose = Number(f[4]);
    const indexClose = Number(i[4]);

    if (
      !Number.isFinite(futuresClose) ||
      !Number.isFinite(indexClose) ||
      futuresClose <= 0 ||
      indexClose <= 0
    ) continue;

    const basisRate =
      ((futuresClose - indexClose) / indexClose) * 100;

    candles.push({
      openTime,
      closeTime,
      basisRate
    });
  }

  candles.sort((a, b) => a.openTime - b.openTime);

  // Keep one extra candle for validation/history.
  const selected = candles.slice(-config.CANDLE_COUNT);

  if (selected.length < config.CANDLE_COUNT) {
    throw new Error("Không đủ 20 nến M15 đồng bộ.");
  }

  for (let i = 1; i < selected.length; i++) {
    if (
      selected[i].openTime -
      selected[i - 1].openTime !== INTERVAL_MS
    ) {
      throw new Error("Dữ liệu nến M15 không liên tục.");
    }
  }

  return selected.map((c, i) => ({
    ...c,
    change: i === 0
      ? null
      : c.basisRate - selected[i - 1].basisRate
  }));
}
