const WEATHER_API_SNOW_CODES = new Set([
  1066, 1069, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1255, 1258,
  1261, 1264, 1279, 1282
]);

export function detectSnow(weather) {
  const current = weather.current ?? {};
  const weatherCode = Number(current.condition?.code);
  const conditionText = String(current.condition?.text ?? "").toLowerCase();
  const { currentHourSnowCm, todaySnowCm } = getSnowMetrics(weather);

  return (
    WEATHER_API_SNOW_CODES.has(weatherCode) ||
    conditionText.includes("snow") ||
    currentHourSnowCm > 0 ||
    todaySnowCm > 0
  );
}

export function buildSnowMessage(location, weather) {
  const current = weather.current ?? {};
  const { currentHourSnowCm, todaySnowCm } = getSnowMetrics(weather);
  const temperature = escapeTelegramMarkdown(formatNumber(current.temp_c));
  const conditionText = escapeTelegramMarkdown(current.condition?.text ?? "Sin detalle");
  const humidity = escapeTelegramMarkdown(String(current.humidity ?? ""));
  const currentHourSnowCmLabel = escapeTelegramMarkdown(formatNumber(currentHourSnowCm));
  const todaySnowCmLabel = escapeTelegramMarkdown(formatNumber(todaySnowCm));
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
    `🏔️ Nieve estimada esta hora: *${currentHourSnowCmLabel} cm*`,
    `📏 Nieve acumulada hoy: *${todaySnowCmLabel} cm*`,
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
  const { currentHourSnowCm, todaySnowCm } = getSnowMetrics(weather);
  console.log(
    `[snow-bot] ${location.name}: code=${current.condition?.code}, temp=${current.temp_c}C, condition=${current.condition?.text}, currentHourSnowCm=${currentHourSnowCm}, todaySnowCm=${todaySnowCm}, snowing=${isSnowing}`
  );
}

function formatNumber(value) {
  const number = toFiniteNumber(value);
  return Number.isFinite(number) ? number.toFixed(1) : "0.0";
}

function getSnowMetrics(weather) {
  const currentHour = findCurrentForecastHour(weather);

  return {
    currentHourSnowCm: toFiniteNumber(currentHour?.snow_cm ?? weather.current?.snow_cm),
    todaySnowCm: toFiniteNumber(weather.forecast?.forecastday?.[0]?.day?.totalsnow_cm)
  };
}

function findCurrentForecastHour(weather) {
  const hours = weather.forecast?.forecastday?.[0]?.hour ?? [];
  if (hours.length === 0) {
    return null;
  }

  const localtimeEpoch = Number(weather.location?.localtime_epoch);
  if (Number.isFinite(localtimeEpoch) && localtimeEpoch > 0) {
    const localHourEpoch = Math.floor(localtimeEpoch / 3600) * 3600;
    const byEpoch = hours.find((hour) => Number(hour.time_epoch) === localHourEpoch);
    if (byEpoch) {
      return byEpoch;
    }
  }

  const localHour = String(weather.location?.localtime ?? "").slice(0, 13);
  if (localHour) {
    return hours.find((hour) => String(hour.time ?? "").startsWith(localHour)) ?? null;
  }

  return null;
}

function toFiniteNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function escapeTelegramMarkdown(value) {
  return String(value ?? "").replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
