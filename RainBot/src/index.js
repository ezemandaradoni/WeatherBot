import { startRainBot } from "./bot.js";

const mockRainFlagIndex = process.argv.indexOf("--mock-rain");
const mockRainLocationKey =
  mockRainFlagIndex >= 0 ? process.argv[mockRainFlagIndex + 1] ?? "ilha-grande" : null;

startRainBot({
  runOnce: process.argv.includes("--once"),
  forceMessage: process.argv.includes("--force-message"),
  testMessage: process.argv.includes("--test-message"),
  mockRainLocationKey
}).catch((error) => {
  console.error("[rain-bot]", error.message);
  process.exitCode = 1;
});
