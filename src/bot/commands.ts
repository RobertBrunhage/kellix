import type { Bot } from "grammy";
import type { Brain } from "../brain/index.js";
import { config } from "../config.js";
import { registerUser } from "../user-map.js";
import { handleBrainMessage } from "./message-handler.js";

export function registerCommands(
  bot: Bot,
  brain: Brain,
): void {
  // Security: only allow configured users, and register their chat ID
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId || !config.telegram.allowedUserIds.includes(userId)) {
      return;
    }
    // Save mapping so scheduler can send messages to this user
    const chatId = ctx.chat?.id;
    if (chatId) {
      registerUser(userId, chatId, ctx.from?.first_name ?? "User");
    }
    await next();
  });

  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name ?? "there";
    await ctx.reply(
      `Hey ${name}! I'm Steve, your personal assistant.\n\nJust talk to me about anything. I can help with training, planning, notes, or whatever you need.`,
    );
  });

  // Everything else goes through the brain
  bot.command("today", (ctx) =>
    handleBrainMessage(ctx, brain, "What's on my plan for today?"));

  bot.command("schedule", (ctx) => {
    const arg = ctx.match;
    return handleBrainMessage(ctx, brain,
      arg ? `Here is my new training schedule: ${arg}` : "Show me my current training schedule");
  });

  bot.command("history", (ctx) => {
    const arg = ctx.match;
    return handleBrainMessage(ctx, brain,
      arg ? `Show me my training history: ${arg}` : "Show me my recent training history");
  });
}
