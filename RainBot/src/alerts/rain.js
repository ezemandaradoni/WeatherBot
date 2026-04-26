const WEATHER_API_RAIN_CODES = new Set([
  1063, 1072, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198,
  1201, 1240, 1243, 1246, 1273, 1276
]);

const IMPORTANT_ALERT_SEVERITIES = new Set(["moderate", "severe", "extreme"]);
const IMPORTANT_ALERT_URGENCIES = new Set(["immediate", "expected"]);

export function detectRain(entry) {
  if (!entry) {
    return false;
  }

  const weatherCode = Number(entry.condition?.code);
  const conditionText = String(entry.condition?.text ?? "").toLowerCase();
  const precipitationMm = Number(
    entry.precip_mm ?? entry.qpf_mm ?? entry.totalprecip_mm ?? entry.totalprecip_in ?? 0
  );
  const willItRain = Number(entry.will_it_rain ?? entry.daily_will_it_rain ?? 0);
  const chanceOfRain = Number(entry.chance_of_rain ?? entry.daily_chance_of_rain ?? 0);

  return (
    precipitationMm > 0 ||
    willItRain === 1 ||
    chanceOfRain >= 50 ||
    WEATHER_API_RAIN_CODES.has(weatherCode) ||
    conditionText.includes("rain") ||
    conditionText.includes("drizzle")
  );
}

export function buildTomorrowRainMessage(location, slotLabel, forecastHour) {
  const locationName = escapeTelegramMarkdown(location.name);
  const timeLabel = escapeTelegramMarkdown(forecastHour.time ?? "");
  const chanceOfRain = escapeTelegramMarkdown(String(forecastHour.chance_of_rain ?? "0"));
  const precipitation = escapeTelegramMarkdown(formatNumber(forecastHour.precip_mm));
  const conditionText = escapeTelegramMarkdown(forecastHour.condition?.text ?? "Sin detalle");

  return [
    `🌧️ *Lluvia anunciada en ${locationName} para mañana ${slotLabel}*`,
    "",
    `🕒 Hora del pronostico: \`${timeLabel}\``,
    `📊 Probabilidad: *${chanceOfRain}%*`,
    `💧 Precipitacion estimada: *${precipitation} mm*`,
    `☁️ Condicion: *${conditionText}*`
  ].join("\n");
}

export function buildNextHourRainMessage(location, forecastHour) {
  const locationName = escapeTelegramMarkdown(location.name);
  const timeLabel = escapeTelegramMarkdown(forecastHour.time ?? "");
  const chanceOfRain = escapeTelegramMarkdown(String(forecastHour.chance_of_rain ?? "0"));
  const precipitation = escapeTelegramMarkdown(formatNumber(forecastHour.precip_mm));
  const conditionText = escapeTelegramMarkdown(forecastHour.condition?.text ?? "Sin detalle");

  return [
    `⏳ *Lluvia inminente en ${locationName}*`,
    "",
    `🌧️ Lluvia prevista dentro de la proxima hora`,
    `🕒 Hora estimada: \`${timeLabel}\``,
    `📊 Probabilidad: *${chanceOfRain}%*`,
    `💧 Precipitacion estimada: *${precipitation} mm*`,
    `☁️ Condicion: *${conditionText}*`
  ].join("\n");
}

export function buildCurrentRainMessage(location, weather, stopForecastHour) {
  const current = weather.current ?? {};
  const locationName = escapeTelegramMarkdown(location.name);
  const temperature = escapeTelegramMarkdown(formatNumber(current.temp_c));
  const conditionText = escapeTelegramMarkdown(current.condition?.text ?? "Sin detalle");
  const precipitation = escapeTelegramMarkdown(formatNumber(current.precip_mm));
  const humidity = escapeTelegramMarkdown(String(current.humidity ?? ""));
  const reportTime = escapeTelegramMarkdown(
    weather.location?.localtime ?? new Date().toISOString()
  );

  const lines = [
    `🌧️ *Esta lloviendo ahora en ${locationName}*`,
    "",
    `🌡️ Temperatura: *${temperature} C*`,
    `☁️ Condicion actual: *${conditionText}*`,
    `💧 Lluvia actual: *${precipitation} mm*`,
    `💦 Humedad: *${humidity}%*`,
    `🕒 Hora del reporte: \`${reportTime}\``
  ];

  if (stopForecastHour) {
    lines.push(`🛑 Se estima que afloje o pare cerca de: \`${escapeTelegramMarkdown(stopForecastHour.time ?? "")}\``);
  } else {
    lines.push("🌀 No aparece un corte claro de lluvia en las proximas horas.");
  }

  return lines.join("\n");
}

export function buildImportantAlertMessage(location, alert) {
  const locationName = escapeTelegramMarkdown(location.name);
  const headline = escapeTelegramMarkdown(alert.headline ?? alert.event ?? "Alerta oficial");
  const eventName = escapeTelegramMarkdown(alert.event ?? "Evento meteorologico");
  const severity = escapeTelegramMarkdown(alert.severity ?? "Sin severidad");
  const urgency = escapeTelegramMarkdown(alert.urgency ?? "Sin urgencia");
  const expires = escapeTelegramMarkdown(alert.expires ?? "Sin hora de cierre");

  return [
    `🚨 *Alerta importante para ${locationName}*`,
    "",
    `📰 Titulo: *${headline}*`,
    `📍 Evento: *${eventName}*`,
    `⚠️ Severidad: *${severity}*`,
    `⏱️ Urgencia: *${urgency}*`,
    `🕒 Expira: \`${expires}\``
  ].join("\n");
}

export function buildTestTelegramMessage() {
  const reportTime = escapeTelegramMarkdown(new Date().toISOString());

  return [
    "🧪 *RainBot test message*",
    "",
    "✅ Telegram is configured correctly",
    `🕒 Time: \`${reportTime}\``
  ].join("\n");
}

export function isImportantAlert(alert) {
  const severity = String(alert?.severity ?? "").toLowerCase();
  const urgency = String(alert?.urgency ?? "").toLowerCase();
  return IMPORTANT_ALERT_SEVERITIES.has(severity) || IMPORTANT_ALERT_URGENCIES.has(urgency);
}

export function buildAlertKey(alert) {
  return [
    alert?.headline ?? "",
    alert?.event ?? "",
    alert?.effective ?? "",
    alert?.expires ?? ""
  ].join("|");
}

export function logWeather(location, summary) {
  console.log(
    `[rain-bot] ${location.name}: now=${summary.isRainingNow}, nextHour=${summary.hasRainWithinNextHour}, tomorrow10=${summary.tomorrow10Raining}, tomorrow22=${summary.tomorrow22Raining}, alerts=${summary.importantAlertsCount}`
  );
}

function formatNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toFixed(1) : "0.0";
}

function escapeTelegramMarkdown(value) {
  return String(value ?? "").replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
