
import { config } from "../config.js";

const API =
  `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

export async function telegramRequest(method, payload = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(35000)
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description || `Telegram ${method} failed`
    );
  }

  return result.result;
}

export async function sendMessage(chatId, text) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text
  });
}

export async function sendPhoto(chatId, imageBuffer, caption) {
  const form = new FormData();

  form.append("chat_id", String(chatId));

  if (caption) {
    form.append("caption", caption);
  }

  form.append(
    "photo",
    new Blob([imageBuffer], {
      type: "image/png"
    }),
    "basis-chart.png"
  );

  const response = await fetch(`${API}/sendPhoto`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(35000)
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description || "Telegram sendPhoto failed"
    );
  }

  return result.result;
}
