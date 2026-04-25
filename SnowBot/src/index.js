import { startSnowBot } from "./bot.js";

startSnowBot({
  runOnce: process.argv.includes("--once"),
  forceMessage: process.argv.includes("--force-message"),
  testMessage: process.argv.includes("--test-message")
}).catch((error) => {
  console.error("[snow-bot]", error.message);
  process.exitCode = 1;
});
