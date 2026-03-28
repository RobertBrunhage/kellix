import { Bot } from "grammy";
import * as p from "@clack/prompts";
import { getTelegramApiBase } from "../config.js";

export function createBot(token: string): Bot {
  const bot = new Bot(token, { client: { apiRoot: getTelegramApiBase() } });

  bot.catch((err) => {
    p.log.error(`Bot error: ${err.error}`);
  });

  return bot;
}
