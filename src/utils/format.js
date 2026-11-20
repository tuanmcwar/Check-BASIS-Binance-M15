
import { config } from "../config.js";

const INTERVAL_MS = 15 * 60 * 1000;

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    timeZone: config.TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    timeZone: config.TIMEZONE
  });
}

export function signed(value, digits = 4) {
  if (!Number.isFinite(value)) return "—";

  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function formatBasisMessage(symbol, candles) {
  const lines = [
    "📊 BINANCE FUTURES BASIS M15",
    "━━━━━━━━━━━━━━━━━━━━",
    `🪙 COIN: ${symbol}.P`,
    "⏱ TIMEFRAME: 15M",
    `🕯 CANDLES: ${candles.length} CLOSED + 1 RUNNING`,
    "",
    "NẾN (VN) | BASIS RATE | THAY ĐỔI",
    "━━━━━━━━━━━━━━━━━━━━"
  ];

  for (const candle of candles) {
    const time = formatTime(candle.openTime);
    const basis = `${signed(candle.basisRate)}%`;

    const change = candle.change === null
      ? "—"
      : signed(candle.change);

    lines.push(`${time} | ${basis} | ${change}`);
  }

  // Current running M15 candle
  const currentOpenTime =
    Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS;

  lines.push(
    `${formatTime(currentOpenTime)} | ... | ...`,
    "━━━━━━━━━━━━━━━━━━━━",
    `📅 Ngày: ${formatDate(currentOpenTime)}`,
    "📌 Thay đổi tính bằng điểm phần trăm"
  );

  return lines.join("\n");
}
