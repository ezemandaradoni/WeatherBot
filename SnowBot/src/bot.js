import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSnowMessage, buildTestTelegramMessage, detectSnow, logWeather } from "./alerts/snow.js";
import { LOCATIONS } from "./locations.js";
import { loadBotConfig } from "../../src/shared/config.js";
import { createStateStore } from "../../src/shared/state-store.js";
import { sendTelegramMessage } from "../../src/shared/telegram.js";
import { fetchForecastWeatherForLocation } from "../../src/shared/weather-api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const botDir = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(botDir, "..");
const DEFAULT_REMINDER_INTERVAL_HOURS = 6;

export async function startSnowBot(options = {}) {
  const config = await loadBotConfig({
    envPrefix: "SNOW",
    envFilePaths: options.envFilePaths ?? [path.join(botDir, ".env"), path.join(monorepoRoot, ".env")],
    defaultDataDir: path.join(monorepoRoot, "data"),
    defaultStateFilename: "snow-state.json",
    genericTelegramFallback: true
  });
  config.reminderIntervalHours = getPositiveNumber(
    readEnvValue(config.rawEnv, ["SNOW_REMINDER_INTERVAL_HOURS", "REMINDER_INTERVAL_HOURS"]),
    DEFAULT_REMINDER_INTERVAL_HOURS
  );

  const stateStore = createStateStore(config.statePath);
  const runOnce = Boolean(options.runOnce);
  const forceMessage = Boolean(options.forceMessage);
  const testMessage = Boolean(options.testMessage);

  if (testMessage) {
    await sendTelegramMessage(config, buildTestTelegramMessage());
    console.log("[snow-bot] Mensaje de prueba enviado por Telegram");
    return;
  }

  if (runOnce) {
    await checkLocations(config, stateStore, { forceMessage });
    return;
  }

  console.log(
    `[snow-bot] Monitoreando nieve cada ${config.checkIntervalMinutes} minutos en ${LOCATIONS.map((location) => location.name).join(", ")}. Recordatorios cada ${config.reminderIntervalHours} horas mientras siga nevando.`
  );

  await checkLocations(config, stateStore, { forceMessage });

  setInterval(async () => {
    try {
      await checkLocations(config, stateStore, { forceMessage });
    } catch (error) {
      console.error("[snow-bot] Error en chequeo programado:", error.message);
    }
  }, config.checkIntervalMinutes * 60 * 1000);
}

async function checkLocations(config, stateStore, options = {}) {
  const state = await stateStore.read();
  const forceMessage = Boolean(options.forceMessage);

  for (const location of LOCATIONS) {
    try {
      const weather = await fetchForecastWeatherForLocation(
        location,
        config.weatherApiKey,
        "snow-bot",
        {
          days: 1,
          alerts: false
        }
      );
      const locationState = state[location.key] ?? {};
      const wasSnowing = Boolean(locationState.isSnowing);
      const isSnowing = detectSnow(weather);
      const shouldNotify =
        forceMessage ||
        (isSnowing &&
          (!wasSnowing ||
            shouldSendSnowReminder(locationState.lastNotificationAt, config.reminderIntervalHours)));

      logWeather(location, weather, isSnowing);

      if (shouldNotify) {
        const message = buildSnowMessage(location, weather);
        await sendTelegramMessage(config, message);
        console.log(`[snow-bot] Aviso enviado por Telegram para ${location.name}`);
      }

      state[location.key] = {
        isSnowing,
        updatedAt: new Date().toISOString(),
        lastNotificationAt: shouldNotify
          ? new Date().toISOString()
          : isSnowing
            ? locationState.lastNotificationAt ?? null
            : null,
        weatherCode: weather.current?.condition?.code,
        temperature: weather.current?.temp_c
      };
    } catch (error) {
      console.error(`[snow-bot] Fallo el procesamiento de ${location.name}:`, error.message);
    }
  }

  await stateStore.write(state);
}

function shouldSendSnowReminder(lastNotificationAt, reminderIntervalHours) {
  if (!lastNotificationAt) {
    return true;
  }

  const lastNotificationTime = new Date(lastNotificationAt).getTime();
  if (!Number.isFinite(lastNotificationTime)) {
    return true;
  }

  const elapsedMs = Date.now() - lastNotificationTime;
  return elapsedMs >= reminderIntervalHours * 60 * 60 * 1000;
}

function readEnvValue(env, keys) {
  for (const key of keys) {
    if (env[key]) {
      return env[key];
    }
  }

  return undefined;
}

function getPositiveNumber(value, fallback) {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
