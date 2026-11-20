
import "dotenv/config";

// ==========================================
// ENV HELPERS
// ==========================================

function envBoolean(name, defaultValue = true) {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value.trim().toLowerCase() === "true";
}

function envNumber(name, defaultValue) {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(
      `Invalid ${name}: expected a positive integer`
    );
  }

  return number;
}

// ==========================================
// CONFIG
// ==========================================

export const config = {
  // TELEGRAM
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,

  // BINANCE
  BINANCE_BASE_URL: (
    process.env.BINANCE_BASE_URL ||
    "https://fapi.binance.com"
  ).replace(/\/$/, ""),

  // ANALYSIS
  TIMEFRAME: process.env.TIMEFRAME || "15m",

  CANDLE_COUNT: envNumber("CANDLE_COUNT", 20),

  TIMEZONE:
    process.env.TIMEZONE || "Asia/Ho_Chi_Minh",

  // TELEGRAM OUTPUT SETTINGS
  SEND_BASIS_MESSAGE:
    envBoolean("SEND_BASIS_MESSAGE", true),

  SEND_BASIS_CHART:
    envBoolean("SEND_BASIS_CHART", true),

  SEND_PRICE_CHART:
    envBoolean("SEND_PRICE_CHART", true)
};

// ==========================================
// VALIDATION
// ==========================================

if (!config.TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

// Current analyzers and charts are designed for M15.
if (config.TIMEFRAME !== "15m") {
  throw new Error(
    "Current bot supports TIMEFRAME=15m only"
  );
}
