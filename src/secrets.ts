import type { Vault } from "./vault/index.js";
import { toUserSlug } from "./users.js";

export const SYSTEM_TELEGRAM_BOT_TOKEN_KEY = "system/telegram/bot_token";
export const LEGACY_TELEGRAM_BOT_TOKEN_KEY = "telegram/bot_token";

export interface UserAppSecretSummary {
  integration: string;
  fields: string[];
}

function getCaseInsensitiveKey(vault: Vault, expectedKey: string): string | null {
  const lowerExpected = expectedKey.toLowerCase();
  for (const key of vault.list()) {
    if (key.toLowerCase() === lowerExpected) return key;
  }
  return null;
}

function getCaseInsensitiveValue(vault: Vault, expectedKey: string): { key: string; value: Record<string, unknown> | string } | null {
  const key = getCaseInsensitiveKey(vault, expectedKey);
  if (!key) return null;
  const value = vault.get(key) ?? vault.getString(key);
  if (value === null) return null;
  return { key, value };
}

function parseNewUserAppKey(key: string): { user: string; integration: string } | null {
  const match = key.match(/^users\/([^/]+)\/([^/]+)\/app$/i);
  if (!match) return null;
  return { user: toUserSlug(match[1]), integration: match[2].toLowerCase() };
}

function parseLegacyUserAppKey(key: string): { user: string; integration: string } | null {
  const match = key.match(/^([^/]+)\/([^/]+)$/);
  if (!match) return null;
  if (key.toLowerCase().startsWith("system/")) return null;
  if (key.toLowerCase().startsWith("steve/")) return null;
  if (key.toLowerCase() === LEGACY_TELEGRAM_BOT_TOKEN_KEY) return null;
  if (match[2].toLowerCase().endsWith("-tokens")) return null;
  return { user: toUserSlug(match[1]), integration: match[2].toLowerCase() };
}

export function getTelegramBotToken(vault: Vault | null): string | null {
  if (!vault) return null;
  return vault.getString(SYSTEM_TELEGRAM_BOT_TOKEN_KEY) || vault.getString(LEGACY_TELEGRAM_BOT_TOKEN_KEY) || null;
}

export function setTelegramBotToken(vault: Vault, token: string): void {
  vault.set(SYSTEM_TELEGRAM_BOT_TOKEN_KEY, token as any);
  if (vault.has(LEGACY_TELEGRAM_BOT_TOKEN_KEY)) {
    vault.delete(LEGACY_TELEGRAM_BOT_TOKEN_KEY);
  }
}

export function hasTelegramBotToken(vault: Vault | null): boolean {
  return !!getTelegramBotToken(vault);
}

export function getUserAppSecretKey(userName: string, integration: string): string {
  return `users/${toUserSlug(userName)}/${integration.toLowerCase()}/app`;
}

export function getUserTokensSecretKey(userName: string, integration: string): string {
  return `users/${toUserSlug(userName)}/${integration.toLowerCase()}/tokens`;
}

export function getLegacyUserAppSecretKey(userName: string, integration: string): string {
  return `${toUserSlug(userName)}/${integration.toLowerCase()}`;
}

export function getLegacyUserTokensSecretKey(userName: string, integration: string): string {
  return `${toUserSlug(userName)}/${integration.toLowerCase()}-tokens`;
}

export function getUserAppSecret(vault: Vault | null, userName: string, integration: string): { key: string; value: Record<string, unknown> | string } | null {
  if (!vault) return null;

  const candidates = [
    getUserAppSecretKey(userName, integration),
    getLegacyUserAppSecretKey(userName, integration),
  ];

  for (const candidate of candidates) {
    const match = getCaseInsensitiveValue(vault, candidate);
    if (match) return match;
  }

  return null;
}

export function setUserAppSecret(vault: Vault, userName: string, integration: string, fields: Record<string, string>): void {
  const canonicalKey = getUserAppSecretKey(userName, integration);
  vault.set(canonicalKey, fields as any);

  const legacyKey = getCaseInsensitiveKey(vault, getLegacyUserAppSecretKey(userName, integration));
  if (legacyKey && legacyKey.toLowerCase() !== canonicalKey.toLowerCase()) {
    vault.delete(legacyKey);
  }
}

export function deleteUserAppSecret(vault: Vault, userName: string, integration: string): void {
  for (const candidate of [
    getUserAppSecretKey(userName, integration),
    getLegacyUserAppSecretKey(userName, integration),
  ]) {
    const existing = getCaseInsensitiveKey(vault, candidate);
    if (existing) vault.delete(existing);
  }
}

export function listUserAppSecrets(vault: Vault | null, userName: string): UserAppSecretSummary[] {
  if (!vault) return [];

  const slug = toUserSlug(userName);
  const integrations = new Map<string, UserAppSecretSummary>();

  for (const key of vault.list()) {
    const parsed = parseNewUserAppKey(key) || parseLegacyUserAppKey(key);
    if (!parsed || parsed.user !== slug) continue;

    const value = vault.get(key);
    const fields = value && typeof value === "object" ? Object.keys(value) : [key.split("/").pop() || "value"];

    if (!integrations.has(parsed.integration)) {
      integrations.set(parsed.integration, {
        integration: parsed.integration,
        fields,
      });
    }
  }

  return [...integrations.values()].sort((a, b) => a.integration.localeCompare(b.integration));
}
