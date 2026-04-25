const WEATHER_API_MAX_RETRIES = 3;
const WEATHER_API_RETRY_DELAYS_MS = [2000, 5000, 10000];

export async function fetchCurrentWeatherForLocation(location, apiKey) {
  const url = new URL("https://api.weatherapi.com/v1/current.json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `${location.latitude},${location.longitude}`);
  url.searchParams.set("aqi", "no");

  return fetchWeatherApiJson(url);
}

async function fetchWeatherApiJson(url) {
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
      `[rain-bot] WeatherAPI devolvio 429. Reintentando en ${delayMs / 1000} segundos...`
    );
    await sleep(delayMs);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
