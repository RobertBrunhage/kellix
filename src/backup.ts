import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import { encrypt } from "./vault/crypto.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  p.intro("Steve — Backup");

  const pw = await p.password({ message: "Backup password" });
  if (p.isCancel(pw)) { p.cancel("Cancelled."); process.exit(0); }

  const s = p.spinner();
  s.start("Creating backup");

  try {
    // Dump data volume to tar
    const dataTar = execSync(
      "docker run --rm -v steve_steve-data:/data alpine tar czf - -C /data .",
      { cwd: projectRoot, maxBuffer: 100 * 1024 * 1024 },
    );

    // Dump vault volume to tar
    const vaultTar = execSync(
      "docker run --rm -v steve_steve-vault:/vault alpine tar czf - -C /vault .",
      { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
    );

    // Bundle: JSON with base64-encoded tars
    const bundle = JSON.stringify({
      version: 1,
      date: new Date().toISOString(),
      data: dataTar.toString("base64"),
      vault: vaultTar.toString("base64"),
    });

    // Encrypt with password
    const encrypted = encrypt(bundle, pw);

    const date = new Date().toISOString().split("T")[0];
    const filename = `steve-backup-${date}.enc`;
    writeFileSync(filename, encrypted);

    s.stop(`Backup saved to ${filename}`);
    p.outro(`${(encrypted.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    s.stop("Backup failed");
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main().catch((err) => {
  p.log.error(String(err));
  process.exit(1);
});
