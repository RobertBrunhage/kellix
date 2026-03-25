import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/client";
import { config, getUserDir, getRuntime } from "../config.js";

const sessions: Map<string, string> = new Map();
const queues: Map<string, Promise<void>> = new Map();
const clients: Map<string, OpencodeClient> = new Map();

const SESSION_FILE = join(config.dataDir, "sessions.json");
const RESET_HOUR = 4; // Reset sessions daily at 4am

function getClientForUser(userName: string): OpencodeClient {
  const name = userName.toLowerCase();
  if (!clients.has(name)) {
    // In Docker: per-user container. Locally: shared instance.
    const baseUrl = config.isDocker
      ? `http://opencode-${name}:3456`
      : config.opencodeUrl;

    clients.set(name, createOpencodeClient({
      baseUrl,
      directory: "/data",
    }));
  }
  return clients.get(name)!;
}

function loadSessions() {
  try {
    if (existsSync(SESSION_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
      if (data.sessions && (!data.resetAfter || Date.now() < data.resetAfter)) {
        for (const [k, v] of Object.entries(data.sessions)) {
          sessions.set(k, v as string);
        }
        p.log.info(`Restored ${sessions.size} session(s)`);
      }
    }
  } catch {}
}

function saveSessions() {
  try {
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setHours(RESET_HOUR, 0, 0, 0);
    if (nextReset.getTime() <= now.getTime()) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    writeFileSync(SESSION_FILE, JSON.stringify({
      sessions: Object.fromEntries(sessions),
      resetAfter: nextReset.getTime(),
    }), "utf-8");
  } catch {}
}

// Load persisted sessions on module init
loadSessions();

// Direct Telegram API call as fallback when opencode fails entirely
async function sendFallback(userName: string, message: string) {
  const rt = getRuntime();
  const chatId = Object.entries(rt.users).find(
    ([, name]) => name.toLowerCase() === userName.toLowerCase(),
  )?.[0];

  if (!chatId || !rt.botToken) return;

  try {
    await fetch(
      `https://api.telegram.org/bot${rt.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      },
    );
  } catch (err) {
    p.log.error(`Fallback send failed: ${err instanceof Error ? err.message : err}`);
  }
}

export class Brain {
  async think(
    userMessage: string,
    userName: string,
    files?: string[],
  ): Promise<void> {
    const prev = queues.get(userName) ?? Promise.resolve();
    const current = prev.then(() => this.process(userMessage, userName, files));
    queues.set(userName, current);
    await current;
  }

  private async process(
    userMessage: string,
    userName: string,
    files?: string[],
  ): Promise<void> {
    try {
      p.log.step(`${userName} → thinking...`);

      const oc = getClientForUser(userName);
      const userDir = config.isDocker ? "/data" : getUserDir(userName);
      let sessionId = sessions.get(userName);

      // Create session if needed
      if (!sessionId) {
        const res = await oc.session.create({
          body: { title: `Steve - ${userName}` },
          query: { directory: userDir },
        });
        if (res.data) {
          sessionId = res.data.id;
          sessions.set(userName, sessionId);
          saveSessions();
        } else {
          throw new Error("Failed to create session");
        }
      }

      // Build message parts
      const parts: Array<{ type: "text"; text: string } | { type: "file"; mime: string; url: string }> = [
        { type: "text", text: `[${userName}]: ${userMessage}` },
      ];

      if (files?.length) {
        for (const file of files) {
          const ext = file.split(".").pop()?.toLowerCase() || "jpg";
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
            gif: "image/gif", webp: "image/webp", pdf: "application/pdf",
          };
          parts.push({
            type: "file",
            mime: mimeMap[ext] || "application/octet-stream",
            url: `file://${file}`,
          });
        }
      }

      // Send prompt (fire-and-forget: opencode responds via MCP send_telegram_message)
      const { model } = getRuntime();
      const res = await oc.session.prompt({
        path: { id: sessionId },
        body: {
          parts,
          model: {
            providerID: model.split("/")[0],
            modelID: model.split("/")[1],
          },
        },
        query: { directory: userDir },
      });

      if (res.error) {
        if (res.response?.status === 404 || res.response?.status === 400) {
          p.log.warn(`Session expired for ${userName}, creating new one...`);
          sessions.delete(userName);
          saveSessions();
          return this.process(userMessage, userName, files);
        }
        throw new Error(`OpenCode error: ${JSON.stringify(res.error)}`);
      }

      p.log.success(`${userName} → replied`);
    } catch (error) {
      p.log.error(`${userName} → failed: ${error instanceof Error ? error.message : error}`);
      await sendFallback(
        userName,
        "Something went wrong on my end. Give me a moment and try again.",
      );
    }
  }

  /** Run a prompt in an isolated session (for cron/heartbeats — doesn't pollute user's conversation) */
  async thinkIsolated(
    userMessage: string,
    userName: string,
  ): Promise<void> {
    try {
      const oc = getClientForUser(userName);
      const userDir = config.isDocker ? "/data" : getUserDir(userName);

      const session = await oc.session.create({
        body: { title: `Steve - ${userName} (isolated)` },
        query: { directory: userDir },
      });

      if (!session.data) throw new Error("Failed to create isolated session");

      const res = await oc.session.prompt({
        path: { id: session.data.id },
        body: {
          parts: [{ type: "text", text: `[${userName}]: ${userMessage}` }],
          model: {
            providerID: getRuntime().model.split("/")[0],
            modelID: getRuntime().model.split("/")[1],
          },
        },
        query: { directory: userDir },
      });

      if (res.error) {
        throw new Error(`OpenCode error: ${JSON.stringify(res.error)}`);
      }
    } catch (error) {
      p.log.error(`Isolated task failed for ${userName}: ${error instanceof Error ? error.message : error}`);
    }
  }

  stopAll() {
    sessions.clear();
    saveSessions();
  }
}
