import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

const mapPath = join(config.dataDir, "user-map.json");

interface UserInfo {
  chatId: number;
  firstName: string;
}

let userMap: Record<string, UserInfo> = {};

// Load on startup
try {
  userMap = JSON.parse(readFileSync(mapPath, "utf-8"));
} catch {
  // No map yet
}

export function registerUser(telegramUserId: number, chatId: number, firstName: string) {
  userMap[String(telegramUserId)] = { chatId, firstName };
  // Also map by first name for lookups from reminders
  userMap[firstName] = { chatId, firstName };
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(mapPath, JSON.stringify(userMap, null, 2), "utf-8");
}

export function getChatIdForUser(userName: string): number | null {
  // Try direct match by name
  if (userMap[userName]) return userMap[userName].chatId;
  // Try case-insensitive
  const key = Object.keys(userMap).find(
    (k) => k.toLowerCase() === userName.toLowerCase(),
  );
  return key ? userMap[key].chatId : null;
}

export function getAllUsers(): Record<string, UserInfo> {
  return { ...userMap };
}
