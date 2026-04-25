const WEATHER_API_MAX_RETRIES = 3;
const WEATHER_API_RETRY_DELAYS_MS = [2000, 5000, 10000];

export async function fetchCurrentWeatherForLocation(location, apiKey, logPrefix) {
  const url = new URL("https://api.weatherapi.com/v1/current.json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `${location.latitude},${location.longitude}`);
  url.searchParams.set("aqi", "no");

  return fetchWeatherApiJson(url, logPrefix);
}

export async function fetchForecastWeatherForLocation(location, apiKey, logPrefix, options = {}) {
  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `${location.latitude},${location.longitude}`);
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", options.alerts ? "yes" : "no");
  url.searchParams.set("days", String(options.days ?? 2));

  return fetchWeatherApiJson(url, logPrefix);
}

async function fetchWeatherApiJson(url, logPrefix) {
  for (let attempt = 0; attempt <= WEATHER_API_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url);

    if (response.ok) {
      return response.json();
    }

    if (response.status !== 429 || attempt === WEATHER_API_MAX_RETRIES) {
      const text = await response.text();
      throw new Error(`WeatherAPI devolvio ${response.status}: ${text}`);
    }

    const delayMs = WEATHER_API_RETRY_DELAYS_MS[attempt] ?? 10000;
    console.warn(
      `[${logPrefix}] WeatherAPI devolvio 429. Reintentando en ${delayMs / 1000} segundos...`
    );
    await sleep(delayMs);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
