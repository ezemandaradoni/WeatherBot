import { buildRainMessage, buildTestTelegramMessage, detectRain, logWeather } from "./alerts/rain.js";
import { getDataDir, loadConfig } from "./config.js";
import { LOCATIONS } from "./locations.js";
import { fetchCurrentWeatherForLocation } from "./services/weather-api.js";
import { sendTelegramMessage } from "./services/telegram.js";
import { createStateStore } from "./state-store.js";

async function main() {
  const config = await loadConfig();
  const stateStore = createStateStore(getDataDir());
  const runOnce = process.argv.includes("--once");
  const forceMessage = process.argv.includes("--force-message");
  const testMessage = process.argv.includes("--test-message");

  if (testMessage) {
    await sendTelegramMessage(config, buildTestTelegramMessage());
    console.log("[rain-bot] Mensaje de prueba enviado por Telegram");
    return;
  }

  if (runOnce) {
    await checkLocations(config, stateStore, { forceMessage });
    return;
  }

  console.log(
    `[rain-bot] Monitoreando lluvia cada ${config.checkIntervalMinutes} minutos en ${LOCATIONS.map((location) => location.name).join(", ")}`
  );

  await checkLocations(config, stateStore, { forceMessage });

  setInterval(async () => {
    try {
      await checkLocations(config, stateStore, { forceMessage });
    } catch (error) {
      console.error("[rain-bot] Error en chequeo programado:", error.message);
    }
  }, config.checkIntervalMinutes * 60 * 1000);
}

async function checkLocations(config, stateStore, options = {}) {
  const state = await stateStore.read();
  const forceMessage = Boolean(options.forceMessage);

  for (const location of LOCATIONS) {
    try {
      const weather = await fetchCurrentWeatherForLocation(location, config.weatherApiKey);
      const wasRaining = Boolean(state[location.key]?.isRaining);
      const isRaining = detectRain(weather);

      logWeather(location, weather, isRaining);

      if ((isRaining && !wasRaining) || forceMessage) {
        const message = buildRainMessage(location, weather);
        await sendTelegramMessage(config, message);
        console.log(`[rain-bot] Aviso enviado por Telegram para ${location.name}`);
      }

      state[location.key] = {
        isRaining,
        updatedAt: new Date().toISOString(),
        weatherCode: weather.current?.condition?.code,
        temperature: weather.current?.temp_c,
        precipitationMm: weather.current?.precip_mm
      };
    } catch (error) {
      console.error(`[rain-bot] Fallo el procesamiento de ${location.name}:`, error.message);
    }
  }

  await stateStore.write(state);
}

main().catch((error) => {
  console.error("[rain-bot]", error.message);
  process.exitCode = 1;
});
