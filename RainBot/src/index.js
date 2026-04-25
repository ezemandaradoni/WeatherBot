import { startRainBot } from "./bot.js";

startRainBot({
  runOnce: process.argv.includes("--once"),
  forceMessage: process.argv.includes("--force-message"),
  testMessage: process.argv.includes("--test-message")
}).catch((error) => {
  console.error("[rain-bot]", error.message);
  process.exitCode = 1;
});
