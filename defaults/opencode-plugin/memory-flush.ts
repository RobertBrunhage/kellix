import type { Plugin } from "@opencode-ai/plugin";
import fs from "fs";
import path from "path";

export const MemoryFlushPlugin: Plugin = async ({ client, app }) => {
  const FLUSH_TIME = "23:00"; // 11 PM — end of day summary
  const DAILY_DIR = "./memory/daily";

  function getDailyPath(): string {
    const date = new Date().toISOString().split("T")[0];
    return path.join(DAILY_DIR, `${date}.md`);
  }

  // 1. On compaction — save the summary to daily file
  app.on("session.compacted", async (event: any) => {
    const summary = event.data?.summary;
    if (!summary) return;

    const timestamp = new Date().toISOString();
    const entry = `\n## Compacted at ${timestamp}\n${summary}\n---\n`;

    try {
      fs.mkdirSync(path.resolve(DAILY_DIR), { recursive: true });
      fs.appendFileSync(path.resolve(getDailyPath()), entry);
    } catch (err) {
      console.error("Memory flush failed:", err);
    }
  });

  // 2. On compaction — inject instruction to save important context
  return {
    "experimental.session.compacting": async (input: any, output: any) => {
      output.context.push(
        "IMPORTANT: Before this conversation is compacted, save any important decisions, " +
        "preferences, facts, or action items to memory/MEMORY.md. " +
        "Save a brief summary of today's key topics to " + getDailyPath() + ". " +
        "Only save what matters — skip trivial exchanges."
      );
    },
  };
};
