
import "dotenv/config";

export const config = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,

  BINANCE_BASE_URL: (
    process.env.BINANCE_BASE_URL ||
    "https://fapi.binance.com"
  ).replace(/\/$/, ""),

  TIMEFRAME: "15m",
  CANDLE_COUNT: 20,
  TIMEZONE: "Asia/Ho_Chi_Minh",

  // ==========================================
  // TELEGRAM OUTPUT SETTINGS
  // ==========================================

  // 1. Basis M15 text message
  SEND_BASIS_MESSAGE:
    process.env.SEND_BASIS_MESSAGE !== "false",

  // 2. Basis Rate M15 chart
  SEND_BASIS_CHART:
    process.env.SEND_BASIS_CHART !== "false",

  // 3. Futures vs Index M15 chart
  SEND_PRICE_CHART:
    process.env.SEND_PRICE_CHART !== "false"
};

if (!config.TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}
