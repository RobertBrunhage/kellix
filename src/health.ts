import { config, getRuntime } from "./config.js";

export interface HealthStatus {
  healthy: boolean;
  uptime: number;
  components: {
    opencode: { status: "ok" | "error"; message?: string };
    telegram: { status: "ok" | "error" | "not_configured"; message?: string };
    vault: { status: "ok" | "not_configured"; secrets: number };
    scheduler: { status: "ok"; reminders: number };
  };
}

const startTime = Date.now();
let reminderCount = 0;
let telegramConnected = false;
let vaultSecretCount = 0;

export function setReminderCount(count: number) { reminderCount = count; }
export function setTelegramConnected(connected: boolean) { telegramConnected = connected; }
export function setVaultSecretCount(count: number) { vaultSecretCount = count; }

export async function getHealth(): Promise<HealthStatus> {
  // Check OpenCode
  let opencode: HealthStatus["components"]["opencode"];
  try {
    const res = await fetch(config.opencodeUrl, { signal: AbortSignal.timeout(3000) });
    opencode = res.ok ? { status: "ok" } : { status: "error", message: `HTTP ${res.status}` };
  } catch (err) {
    opencode = { status: "error", message: err instanceof Error ? err.message : "unreachable" };
  }

  let hasBotToken = false;
  try { hasBotToken = !!getRuntime().botToken; } catch {}
  const telegram: HealthStatus["components"]["telegram"] = hasBotToken
    ? { status: telegramConnected ? "ok" : "error", message: telegramConnected ? undefined : "not connected" }
    : { status: "not_configured" };

  const vault: HealthStatus["components"]["vault"] = vaultSecretCount > 0
    ? { status: "ok", secrets: vaultSecretCount }
    : { status: "not_configured", secrets: 0 };

  const scheduler: HealthStatus["components"]["scheduler"] = { status: "ok", reminders: reminderCount };

  const healthy = opencode.status === "ok" && telegram.status === "ok";

  return {
    healthy,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    components: { opencode, telegram, vault, scheduler },
  };
}
