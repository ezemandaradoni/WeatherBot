const WEATHER_API_SNOW_CODES = new Set([
  1066, 1069, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1255, 1258,
  1261, 1264, 1279, 1282
]);

export function detectSnow(weather) {
  const current = weather.current ?? {};
  const weatherCode = Number(current.condition?.code);
  const conditionText = String(current.condition?.text ?? "").toLowerCase();
  return WEATHER_API_SNOW_CODES.has(weatherCode) || conditionText.includes("snow");
}

export function buildSnowMessage(location, weather) {
  const current = weather.current ?? {};
  const temperature = escapeTelegramMarkdown(formatNumber(current.temp_c));
  const conditionText = escapeTelegramMarkdown(current.condition?.text ?? "Sin detalle");
  const humidity = escapeTelegramMarkdown(String(current.humidity ?? ""));
  const currentSnowCm = escapeTelegramMarkdown(formatNumber(current.snow_cm));
  const todaySnowCm = escapeTelegramMarkdown(formatNumber(getTodayTotalSnowCm(weather)));
  const precipitationMm = escapeTelegramMarkdown(formatNumber(current.precip_mm));
  const locationName = escapeTelegramMarkdown(location.name);
  const reportTime = escapeTelegramMarkdown(
    weather.location?.localtime ?? new Date().toISOString()
  );

  return [
    `❄️ *Nieve detectada en ${locationName}*`,
    "",
    `🌡️ Temperatura: *${temperature} C*`,
    `🌨️ Condicion: *${conditionText}*`,
    `🏔️ Nieve actual: *${currentSnowCm} cm*`,
    `📏 Nieve acumulada hoy: *${todaySnowCm} cm*`,
    `💧 Precipitacion actual: *${precipitationMm} mm*`,
    `💦 Humedad: *${humidity}%*`,
    `🕒 Hora del reporte: \`${reportTime}\``
  ].join("\n");
}

export function buildTestTelegramMessage() {
  const reportTime = escapeTelegramMarkdown(new Date().toISOString());

  return [
    "❄️ *Mensaje de prueba de SnowBot*",
    "",
    "✅ Telegram quedo configurado correctamente",
    `🕒 Hora: \`${reportTime}\``
  ].join("\n");
}

export function logWeather(location, weather, isSnowing) {
  const current = weather.current ?? {};
  console.log(
    `[snow-bot] ${location.name}: code=${current.condition?.code}, temp=${current.temp_c}C, condition=${current.condition?.text}, snowing=${isSnowing}`
  );
}

function formatNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toFixed(1) : "0.0";
}

function getTodayTotalSnowCm(weather) {
  return weather.forecast?.forecastday?.[0]?.day?.totalsnow_cm ?? 0;
}

function escapeTelegramMarkdown(value) {
  return String(value ?? "").replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
