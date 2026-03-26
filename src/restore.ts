import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import { decrypt } from "./vault/crypto.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const file = process.argv[2];
  if (!file) {
    p.log.error("Usage: pnpm restore <backup-file>");
    process.exit(1);
  }

  p.intro("Steve — Restore");

  const pw = await p.password({ message: "Backup password" });
  if (p.isCancel(pw)) { p.cancel("Cancelled."); process.exit(0); }

  const s = p.spinner();
  s.start("Restoring backup");

  try {
    // Read and decrypt
    const encrypted = readFileSync(file);
    const json = decrypt(encrypted, pw);
    const bundle = JSON.parse(json);

    if (bundle.version !== 1) {
      throw new Error(`Unsupported backup version: ${bundle.version}`);
    }

    const dataTar = Buffer.from(bundle.data, "base64");
    const vaultTar = Buffer.from(bundle.vault, "base64");

    // Ensure volumes exist
    execSync("docker volume create steve_steve-data", { cwd: projectRoot, stdio: "ignore" });
    execSync("docker volume create steve_steve-vault", { cwd: projectRoot, stdio: "ignore" });

    // Restore data volume
    execSync(
      "docker run --rm -i -v steve_steve-data:/data alpine tar xzf - -C /data",
      { cwd: projectRoot, input: dataTar, stdio: ["pipe", "ignore", "ignore"] },
    );

    // Restore vault volume
    execSync(
      "docker run --rm -i -v steve_steve-vault:/vault alpine tar xzf - -C /vault",
      { cwd: projectRoot, input: vaultTar, stdio: ["pipe", "ignore", "ignore"] },
    );

    s.stop("Restored");
    p.log.success(`Backup from ${bundle.date}`);
    p.outro("Run 'pnpm launch' to start Steve");
  } catch (err) {
    s.stop("Restore failed");
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main().catch((err) => {
  p.log.error(String(err));
  process.exit(1);
});
