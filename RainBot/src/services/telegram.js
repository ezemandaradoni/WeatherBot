export async function sendTelegramMessage(config, body) {
  const response = await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: body,
        parse_mode: "MarkdownV2"
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram devolvio ${response.status}: ${text}`);
  }
}
