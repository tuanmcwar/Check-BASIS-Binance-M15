
import { config } from "./config.js";

import {
  normalizeSymbol,
  validateSymbol,
  fetchCandles
} from "./services/binance.js";

import {
  telegramRequest,
  sendMessage,
  sendPhoto
} from "./services/telegram.js";

import { analyzeBasis } from "./analyzers/basis.js";
import { analyzePrice } from "./analyzers/price.js";

import { createBasisChart } from "./utils/chart.js";
import { createPriceChart } from "./utils/priceChart.js";

import { formatBasisMessage } from "./utils/format.js";

const INTERVAL_MS = 15 * 60 * 1000;

let offset = 0;

// ==========================================
// OUTPUT SETTINGS
// ==========================================

function getEnabledOutputs() {
  const outputs = [];

  if (config.SEND_BASIS_MESSAGE) {
    outputs.push("Basis Rate M15 report");
  }

  if (config.SEND_BASIS_CHART) {
    outputs.push("Basis Rate M15 chart");
  }

  if (config.SEND_PRICE_CHART) {
    outputs.push("Futures vs Index Price M15 chart");
  }

  return outputs;
}

// ==========================================
// DELETE ANALYZING MESSAGE
// ==========================================

async function deleteLoadingMessage(chatId, messageId) {
  if (!messageId) return;

  try {
    await telegramRequest("deleteMessage", {
      chat_id: chatId,
      message_id: messageId
    });

    // console.log(
    //   `[TELEGRAM] Deleted analyzing message ${messageId}`
    // );

  } catch (error) {
    console.error(
      "[DELETE MESSAGE ERROR]",
      error.message
    );
  }
}

// ==========================================
// PROCESS SYMBOL
// ==========================================

async function processSymbol(chatId, input) {
  const symbol = normalizeSymbol(input);

  if (!symbol) {
    await sendMessage(chatId, "Invalid symbol.");
    return;
  }

  let loadingMessageId = null;

  try {
    // ======================================
    // CHECK OUTPUT SETTINGS
    // ======================================

    const enabledOutputs = getEnabledOutputs();

    if (enabledOutputs.length === 0) {
      await sendMessage(
        chatId,
        "⚠️ All analysis outputs are currently disabled."
      );
      return;
    }

    // ======================================
    // VALIDATE SYMBOL
    // ======================================

    const valid = await validateSymbol(symbol);

    if (!valid) {
      await sendMessage(
        chatId,
        `❌ ${symbol} is not a valid USDT Perpetual Futures symbol.`
      );
      return;
    }

    // ======================================
    // SEND ANALYZING MESSAGE
    // ======================================

    const loadingMessage = await telegramRequest(
      "sendMessage",
      {
        chat_id: chatId,
        text: `⏳ Analyzing ${symbol}.P M15...`
      }
    );

    // Support both response formats:
    // Telegram message or { ok, result }
    loadingMessageId =
      loadingMessage?.message_id ??
      loadingMessage?.result?.message_id ??
      null;

    // ======================================
    // FETCH DATA ONCE
    // ======================================

    const data = await fetchCandles(symbol);

    // ======================================
    // ANALYZE ENABLED OUTPUTS
    // ======================================

    const needsBasis =
      config.SEND_BASIS_MESSAGE ||
      config.SEND_BASIS_CHART;

    const basisCandles = needsBasis
      ? analyzeBasis(data)
      : null;

    const priceCandles = config.SEND_PRICE_CHART
      ? analyzePrice(data)
      : null;

    // One running-candle timestamp
    const currentOpenTime =
      Math.floor(Date.now() / INTERVAL_MS) * INTERVAL_MS;

    let sentCount = 0;

    // ======================================
    // 1. BASIS TEXT MESSAGE
    // ======================================

    if (config.SEND_BASIS_MESSAGE) {
      const message = formatBasisMessage(
        symbol,
        basisCandles
      );

      await sendMessage(chatId, message);

      sentCount++;

      console.log(
        `[SENT] ${symbol} - Basis M15 report`
      );
    }

    // ======================================
    // 2. BASIS RATE CHART
    // ======================================

    if (config.SEND_BASIS_CHART) {
      const basisChart = await createBasisChart(
        symbol,
        basisCandles
      );

      const caption =
        `📈 ${symbol}.P | BASIS RATE M15 | ${basisCandles.length} CANDLES`;

      await sendPhoto(
        chatId,
        basisChart,
        caption
      );

      sentCount++;

      // console.log(
      //   `[SENT] ${symbol} - Basis Rate chart`
      // );
    }

    // ======================================
    // 3. FUTURES VS INDEX CHART
    // ======================================

    if (config.SEND_PRICE_CHART) {
      const priceChart = await createPriceChart(
        symbol,
        priceCandles,
        currentOpenTime
      );

      const caption =
        `📊 ${symbol}.P | FUTURES VS INDEX M15 | ${priceCandles.length} CANDLES`;

      await sendPhoto(
        chatId,
        priceChart,
        caption
      );

      sentCount++;

      // console.log(
      //   `[SENT] ${symbol} - Futures vs Index chart`
      // );
    }

    // ======================================
    // SUCCESS LOG
    // ======================================

    console.log(
      `[SUCCESS] ${symbol} - ${sentCount} outputs sent`
    );

  } catch (error) {
    console.error(
      `[ERROR] ${symbol}:`,
      error.message
    );

    try {
      await sendMessage(
        chatId,
        `❌ Analysis failed for ${symbol}: ${error.message}`
      );
    } catch (sendError) {
      console.error(
        "[ERROR MESSAGE FAILED]",
        sendError.message
      );
    }

  } finally {
    // ======================================
    // ALWAYS DELETE ANALYZING MESSAGE
    // ======================================

    await deleteLoadingMessage(
      chatId,
      loadingMessageId
    );
  }
}

// ==========================================
// HANDLE TELEGRAM MESSAGE
// ==========================================

async function handleMessage(message) {
  if (!message?.chat?.id) return;

  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!text) return;

  // ======================================
  // START COMMAND
  // ======================================

  if (text === "/start") {
    const enabledOutputs = getEnabledOutputs();

    const outputLines = enabledOutputs.length > 0
      ? enabledOutputs.map(
          (item, index) => `${index + 1}. ${item}`
        )
      : ["All analysis outputs are disabled."];

    await sendMessage(
      chatId,
      [
        "📊 BINANCE BASIS M15 BOT",
        "━━━━━━━━━━━━━━━━━━",
        "",
        "Send a coin symbol to analyze.",
        "",
        "Examples:",
        "BTC",
        "ETH",
        "CYBER",
        "BMT",
        "",
        "Enabled outputs:",
        ...outputLines,
        "",
        "20 closed candles + running candle (?)"
      ].join("\n")
    );

    return;
  }

  // ======================================
  // UNKNOWN COMMAND
  // ======================================

  if (text.startsWith("/")) {
    await sendMessage(
      chatId,
      "Unknown command. Send /start for instructions."
    );
    return;
  }

  // ======================================
  // PROCESS COIN
  // ======================================

  await processSymbol(chatId, text);
}

// ==========================================
// TELEGRAM LONG POLLING
// ==========================================

async function main() {
  console.log("=================================");
  console.log("BINANCE BASIS M15 BOT");
  console.log("Basis Rate + Futures vs Index");
  console.log("=================================");

  // ======================================
  // DISPLAY OUTPUT SETTINGS
  // ======================================

  console.log("[OUTPUT SETTINGS]");

  console.log(
    `Basis Message: ${
      config.SEND_BASIS_MESSAGE ? "ON" : "OFF"
    }`
  );

  console.log(
    `Basis Chart: ${
      config.SEND_BASIS_CHART ? "ON" : "OFF"
    }`
  );

  console.log(
    `Price Chart: ${
      config.SEND_PRICE_CHART ? "ON" : "OFF"
    }`
  );

  console.log("=================================");

  // ======================================
  // DELETE WEBHOOK
  // ======================================

  await telegramRequest("deleteWebhook", {
    drop_pending_updates: false
  });

  console.log("[TELEGRAM] Long polling started");

  // ======================================
  // POLLING LOOP
  // ======================================

  while (true) {
    try {
      const updates = await telegramRequest(
        "getUpdates",
        {
          offset,
          timeout: 30
        }
      );

      for (const update of updates) {
        offset = update.update_id + 1;

        if (update.message) {
          await handleMessage(update.message);
        }
      }

    } catch (error) {
      console.error(
        "[POLLING ERROR]",
        error.message
      );

      await new Promise(resolve =>
        setTimeout(resolve, 3000)
      );
    }
  }
}

// ==========================================
// START BOT
// ==========================================

main().catch(error => {
  console.error("[FATAL]", error);
  process.exit(1);
});
