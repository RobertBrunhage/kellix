import { Bot } from "grammy";

export function createBot(token: string): Bot {
  const bot = new Bot(token);

  bot.catch((err) => {
    console.error(
      `[Bot] Error handling update ${err.ctx.update.update_id}:`,
      err.error,
    );
  });

  return bot;
}
