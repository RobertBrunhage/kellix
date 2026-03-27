import type { Plugin } from "@opencode-ai/plugin";
import fs from "fs";
import path from "path";

const FLUSH_HOUR = 23;
const MEMORY_DIR = "./memory/daily";

function todayFile(): string {
  return path.join(MEMORY_DIR, `${new Date().toISOString().split("T")[0]}.md`);
}

function appendToDaily(text: string, label: string) {
  const entry = `\n## ${label} — ${new Date().toLocaleTimeString()}\n${text}\n---\n`;
  try {
    fs.mkdirSync(path.resolve(MEMORY_DIR), { recursive: true });
    fs.appendFileSync(path.resolve(todayFile()), entry);
    console.log(`Memory flush: saved to ${todayFile()}`);
  } catch (err) {
    console.error("Memory flush failed:", err);
  }
}

export const MemoryFlushPlugin: Plugin = async ({ client }) => {
  // Nightly forced compaction
  let lastFlush = "";
  setInterval(async () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (now.getHours() === FLUSH_HOUR && lastFlush !== today) {
      lastFlush = today;
      try {
        await client.session.summarize({ path: { id: "current" } });
      } catch {}
    }
  }, 60_000);

  return {
    event: async ({ event }) => {
      if (event.type === "session.compacted") {
        const sessionID = (event as any).properties?.sessionID;
        if (!sessionID) return;

        try {
          // Fetch all messages — the full history is preserved, with a
          // CompactionPart marker as the divider. Everything AFTER the
          // compaction marker is the summary that becomes the new context.
          const res = await client.session.messages({
            path: { id: sessionID },
          });

          if (!res.data) return;

          const messages = res.data as Array<{
            info: { role: string };
            parts: Array<{ type: string; text?: string }>;
          }>;

          // Find the compaction marker, then collect text from messages after it
          let foundCompaction = false;
          const summaryParts: string[] = [];

          for (const msg of messages) {
            // Check if this message contains the compaction marker
            if (!foundCompaction) {
              const hasCompaction = msg.parts.some((p) => p.type === "compaction");
              if (hasCompaction) {
                foundCompaction = true;
              }
              continue;
            }

            // After the compaction marker — collect assistant text parts
            if (msg.info.role !== "assistant") continue;
            for (const part of msg.parts) {
              if (part.type === "text" && part.text) {
                summaryParts.push(part.text);
              }
            }
          }

          if (summaryParts.length > 0) {
            appendToDaily(summaryParts.join("\n\n"), "Session summary");
          } else {
            console.log("session.compacted: no text parts found after compaction marker");
          }
        } catch (err) {
          console.error("Failed to fetch session messages after compaction:", err);
        }
      }
    },

    // Guide compaction to produce a useful summary
    "experimental.session.compacting": async (_input: any, output: any) => {
      output.context.push(
        "When summarizing this session, focus on: decisions made, goals changed, " +
        "commitments, action items, and important facts learned. Skip trivial exchanges."
      );
    },
  };
};
