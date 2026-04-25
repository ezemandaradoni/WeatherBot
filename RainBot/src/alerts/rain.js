const WEATHER_API_RAIN_CODES = new Set([
  1063, 1072, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198,
  1201, 1240, 1243, 1246, 1273, 1276
]);

export function detectRain(weather) {
  const current = weather.current ?? {};
  const weatherCode = Number(current.condition?.code);
  const conditionText = String(current.condition?.text ?? "").toLowerCase();
  const precipitationMm = Number(current.precip_mm ?? 0);

  return (
    precipitationMm > 0 ||
    WEATHER_API_RAIN_CODES.has(weatherCode) ||
    conditionText.includes("rain") ||
    conditionText.includes("drizzle")
  );
}

export function buildRainMessage(location, weather) {
  const current = weather.current ?? {};
  const temperature = escapeTelegramMarkdown(formatNumber(current.temp_c));
  const conditionText = escapeTelegramMarkdown(current.condition?.text ?? "No detail");
  const precipitation = escapeTelegramMarkdown(formatNumber(current.precip_mm));
  const humidity = escapeTelegramMarkdown(String(current.humidity ?? ""));
  const locationName = escapeTelegramMarkdown(location.name);
  const reportTime = escapeTelegramMarkdown(
    weather.location?.localtime ?? new Date().toISOString()
  );

  return [
    `*Rain detected in ${locationName}*`,
    "",
    `Temperature: *${temperature} C*`,
    `Condition: *${conditionText}*`,
    `Current rain: *${precipitation} mm*`,
    `Humidity: *${humidity}%*`,
    `Report time: \`${reportTime}\``
  ].join("\n");
}

export function buildTestTelegramMessage() {
  const reportTime = escapeTelegramMarkdown(new Date().toISOString());

  return [
    "*RainBot test message*",
    "",
    "Telegram is configured correctly",
    `Time: \`${reportTime}\``
  ].join("\n");
}

export function logWeather(location, weather, isRaining) {
  const current = weather.current ?? {};
  console.log(
    `[rain-bot] ${location.name}: code=${current.condition?.code}, temp=${current.temp_c}C, precip=${current.precip_mm}mm, condition=${current.condition?.text}, raining=${isRaining}`
  );
}

function formatNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toFixed(1) : "0.0";
}

function escapeTelegramMarkdown(value) {
  return String(value ?? "").replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
