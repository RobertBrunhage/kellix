/**
 * Integration test for Steve's setup flow.
 * Tests that a fresh install correctly creates ~/.steve/ with all expected files.
 *
 * Run locally:  pnpm test
 * Run in Docker: docker build -t steve-test . && docker run --rm steve-test
 */

import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { strict as assert } from "node:assert";

const steveDir = join(homedir(), ".steve");

// Simulate a config so setup doesn't prompt for input
function seedConfig() {
  mkdirSync(steveDir, { recursive: true });
  writeFileSync(
    join(steveDir, "config.json"),
    JSON.stringify({
      telegram_bot_token: "test-token-123",
      allowed_user_ids: [12345],
      model: "sonnet",
    }),
    "utf-8",
  );
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log("\n━━━ Steve Setup Tests ━━━\n");

  // Clean slate
  execSync(`rm -rf ${steveDir}`);

  // Seed config to skip interactive prompts
  seedConfig();

  // Run setup by importing it
  const { runSetup } = await import("../src/setup.js");
  const result = await runSetup();

  test("setup returns true", () => {
    assert.equal(result, true);
  });

  test("~/.steve/ exists", () => {
    assert.ok(existsSync(steveDir));
  });

  test("config.json exists and is valid", () => {
    const configPath = join(steveDir, "config.json");
    assert.ok(existsSync(configPath));
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    assert.equal(config.telegram_bot_token, "test-token-123");
    assert.deepEqual(config.allowed_user_ids, [12345]);
    assert.equal(config.model, "sonnet");
  });

  test("persona.md copied", () => {
    assert.ok(existsSync(join(steveDir, "persona.md")));
    const content = readFileSync(join(steveDir, "persona.md"), "utf-8");
    assert.ok(content.includes("Steve"));
  });

  test("skills/ directory exists", () => {
    assert.ok(existsSync(join(steveDir, "skills")));
  });

  test("default skills copied", () => {
    const skills = readdirSync(join(steveDir, "skills"));
    assert.ok(skills.includes("training-coach"), "training-coach skill missing");
    assert.ok(skills.includes("reminders"), "reminders skill missing");
    assert.ok(skills.includes("TEMPLATE.md"), "TEMPLATE.md missing");
  });

  test("skill directories have SKILL.md", () => {
    assert.ok(
      existsSync(join(steveDir, "skills/training-coach/SKILL.md")),
      "training-coach/SKILL.md missing",
    );
    assert.ok(
      existsSync(join(steveDir, "skills/reminders/SKILL.md")),
      "reminders/SKILL.md missing",
    );
  });

  test("memory/ directory exists", () => {
    assert.ok(existsSync(join(steveDir, "memory")));
  });

  test("memory/shared/ directory exists", () => {
    assert.ok(existsSync(join(steveDir, "memory/shared")));
  });

  test("git repo initialized", () => {
    assert.ok(existsSync(join(steveDir, ".git")));
  });

  test(".gitignore contains tmp/", () => {
    const gitignore = readFileSync(join(steveDir, ".gitignore"), "utf-8");
    assert.ok(gitignore.includes("tmp/"));
  });

  // Summary
  console.log(`\n━━━ Results: ${passed} passed, ${failed} failed ━━━\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
