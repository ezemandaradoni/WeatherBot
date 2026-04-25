import fs from "node:fs/promises";
import path from "node:path";

export async function loadBotConfig(options) {
  const {
    envPrefix,
    envFilePaths,
    defaultDataDir,
    defaultStateFilename,
    genericTelegramFallback = false
  } = options;

  const fileEnv = await loadFirstEnvFile(envFilePaths);
  const env = {
    ...fileEnv,
    ...pickDefined(process.env)
  };

  const weatherApiKey = readValue(env, [`${envPrefix}_WEATHER_API_KEY`, "WEATHER_API_KEY"]);
  const telegramBotToken = readValue(
    env,
    genericTelegramFallback
      ? [`${envPrefix}_TELEGRAM_BOT_TOKEN`, "TELEGRAM_BOT_TOKEN"]
      : [`${envPrefix}_TELEGRAM_BOT_TOKEN`]
  );
  const telegramChatId = readValue(
    env,
    genericTelegramFallback
      ? [`${envPrefix}_TELEGRAM_CHAT_ID`, "TELEGRAM_CHAT_ID"]
      : [`${envPrefix}_TELEGRAM_CHAT_ID`]
  );

  const missing = [];

  if (!weatherApiKey) {
    missing.push(`${envPrefix}_WEATHER_API_KEY o WEATHER_API_KEY`);
  }

  if (!telegramBotToken) {
    missing.push(
      genericTelegramFallback
        ? `${envPrefix}_TELEGRAM_BOT_TOKEN o TELEGRAM_BOT_TOKEN`
        : `${envPrefix}_TELEGRAM_BOT_TOKEN`
    );
  }

  if (!telegramChatId) {
    missing.push(
      genericTelegramFallback
        ? `${envPrefix}_TELEGRAM_CHAT_ID o TELEGRAM_CHAT_ID`
        : `${envPrefix}_TELEGRAM_CHAT_ID`
    );
  }

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }

  const dataDir = readValue(env, [`${envPrefix}_DATA_DIR`, "DATA_DIR"]) ?? defaultDataDir;
  const stateFilename = readValue(env, [`${envPrefix}_STATE_FILE`]) ?? defaultStateFilename;

  return {
    checkIntervalMinutes: getPositiveInt(
      readValue(env, [`${envPrefix}_CHECK_INTERVAL_MINUTES`, "CHECK_INTERVAL_MINUTES"]),
      15
    ),
    weatherApiKey,
    telegramBotToken,
    telegramChatId,
    statePath: path.join(path.resolve(dataDir), stateFilename)
  };
}

async function loadFirstEnvFile(filePaths) {
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return parseEnvFile(content);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return {};
}

function parseEnvFile(content) {
  const pairs = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        return null;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      return [key, value];
    })
    .filter(Boolean);

  return Object.fromEntries(pairs);
}

function pickDefined(env) {
  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined));
}

function readValue(env, keys) {
  for (const key of keys) {
    if (env[key]) {
      return env[key];
    }
  }

  return undefined;
}

function getPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
