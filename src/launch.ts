import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import * as p from "@clack/prompts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function getHostIp(): string {
  try {
    // macOS — check common interfaces
    for (const iface of ["en0", "en1", "en2", "en3", "en4", "en5"]) {
      try {
        const ip = execSync(`ipconfig getifaddr ${iface} 2>/dev/null`, { encoding: "utf-8" }).trim();
        if (ip) return ip;
      } catch {}
    }
  } catch {}
  try {
    // Linux
    const ip = execSync("hostname -I 2>/dev/null", { encoding: "utf-8" }).trim().split(" ")[0];
    if (ip) return ip;
  } catch {}
  return "localhost";
}

function exec(cmd: string, quiet = false) {
  execSync(cmd, { stdio: quiet ? "ignore" : "inherit", cwd: projectRoot });
}

function generateCompose(userNames: string[]) {
  const basePath = join(projectRoot, "docker-compose.base.yml");
  if (!existsSync(basePath)) return;

  const base = readFileSync(basePath, "utf-8");

  const userServices = userNames.map((name) => `
  opencode-${name}:
    image: ghcr.io/anomalyco/opencode:latest
    container_name: opencode-${name}
    restart: unless-stopped
    command: ["serve", "--port", "3456", "--hostname", "0.0.0.0"]
    working_dir: /data
    volumes:
      - \${STEVE_DATA:-~/.steve}/users/${name}:/data
      - opencode-auth:/root/.local/share/opencode
    networks: [steve-net]`).join("\n");

  const composed = base.replace(
    /\nvolumes:/,
    `${userServices}\n\nvolumes:`,
  );

  writeFileSync(join(projectRoot, "docker-compose.yml"), composed, "utf-8");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForContainer(container: string): Promise<boolean> {
  for (let i = 0; i < 30; i++) {
    try {
      execSync(
        `docker compose exec ${container} wget -q -O /dev/null http://127.0.0.1:3456`,
        { cwd: projectRoot, stdio: "ignore" },
      );
      return true;
    } catch {
      await sleep(1000);
    }
  }
  return false;
}

function needsAuth(container: string): boolean {
  try {
    const out = execSync(`docker compose exec ${container} opencode auth list 2>&1`, {
      cwd: projectRoot,
      encoding: "utf-8",
    });
    return out.includes("0 credentials");
  } catch {
    return true;
  }
}

async function main() {
  p.intro("Steve");

  // Vault password
  let vaultKey = process.env.STEVE_VAULT_KEY;
  if (!vaultKey) {
    const pw = await p.password({ message: "Vault password" });
    if (p.isCancel(pw)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    vaultKey = pw;
  }

  process.env.STEVE_VAULT_KEY = vaultKey;
  process.env.STEVE_HOST_IP = getHostIp();

  // Discover users from the users.json manifest (written by setup.ts on each boot)
  const steveDir = process.env.STEVE_DIR || join(homedir(), ".steve");
  let userNames: string[] = [];

  // Try reading the user manifest from the host volume
  const usersManifest = join(steveDir, "users.json");
  if (existsSync(usersManifest)) {
    try {
      const data = JSON.parse(readFileSync(usersManifest, "utf-8"));
      userNames = (data.users || []).map((n: string) => n.toLowerCase());
    } catch {}
  }

  // If no manifest yet (first run), do a quick container run to generate it
  if (userNames.length === 0) {
    try {
      // Build first so we have the image
      execSync("docker compose -f docker-compose.base.yml build steve --quiet", { cwd: projectRoot, stdio: "ignore" });
      // Run setup briefly to create the manifest
      execSync(
        `docker compose -f docker-compose.base.yml run --rm --no-deps -e STEVE_VAULT_KEY="${vaultKey}" -e STEVE_DOCKER=1 steve node dist/index.js --setup-only 2>/dev/null || true`,
        { cwd: projectRoot, stdio: "ignore", timeout: 30000 },
      );
      // Try reading again
      if (existsSync(usersManifest)) {
        const data = JSON.parse(readFileSync(usersManifest, "utf-8"));
        userNames = (data.users || []).map((n: string) => n.toLowerCase());
      }
    } catch {}
  }

  // Generate docker-compose.yml with per-user OpenCode containers
  generateCompose(userNames);

  const s = p.spinner();
  s.start("Building");
  try {
    exec("docker compose build steve --quiet", true);
  } catch {
    s.stop("Build failed");
    process.exit(1);
  }
  s.stop("Built");

  // Start per-user OpenCode containers
  const containers = userNames.map((n) => `opencode-${n}`);
  if (containers.length > 0) {
    s.start(`Starting ${containers.length} OpenCode container(s)`);
    exec(`docker compose up -d ${containers.join(" ")}`, true);

    let allReady = true;
    for (const container of containers) {
      if (!(await waitForContainer(container))) {
        p.log.error(`${container} failed to start`);
        allReady = false;
      }
    }
    if (!allReady) {
      s.stop("Some OpenCode containers failed");
      p.log.error("Check logs: docker compose logs");
      process.exit(1);
    }
    s.stop(`${containers.length} OpenCode container(s) ready`);

    // Auth check — shared auth volume means checking one is enough
    if (needsAuth(containers[0])) {
      p.log.warn("OpenCode needs authentication.");
      exec(`docker compose exec ${containers[0]} opencode auth login`);
    }
  }

  // Start Steve (attached — Ctrl+C stops it)
  p.log.success("Starting Steve...");

  const steve = spawn("docker", ["compose", "up", "--no-log-prefix", "steve"], {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env,
  });

  const shutdown = () => {
    steve.kill();
    try {
      execSync("docker compose down", { cwd: projectRoot, stdio: "inherit" });
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  steve.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  p.log.error(String(err));
  process.exit(1);
});
