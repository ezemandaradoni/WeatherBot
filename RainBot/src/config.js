import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");

export function getDataDir() {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(rootDir, "data");
}

export async function loadConfig() {
  const runtimeEnv = {
    CHECK_INTERVAL_MINUTES: process.env.CHECK_INTERVAL_MINUTES,
    DATA_DIR: process.env.DATA_DIR,
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID
  };

  if (hasRequiredEnv(runtimeEnv)) {
    return normalizeConfig(runtimeEnv);
  }

  try {
    const content = await fs.readFile(envPath, "utf8");
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

    return normalizeConfig({
      ...Object.fromEntries(pairs),
      ...pickDefined(runtimeEnv)
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        "Faltan variables de entorno. En local usa .env; en Render cargalas en Environment."
      );
    }

    throw error;
  }
}

function normalizeConfig(env) {
  validateEnv(env);

  return {
    checkIntervalMinutes: getPositiveInt(env.CHECK_INTERVAL_MINUTES, 15),
    weatherApiKey: env.WEATHER_API_KEY,
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramChatId: env.TELEGRAM_CHAT_ID
  };
}

function validateEnv(env) {
  const required = ["WEATHER_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }
}

function hasRequiredEnv(env) {
  return Boolean(env.WEATHER_API_KEY && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

function pickDefined(env) {
  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined));
}

function getPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
