import { execSync } from "node:child_process";

const SERVICE_PREFIX = "steve-assistant";

function serviceKey(user: string, skill: string): string {
  return `${SERVICE_PREFIX}/${user}/${skill}`;
}

export function setCredential(
  user: string,
  skill: string,
  data: Record<string, string>,
): void {
  const service = serviceKey(user, skill);
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64");

  // Delete existing entry if present (security command fails on duplicate)
  try {
    execSync(
      `security delete-generic-password -s "${service}" 2>/dev/null`,
      { stdio: "ignore" },
    );
  } catch {
    // Doesn't exist yet, fine
  }

  execSync(
    `security add-generic-password -s "${service}" -a "${user}" -w "${encoded}" -U`,
    { stdio: "ignore" },
  );
}

export function getCredential(
  user: string,
  skill: string,
): Record<string, string> | null {
  const service = serviceKey(user, skill);
  try {
    const encoded = execSync(
      `security find-generic-password -s "${service}" -w 2>/dev/null`,
      { encoding: "utf-8" },
    ).trim();
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export function deleteCredential(user: string, skill: string): void {
  const service = serviceKey(user, skill);
  try {
    execSync(
      `security delete-generic-password -s "${service}" 2>/dev/null`,
      { stdio: "ignore" },
    );
  } catch {
    // Already gone
  }
}

export function hasCredential(user: string, skill: string): boolean {
  return getCredential(user, skill) !== null;
}
