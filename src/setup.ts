import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  cpSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import * as p from "@clack/prompts";
import { steveDir, config } from "./config.js";
import { Vault } from "./vault/index.js";

// --- Helpers ---

function checkCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isGhAuthenticated(): boolean {
  try {
    execSync("gh auth status", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hasGitRemote(): boolean {
  try {
    execSync("git remote get-url origin", { cwd: steveDir, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// --- Setup steps ---

function createDirectories() {
  mkdirSync(steveDir, { recursive: true });
  mkdirSync(config.usersDir, { recursive: true });
  mkdirSync(config.sharedDir, { recursive: true });
}

/** Create per-user workspace with SOUL.md, AGENTS.md, skills/, memory/, reminders/ */
function setupUserWorkspace(userName: string) {
  const userDir = join(config.usersDir, userName.toLowerCase());
  mkdirSync(join(userDir, "memory"), { recursive: true });

  // Sync project-controlled files into user workspace
  for (const file of ["SOUL.md", "AGENTS.md"]) {
    const src = join(config.defaultsDir, file);
    if (existsSync(src)) {
      cpSync(src, join(userDir, file));
    }
  }

  // Sync skills
  const skillsSrc = config.defaultSkillsDir;
  const skillsDest = join(userDir, "skills");
  mkdirSync(skillsDest, { recursive: true });
  if (existsSync(skillsSrc)) {
    for (const entry of readdirSync(skillsSrc)) {
      cpSync(join(skillsSrc, entry), join(skillsDest, entry), { recursive: true });
    }
  }

  // Symlink shared directory if not already present
  const sharedLink = join(userDir, "shared");
  if (!existsSync(sharedLink)) {
    try {
      symlinkSync(config.sharedDir, sharedLink, "dir");
    } catch {
      // Symlinks may fail in some environments, copy instead
    }
  }
}

function syncDefaults(users: Record<string, string>) {
  for (const userName of Object.values(users)) {
    setupUserWorkspace(userName);
  }
}

function getLocalIp(): string {
  try {
    const nets = networkInterfaces();
    for (const iface of Object.values(nets)) {
      for (const net of iface || []) {
        if (net.family === "IPv4" && !net.internal) return net.address;
      }
    }
  } catch {}
  return "localhost";
}

/** Generate runtime config files that opencode needs in the data dir */
function generateRuntimeConfig(botToken: string, users: Record<string, string>, model: string) {
  const hostIp = getLocalIp();
  const secretManagerUrl = `http://${hostIp}:${config.webPort}`;

  // Per-user opencode configs
  const mcpHost = config.isDocker ? "steve" : "localhost";
  const mcpConfig = {
    type: "remote" as const,
    url: `http://${mcpHost}:${config.mcpPort}/mcp`,
    enabled: true,
  };

  const opencodeJson = JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    mcp: { telegram: mcpConfig },
  }, null, 2);

  const agentMd = `---
description: >-
  Steve is a personal household assistant. Use this agent for all conversations.
mode: primary
tools:
  task: false
  todowrite: false
  todoread: false
  webfetch: true
  skill: false
  bash: ${config.isDocker}
---
`;

  for (const userName of Object.values(users)) {
    const userDir = join(config.usersDir, userName.toLowerCase());
    mkdirSync(userDir, { recursive: true });

    writeFileSync(join(userDir, "opencode.json"), opencodeJson, "utf-8");

    const agentDir = join(userDir, ".opencode", "agents");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "steve.md"), agentMd, "utf-8");

    // Per-user .gitignore
    writeFileSync(
      join(userDir, ".gitignore"),
      "tmp/\nopencode.json\n.opencode/\nsessions.json\n",
      "utf-8",
    );
  }

  // Top-level gitignore
  writeFileSync(
    join(steveDir, ".gitignore"),
    "tmp/\nsessions.json\n",
    "utf-8",
  );
}

function initGitRepo(): boolean {
  if (existsSync(join(steveDir, ".git"))) return true;

  try {
    execSync("git init", { cwd: steveDir, stdio: "ignore" });
    execSync('git add -A && git commit -m "Initial Steve data"', {
      cwd: steveDir,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function createGitHubRepo(): "created" | "exists" | "skipped" | "failed" {
  if (hasGitRemote()) return "exists";
  if (!checkCommand("gh")) return "skipped";
  if (!isGhAuthenticated()) return "skipped";

  try {
    execSync(
      'gh repo create steve-data --private --source . --push --description "Steve personal assistant data"',
      { cwd: steveDir, stdio: ["pipe", "pipe", "pipe"] },
    );
    return "created";
  } catch (err: any) {
    if (err.stderr?.toString().includes("already exists")) {
      try {
        const username = execSync("gh api user -q .login", {
          encoding: "utf-8",
        }).trim();
        execSync(
          `git remote add origin https://github.com/${username}/steve-data.git`,
          { cwd: steveDir, stdio: "ignore" },
        );
        execSync("git push -u origin main", {
          cwd: steveDir,
          stdio: "ignore",
        });
        return "exists";
      } catch {
        return "failed";
      }
    }
    return "failed";
  }
}

// --- Vault + first-run setup ---

function readLineFromStdin(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.once("data", (chunk) => {
      data = chunk.toString().trim();
      resolve(data);
    });
    process.stdin.resume();
  });
}

async function getVaultPassword(): Promise<string> {
  // Check env var first (for unattended restarts)
  if (process.env.STEVE_VAULT_KEY) {
    return process.env.STEVE_VAULT_KEY;
  }

  // Use simple stdin if terminal is not interactive (Docker logs mode)
  if (!process.stdin.isTTY) {
    return readLineFromStdin("Vault password: ");
  }

  const password = await p.password({
    message: "Vault password",
  });

  if (p.isCancel(password)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return password as string;
}

// --- Main export ---

export interface SetupResult {
  vault: Vault;
  botToken: string;
  users: Record<string, string>;
  model: string;
  webServerStarted: boolean;
}

export async function runSetup(): Promise<SetupResult> {
  const vaultExists = existsSync(config.vaultPath);

  // Get vault password
  const vaultPassword = await getVaultPassword();

  let vault: Vault;

  if (!vaultExists) {
    // First run - create empty vault
    vault = new Vault(config.vaultPath, vaultPassword);
    console.log("New vault created.");
  } else {
    try {
      vault = new Vault(config.vaultPath, vaultPassword);
    } catch {
      console.error("Wrong vault password.");
      process.exit(1);
    }
  }

  // Check if we have required config in vault
  let botToken = vault.getString("telegram/bot_token");
  let users = vault.get("telegram/users") as Record<string, string> | null;
  let model = vault.getString("steve/model") || "openai/gpt-5.2";

  let webServerStarted = false;

  if (!botToken || !users || Object.keys(users).length === 0) {
    if (process.stdin.isTTY) {
      // Interactive first-run setup via clack prompts
      p.intro("Steve - Setup");

      p.log.step("Telegram setup");
      p.log.message(
        "You need a bot token and your user ID.\n" +
        "  1. Message @BotFather on Telegram, send /newbot\n" +
        "  2. Message @userinfobot to get your user ID",
      );

      const tokenInput = await p.text({
        message: "Bot token",
        placeholder: "paste from @BotFather",
        validate: (v) => (!v || v.length < 10 ? "That doesn't look right" : undefined),
      });
      if (p.isCancel(tokenInput)) { p.cancel("Setup cancelled."); process.exit(0); }
      botToken = tokenInput as string;
      vault.set("telegram/bot_token", botToken as any);

      users = {};
      let addMore = true;
      while (addMore) {
        const name = await p.text({
          message: "User name",
          placeholder: "e.g. Robert",
          validate: (v) => (!v ? "Name is required" : undefined),
        });
        if (p.isCancel(name)) { p.cancel("Setup cancelled."); process.exit(0); }

        const id = await p.text({
          message: `Telegram user ID for ${name}`,
          placeholder: "get it from @userinfobot",
          validate: (v) => (!v || isNaN(Number(v)) ? "Must be a number" : undefined),
        });
        if (p.isCancel(id)) { p.cancel("Setup cancelled."); process.exit(0); }

        users[id as string] = name as string;

        const more = await p.confirm({ message: "Add another user?" });
        if (p.isCancel(more)) { p.cancel("Setup cancelled."); process.exit(0); }
        addMore = more;
      }
      vault.set("telegram/users", users as any);

      const modelInput = await p.select({
        message: "Model",
        options: [
          { value: "openai/gpt-5.2", label: "GPT-5.2", hint: "recommended" },
          { value: "openai/gpt-5.2-codex", label: "GPT-5.2 Codex", hint: "cheaper output" },
          { value: "openai/gpt-5.3-codex-spark", label: "GPT-5.3 Codex Spark", hint: "latest" },
        ],
      });
      if (p.isCancel(modelInput)) { p.cancel("Setup cancelled."); process.exit(0); }
      model = modelInput as string;
      vault.set("steve/model", model as any);

      p.outro("Steve is ready!");
    } else {
      // Non-interactive: fall back to web UI setup
      console.log("");
      console.log("  Steve needs initial configuration.");
      console.log(`  Open http://localhost:${config.webPort}/setup to complete setup.`);
      console.log("");

      const { startWebServer } = await import("./web/index.js");
      startWebServer(vault, config.webPort);
      webServerStarted = true;

      while (!vault.has("telegram/bot_token") || !vault.has("telegram/users")) {
        await new Promise((r) => setTimeout(r, 2000));
      }

      botToken = vault.getString("telegram/bot_token")!;
      users = vault.get("telegram/users") as Record<string, string>;
      model = vault.getString("steve/model") || "openai/gpt-5.2";
      console.log("  Configuration complete!");
    }
  }

  // Ensure directories, defaults, and runtime config on every boot
  createDirectories();
  syncDefaults(users);
  generateRuntimeConfig(botToken, users, model);

  // Git setup (skip in Docker)
  if (!config.isDocker) {
    initGitRepo();
  }

  return { vault, botToken, users, model, webServerStarted };
}
