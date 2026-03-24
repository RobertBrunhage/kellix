import { config } from "./config.js";
import { runSetup } from "./setup.js";
import { createBot } from "./bot/index.js";
import { registerCommands } from "./bot/commands.js";
import { registerMessageHandler } from "./bot/message-handler.js";
import { Brain } from "./brain/index.js";
import { startScheduler } from "./scheduler.js";
import { startAutoSync } from "./sync.js";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startBot(botToken: string, brain: Brain) {
  const MAX_RETRIES = 5;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const bot = createBot(botToken);

    registerCommands(bot, brain);
    registerMessageHandler(bot, brain);

    await bot.api.setMyCommands([
      { command: "start", description: "Start Steve" },
      { command: "today", description: "What's on today?" },
      { command: "schedule", description: "View or update training schedule" },
      { command: "history", description: "View recent training history" },
    ]);

    startScheduler(brain, bot);

    await bot.api.deleteWebhook({ drop_pending_updates: true });

    try {
      console.log(`[Steve] Starting bot (attempt ${attempt})...`);
      // bot.start() returns a promise that resolves when polling begins
      // but throws on the first getUpdates if there's a conflict
      await new Promise<void>((resolve, reject) => {
        bot.start({
          onStart: () => {
            console.log("[Steve] Bot is running!");
            resolve();
          },
        });

        // Listen for polling errors
        bot.catch((err) => {
          console.error(`[Bot] Error:`, err.error);
        });

        // grammY throws polling errors as unhandled rejections
        const handler = (err: any) => {
          if (err?.error_code === 409) {
            process.removeListener("unhandledRejection", handler);
            bot.stop();
            reject(err);
          }
        };
        process.on("unhandledRejection", handler);

        // If no error after 5s, we're good
        sleep(5000).then(() => {
          process.removeListener("unhandledRejection", handler);
          resolve();
        });
      });

      // If we got here, bot is running
      const shutdown = () => {
        console.log("[Steve] Shutting down...");
        bot.stop();
        process.exit(0);
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
      return;
    } catch (err: any) {
      if (err?.error_code === 409 && attempt < MAX_RETRIES) {
        console.log(`[Steve] Telegram conflict, waiting 10s before retry...`);
        await sleep(10_000);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const ready = await runSetup();
  if (!ready) process.exit(1);

  const { config: freshConfig } = await import("./config.js");

  if (!freshConfig.telegram.botToken) {
    console.error("No Telegram bot token configured. Run setup again.");
    process.exit(1);
  }

  const brain = new Brain();
  startAutoSync();
  await startBot(freshConfig.telegram.botToken, brain);
}

main().catch((error) => {
  console.error("[Steve] Fatal error:", error);
  process.exit(1);
});
