import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  cpSync,
} from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { steveDir, configPath, config } from "./config.js";

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function print(msg: string) {
  console.log(msg);
}

function success(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function warn(msg: string) {
  console.log(`  ! ${msg}`);
}

function fail(msg: string) {
  console.log(`  ✗ ${msg}`);
}

// --- Checks ---

function checkCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function checkPrerequisites(): { ok: boolean; missing: string[] } {
  const required = [
    { cmd: "git", install: "brew install git" },
    { cmd: "node", install: "brew install node" },
    { cmd: "claude", install: "See https://docs.anthropic.com/en/docs/claude-code" },
  ];

  const missing: string[] = [];
  for (const { cmd, install } of required) {
    if (checkCommand(cmd)) {
      success(`${cmd} found`);
    } else {
      fail(`${cmd} not found. Install with: ${install}`);
      missing.push(cmd);
    }
  }

  // Optional
  if (checkCommand("gh")) {
    success("GitHub CLI (gh) found");
  } else {
    warn("GitHub CLI (gh) not found - backup to GitHub won't be available");
    warn("Install later with: brew install gh");
  }

  return { ok: missing.length === 0, missing };
}

function isGhAuthenticated(): boolean {
  try {
    execSync("gh auth status", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// --- Setup steps ---

function createDirectories() {
  mkdirSync(steveDir, { recursive: true });
  mkdirSync(config.memoryDir, { recursive: true });
  mkdirSync(join(config.memoryDir, "shared"), { recursive: true });
  success("Created ~/.steve/ directories");
}

function copyDefaults() {
  // Persona
  const defaultPersona = join(config.projectRoot, "persona.md");
  const userPersona = join(steveDir, "persona.md");
  if (existsSync(defaultPersona) && !existsSync(userPersona)) {
    cpSync(defaultPersona, userPersona);
    success("Copied default persona");
  }

  // Skills
  const src = config.defaultSkillsDir;
  const dest = config.skillsDir;
  mkdirSync(dest, { recursive: true });

  if (existsSync(src)) {
    for (const entry of readdirSync(src)) {
      const destEntry = join(dest, entry);
      if (!existsSync(destEntry)) {
        cpSync(join(src, entry), destEntry, { recursive: true });
        success(`Copied skill: ${entry}`);
      }
    }
  }
}

function saveConfig(botToken: string, userIds: number[], model: string) {
  const data = {
    telegram_bot_token: botToken,
    allowed_user_ids: userIds,
    model,
  };
  writeFileSync(configPath, JSON.stringify(data, null, 2), "utf-8");
  success("Config saved");
}

function initGitRepo(): boolean {
  if (existsSync(join(steveDir, ".git"))) {
    success("Git repo already initialized");
    return true;
  }

  try {
    execSync("git init", { cwd: steveDir, stdio: "ignore" });
    writeFileSync(join(steveDir, ".gitignore"), "tmp/\n", "utf-8");
    execSync('git add -A && git commit -m "Initial Steve data"', {
      cwd: steveDir,
      stdio: "ignore",
    });
    success("Git repo initialized");
    return true;
  } catch {
    fail("Could not initialize git repo");
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

function createGitHubRepo(): boolean {
  if (hasGitRemote()) {
    success("GitHub remote already configured");
    return true;
  }

  if (!checkCommand("gh")) {
    warn("Skipping GitHub backup (gh not installed)");
    return false;
  }

  if (!isGhAuthenticated()) {
    warn("GitHub CLI not authenticated. Run: gh auth login");
    warn("You can set up backup later by running the setup again");
    return false;
  }

  try {
    execSync(
      'gh repo create steve-data --private --source . --push --description "Steve personal assistant data"',
      { cwd: steveDir, stdio: ["pipe", "pipe", "pipe"] },
    );
    success("Private GitHub repo created and pushed");
    return true;
  } catch (err: any) {
    if (err.stderr?.toString().includes("already exists")) {
      // Repo exists, try to connect to it
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
        success("Connected to existing GitHub repo");
        return true;
      } catch {
        warn("GitHub repo exists but couldn't connect. Set up manually later.");
        return false;
      }
    }
    warn("Could not create GitHub repo. You can set this up later.");
    return false;
  }
}

// --- Main flow ---

export async function runSetup(): Promise<boolean> {
  // Already configured - ensure everything is in place
  if (existsSync(configPath)) {
    try {
      const existing = JSON.parse(readFileSync(configPath, "utf-8"));
      if (existing.telegram_bot_token) {
        createDirectories();
        copyDefaults();
        initGitRepo();
        return true;
      }
    } catch {
      // Corrupt config, fall through to full setup
    }
  }

  print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  print("  Steve - Personal Assistant Setup");
  print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Step 1: Check prerequisites
  print("Checking prerequisites...\n");
  const { ok, missing } = checkPrerequisites();
  if (!ok) {
    print(`\nMissing required tools: ${missing.join(", ")}`);
    print("Install them and run setup again.\n");
    rl.close();
    return false;
  }

  // Step 2: Telegram setup
  print("\n─── Telegram Bot ───\n");
  print("You need a Telegram bot token and your user ID.");
  print("  1. Message @BotFather on Telegram, send /newbot");
  print("  2. Message @userinfobot to get your user ID\n");

  const botToken = await ask("Bot token: ");
  if (!botToken) {
    print("Bot token is required.\n");
    rl.close();
    return false;
  }

  const userIdsStr = await ask(
    "User ID(s) (comma-separated for multiple users): ",
  );
  const userIds = userIdsStr
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => id > 0);

  if (userIds.length === 0) {
    print("At least one user ID is required.\n");
    rl.close();
    return false;
  }

  // Step 3: Model choice
  print("\n─── AI Model ───\n");
  print("Which Claude model should Steve use?");
  print("  sonnet - Fast, cheap, good for most things (default)");
  print("  opus   - Smartest, slower, best for complex tasks");
  print("  haiku  - Fastest, cheapest, good for simple tasks\n");

  const model = (await ask("Model [sonnet]: ")) || "sonnet";

  rl.close();

  // Step 4: Create everything
  print("\n─── Setting up ~/.steve/ ───\n");

  createDirectories();
  saveConfig(botToken, userIds, model);
  copyDefaults();

  // Step 5: Git + GitHub
  print("\n─── Backup ───\n");

  const gitOk = initGitRepo();
  if (gitOk) {
    createGitHubRepo();
  }

  print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  print("  Steve is ready!");
  print("");
  print("  Data:   ~/.steve/");
  print("  Config: ~/.steve/config.json");
  print("  Skills: ~/.steve/skills/");
  if (hasGitRemote()) {
    print("  Backup: Auto-syncs to GitHub every 5 min");
  }
  print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  return true;
}
