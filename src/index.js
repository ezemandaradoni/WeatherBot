import { startRainBot } from "../RainBot/src/bot.js";
import { startSnowBot } from "../SnowBot/src/bot.js";

const runOnce = process.argv.includes("--once");
const forceMessage = process.argv.includes("--force-message");
const testAll = process.argv.includes("--test-message");
const testSnow = testAll || process.argv.includes("--test-snow");
const testRain = testAll || process.argv.includes("--test-rain");
const rootEnvPath = new URL("../.env", import.meta.url);

async function main() {
  const sharedOptions = {
    envFilePaths: [rootEnvPath],
    runOnce,
    forceMessage
  };

  if (testSnow && !testRain) {
    await startSnowBot({
      ...sharedOptions,
      testMessage: true
    });
    return;
  }

  if (testRain && !testSnow) {
    await startRainBot({
      ...sharedOptions,
      testMessage: true
    });
    return;
  }

  await Promise.all([
    startSnowBot({
      ...sharedOptions,
      testMessage: testAll
    }),
    startRainBot({
      ...sharedOptions,
      testMessage: testAll
    })
  ]);
}

main().catch((error) => {
  console.error("[weatherbot]", error.message);
  process.exitCode = 1;
});
