import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAlertKey,
  buildCurrentRainMessage,
  buildImportantAlertMessage,
  buildNextHourRainMessage,
  buildTestTelegramMessage,
  buildTomorrowRainMessage,
  detectRain,
  isImportantAlert,
  logWeather
} from "./alerts/rain.js";
import { LOCATIONS } from "./locations.js";
import { loadBotConfig } from "../../src/shared/config.js";
import { createStateStore } from "../../src/shared/state-store.js";
import { sendTelegramMessage } from "../../src/shared/telegram.js";
import { fetchForecastWeatherForLocation } from "../../src/shared/weather-api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const botDir = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(botDir, "..");

export async function startRainBot(options = {}) {
  const config = await loadBotConfig({
    envPrefix: "RAIN",
    envFilePaths: options.envFilePaths ?? [path.join(botDir, ".env"), path.join(monorepoRoot, ".env")],
    defaultDataDir: path.join(monorepoRoot, "data"),
    defaultStateFilename: "rain-state.json",
    genericTelegramFallback: true
  });

  const stateStore = createStateStore(config.statePath);
  const runOnce = Boolean(options.runOnce);
  const forceMessage = Boolean(options.forceMessage);
  const testMessage = Boolean(options.testMessage);
  const mockRainLocationKey = options.mockRainLocationKey ?? null;

  if (testMessage) {
    await sendTelegramMessage(config, buildTestTelegramMessage());
    console.log("[rain-bot] Mensaje de prueba enviado por Telegram");
    return;
  }

  if (mockRainLocationKey) {
    await runMockRainScenario(config, stateStore, mockRainLocationKey);
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
      const weather = await fetchForecastWeatherForLocation(
        location,
        config.weatherApiKey,
        "rain-bot",
        {
          days: 2,
          alerts: true
        }
      );
      const locationState = state[location.key] ?? {
        sentForecastSlots: {},
        sentAlertKeys: [],
        lastNextHourRainKey: null,
        isRainingNow: false
      };

      const events = analyzeForecast(weather);
      logWeather(location, events.summary);

      await notifyImportantAlerts(config, location, locationState, events.importantAlerts, forceMessage);
      await notifyTomorrowSlots(config, location, locationState, events.tomorrowSlots, forceMessage);
      await notifyNextHourRain(config, location, locationState, events.nextHourRain, forceMessage);
      await notifyCurrentRain(config, location, locationState, weather, events.currentRainStopHour, events.isRainingNow, forceMessage);

      state[location.key] = buildNextLocationState(locationState, weather, events);
    } catch (error) {
      console.error(`[rain-bot] Fallo el procesamiento de ${location.name}:`, error.message);
    }
  }

  await stateStore.write(state);
}

async function runMockRainScenario(config, stateStore, locationKey) {
  const location = LOCATIONS.find((entry) => entry.key === locationKey);
  if (!location) {
    throw new Error(`Ubicacion no reconocida para mock: ${locationKey}`);
  }

  const state = await stateStore.read();
  const locationState = state[location.key] ?? {
    sentForecastSlots: {},
    sentAlertKeys: [],
    lastNextHourRainKey: null,
    isRainingNow: false
  };
  const weather = buildMockWeather(location);
  const events = analyzeForecast(weather);

  logWeather(location, events.summary);

  await notifyTomorrowSlots(config, location, locationState, events.tomorrowSlots, true);
  await notifyNextHourRain(config, location, locationState, events.nextHourRain, true);
  await notifyCurrentRain(
    config,
    location,
    locationState,
    weather,
    events.currentRainStopHour,
    events.isRainingNow,
    true
  );

  state[location.key] = buildNextLocationState(locationState, weather, events);
  await stateStore.write(state);
}

function analyzeForecast(weather) {
  const forecastDays = weather.forecast?.forecastday ?? [];
  const today = forecastDays[0] ?? {};
  const tomorrow = forecastDays[1] ?? {};
  const nowEpoch = Number(weather.location?.localtime_epoch ?? 0);
  const isRainingNow = detectRain(weather.current);
  const currentRainStopHour = isRainingNow
    ? findRainStopHour(forecastDays, nowEpoch)
    : null;
  const tomorrow10 = findHourByClock(tomorrow.hour ?? [], 10);
  const tomorrow22 = findHourByClock(tomorrow.hour ?? [], 22);
  const nextHourRain = findNextHourRain(today.hour ?? [], tomorrow.hour ?? [], nowEpoch);
  const importantAlerts = (weather.alerts?.alert ?? []).filter(isImportantAlert);

  return {
    isRainingNow,
    currentRainStopHour,
    nextHourRain: isRainingNow ? null : nextHourRain,
    importantAlerts,
    tomorrowSlots: [
      buildTomorrowSlot("manana 10:00", tomorrow10),
      buildTomorrowSlot("manana 22:00", tomorrow22)
    ].filter(Boolean),
    summary: {
      isRainingNow,
      hasRainWithinNextHour: isRainingNow ? false : Boolean(nextHourRain),
      tomorrow10Raining: Boolean(tomorrow10 && detectRain(tomorrow10)),
      tomorrow22Raining: Boolean(tomorrow22 && detectRain(tomorrow22)),
      importantAlertsCount: importantAlerts.length
    }
  };
}

function buildTomorrowSlot(label, forecastHour) {
  if (!forecastHour || !detectRain(forecastHour)) {
    return null;
  }

  return {
    key: `${forecastHour.time ?? label}|${label}`,
    label,
    forecastHour
  };
}

function findHourByClock(hours, hour) {
  return hours.find((entry) => {
    const time = String(entry.time ?? "");
    return time.endsWith(` ${String(hour).padStart(2, "0")}:00`);
  });
}

function findNextHourRain(todayHours, tomorrowHours, nowEpoch) {
  const upcomingHours = [...todayHours, ...tomorrowHours].filter((hour) => {
    const hourEpoch = Number(hour.time_epoch ?? 0);
    return hourEpoch > nowEpoch && hourEpoch <= nowEpoch + 3600;
  });

  return upcomingHours.find((hour) => detectRain(hour)) ?? null;
}

function findRainStopHour(forecastDays, nowEpoch) {
  const allHours = forecastDays.flatMap((day) => day.hour ?? []);
  return allHours.find((hour) => {
    const hourEpoch = Number(hour.time_epoch ?? 0);
    return hourEpoch > nowEpoch && !detectRain(hour);
  }) ?? null;
}

async function notifyImportantAlerts(config, location, locationState, alerts, forceMessage) {
  for (const alert of alerts) {
    const alertKey = buildAlertKey(alert);
    if (!forceMessage && locationState.sentAlertKeys?.includes(alertKey)) {
      continue;
    }

    await sendTelegramMessage(config, buildImportantAlertMessage(location, alert));
    console.log(`[rain-bot] Alerta importante enviada para ${location.name}`);
  }
}

async function notifyTomorrowSlots(config, location, locationState, tomorrowSlots, forceMessage) {
  for (const slot of tomorrowSlots) {
    if (!forceMessage && locationState.sentForecastSlots?.[slot.key]) {
      continue;
    }

    await sendTelegramMessage(
      config,
      buildTomorrowRainMessage(location, slot.label, slot.forecastHour)
    );
    console.log(`[rain-bot] Aviso de pronostico enviado para ${location.name} (${slot.label})`);
  }
}

async function notifyNextHourRain(config, location, locationState, nextHourRain, forceMessage) {
  if (!nextHourRain) {
    return;
  }

  const nextHourRainKey = String(nextHourRain.time_epoch ?? nextHourRain.time ?? "");
  if (!forceMessage && locationState.lastNextHourRainKey === nextHourRainKey) {
    return;
  }

  await sendTelegramMessage(config, buildNextHourRainMessage(location, nextHourRain));
  console.log(`[rain-bot] Aviso de lluvia en la proxima hora enviado para ${location.name}`);
}

async function notifyCurrentRain(
  config,
  location,
  locationState,
  weather,
  currentRainStopHour,
  isRainingNow,
  forceMessage
) {
  if (!isRainingNow) {
    return;
  }

  if (!forceMessage && locationState.isRainingNow) {
    return;
  }

  await sendTelegramMessage(
    config,
    buildCurrentRainMessage(location, weather, currentRainStopHour)
  );
  console.log(`[rain-bot] Aviso de lluvia actual enviado para ${location.name}`);
}

function buildNextLocationState(previousState, weather, events) {
  const sentForecastSlots = { ...(previousState.sentForecastSlots ?? {}) };
  for (const slot of events.tomorrowSlots) {
    sentForecastSlots[slot.key] = new Date().toISOString();
  }

  const sentAlertKeys = Array.from(
    new Set([
      ...(previousState.sentAlertKeys ?? []),
      ...events.importantAlerts.map((alert) => buildAlertKey(alert))
    ])
  ).slice(-20);

  return {
    ...previousState,
    isRainingNow: events.isRainingNow,
    lastNextHourRainKey: events.nextHourRain
      ? String(events.nextHourRain.time_epoch ?? events.nextHourRain.time ?? "")
      : null,
    sentForecastSlots,
    sentAlertKeys,
    updatedAt: new Date().toISOString(),
    weatherCode: weather.current?.condition?.code,
    temperature: weather.current?.temp_c,
    precipitationMm: weather.current?.precip_mm
  };
}

function buildMockWeather(location) {
  const now = new Date();
  const nowEpoch = Math.floor(now.getTime() / 1000);
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);

  const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
  const stopHour = new Date(currentHour.getTime() + 2 * 60 * 60 * 1000);
  const tomorrow10 = new Date(currentHour);
  tomorrow10.setDate(tomorrow10.getDate() + 1);
  tomorrow10.setHours(10, 0, 0, 0);
  const tomorrow22 = new Date(currentHour);
  tomorrow22.setDate(tomorrow22.getDate() + 1);
  tomorrow22.setHours(22, 0, 0, 0);

  return {
    location: {
      name: location.name,
      localtime: toLocalTimeString(now),
      localtime_epoch: nowEpoch
    },
    current: {
      temp_c: 27.4,
      precip_mm: 2.8,
      humidity: 88,
      condition: {
        code: 1183,
        text: "Light rain"
      }
    },
    forecast: {
      forecastday: [
        {
          date: toDateString(currentHour),
          hour: [
            buildMockHour(currentHour, { chanceOfRain: 70, precipMm: 0.5, text: "Patchy rain nearby", code: 1063 }),
            buildMockHour(nextHour, { chanceOfRain: 95, precipMm: 3.2, text: "Moderate rain", code: 1186 }),
            buildMockHour(stopHour, { chanceOfRain: 10, precipMm: 0, text: "Cloudy", code: 1006 })
          ]
        },
        {
          date: toDateString(tomorrow10),
          hour: [
            buildMockHour(tomorrow10, { chanceOfRain: 84, precipMm: 1.6, text: "Light rain shower", code: 1240 }),
            buildMockHour(tomorrow22, { chanceOfRain: 91, precipMm: 4.1, text: "Moderate rain", code: 1189 })
          ]
        }
      ]
    },
    alerts: {
      alert: []
    }
  };
}

function buildMockHour(date, options) {
  const time = toLocalTimeString(date);
  return {
    time,
    time_epoch: Math.floor(date.getTime() / 1000),
    chance_of_rain: options.chanceOfRain,
    will_it_rain: options.chanceOfRain >= 50 ? 1 : 0,
    precip_mm: options.precipMm,
    condition: {
      text: options.text,
      code: options.code
    }
  };
}

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeString(date) {
  return `${toDateString(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
