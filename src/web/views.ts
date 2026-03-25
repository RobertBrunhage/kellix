import type { HealthStatus } from "../health.js";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const nav = `
  <nav class="flex gap-4 mb-8 border-b border-border pb-4">
    <a href="/" class="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</a>
    <a href="/secrets/list" class="text-sm text-zinc-400 hover:text-white transition-colors">Secrets</a>
  </nav>`;

const layout = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Steve - ${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            surface: { DEFAULT: '#111113', card: '#18181b', hover: '#1e1e22' },
            border: { DEFAULT: '#27272a', focus: '#3b82f6' },
          }
        }
      }
    }
  </script>
</head>
<body class="dark bg-surface text-zinc-300 min-h-screen">
  <div class="max-w-xl mx-auto px-4 py-8">
    ${body}
  </div>
</body>
</html>`;

function flash(message: string, type: "success" | "error" = "success"): string {
  const styles = type === "success"
    ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
    : "bg-red-950/50 border-red-800 text-red-300";
  return `<div class="border rounded-lg px-4 py-3 mb-6 text-sm ${styles}">${message}</div>`;
}

function fieldRows(fields: [string, string][]): string {
  return fields.map(([name, value], i) => `
    <div class="flex gap-2 items-center mt-2 group">
      <input type="text" name="field_name_${i}" value="${escapeHtml(name)}" placeholder="field name"
        class="flex-none w-36 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
      <input type="password" name="field_value_${i}" value="${escapeHtml(value)}" placeholder="value"
        class="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
      <button type="button" onclick="this.parentElement.remove()"
        class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity px-1 text-lg">&times;</button>
    </div>`).join("");
}

export function renderHome(health: HealthStatus, keys: string[], fieldCounts?: Record<string, string[]>): string {
  const dot = (status: string) => {
    const color = status === "ok" ? "bg-emerald-400" : status === "error" ? "bg-red-400" : "bg-zinc-500";
    return `<span class="inline-block w-2 h-2 rounded-full ${color}"></span>`;
  };

  const { components: c, uptime, healthy } = health;

  return layout("Dashboard", `
    ${nav}
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-white">Steve</h1>
      <span class="text-xs px-2.5 py-1 rounded-full ${healthy ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-red-950 text-red-300 border border-red-800"}">
        ${healthy ? "Healthy" : "Degraded"}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-8">
      ${Object.entries(c.opencode).map(([name, oc]) => `
      <div class="bg-surface-card border border-border rounded-lg p-4">
        <div class="flex items-center gap-2 mb-1">
          ${dot(oc.status)}
          <span class="text-xs text-zinc-400">OpenCode (${escapeHtml(name)})</span>
        </div>
        <p class="text-sm text-white">${oc.status === "ok" ? "Connected" : escapeHtml(oc.message || "Error")}</p>
      </div>`).join("")}

      <div class="bg-surface-card border border-border rounded-lg p-4">
        <div class="flex items-center gap-2 mb-1">
          ${dot(c.telegram.status)}
          <span class="text-xs text-zinc-400">Telegram</span>
        </div>
        <p class="text-sm text-white">${c.telegram.status === "ok" ? "Connected" : c.telegram.status === "not_configured" ? "Not configured" : escapeHtml(c.telegram.message || "Error")}</p>
      </div>

      <div class="bg-surface-card border border-border rounded-lg p-4">
        <div class="flex items-center gap-2 mb-1">
          ${dot(c.vault.status)}
          <span class="text-xs text-zinc-400">Vault</span>
        </div>
        <p class="text-sm text-white">${c.vault.secrets} secret${c.vault.secrets === 1 ? "" : "s"}</p>
      </div>

      <div class="bg-surface-card border border-border rounded-lg p-4">
        <div class="flex items-center gap-2 mb-1">
          ${dot(c.scheduler.status)}
          <span class="text-xs text-zinc-400">Scheduler</span>
        </div>
        <p class="text-sm text-white">${c.scheduler.reminders} reminder${c.scheduler.reminders === 1 ? "" : "s"}</p>
      </div>
    </div>

    <div class="text-xs text-zinc-600 text-center">Uptime: ${formatUptime(uptime)}</div>
  `);
}

export function renderDashboard(keys: string[], fieldCounts?: Record<string, string[]>, flashMsg?: string): string {
  const flashHtml = flashMsg ? flash(flashMsg) : "";
  const keysHtml = keys.length === 0
    ? `<p class="text-center text-zinc-600 py-12">No secrets yet</p>`
    : keys.map((key) => {
      const fields = fieldCounts?.[key];
      const fieldsHtml = fields
        ? `<span class="text-xs text-zinc-500">${fields.join(", ")}</span>`
        : "";
      return `
      <div class="bg-surface-card border border-border rounded-lg p-4 mb-3 hover:border-zinc-600 transition-colors">
        <div class="flex items-center justify-between">
          <div class="min-w-0">
            <p class="font-mono text-sm text-white truncate">${escapeHtml(key)}</p>
            ${fieldsHtml}
          </div>
          <div class="flex gap-2 ml-4 flex-shrink-0">
            <a href="/secrets/${encodeURIComponent(key)}/edit"
              class="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">Edit</a>
            <form method="POST" action="/secrets/${encodeURIComponent(key)}/delete" class="inline" onsubmit="return confirm('Delete ${escapeHtml(key)}?')">
              <button type="submit"
                class="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-red-900 hover:text-red-300 transition-colors">Delete</button>
            </form>
          </div>
        </div>
      </div>`;
    }).join("");

  return layout("Secrets", `
    ${nav}
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-xl font-semibold text-white">Secrets</h1>
      <a href="/secrets/new"
        class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors">Add Secret</a>
    </div>
    ${flashHtml}
    ${keysHtml}
  `);
}

export function renderNewForm(error?: string): string {
  const errorHtml = error ? flash(error, "error") : "";
  return layout("New Secret", `
    <a href="/" class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">&larr; Back</a>
    <h1 class="text-xl font-semibold text-white mt-4 mb-6">Add Secret</h1>
    ${errorHtml}
    <form method="POST" action="/secrets">
      <div>
        <label class="block text-sm text-zinc-400 mb-1">Name</label>
        <input type="text" id="key" name="key" placeholder="e.g. Robert/withings" required
          class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
        <p class="text-xs text-zinc-600 mt-1">Format: user/service or just service name</p>
      </div>

      <div class="mt-6">
        <label class="block text-sm text-zinc-400 mb-1">Fields</label>
        <div id="fields">
          <div class="flex gap-2 items-center mt-2 group">
            <input type="text" name="field_name_0" placeholder="e.g. client_id" required
              class="flex-none w-36 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
            <input type="password" name="field_value_0" placeholder="value" required
              class="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
            <button type="button" onclick="this.parentElement.remove()"
              class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity px-1 text-lg">&times;</button>
          </div>
          <div class="flex gap-2 items-center mt-2 group">
            <input type="text" name="field_name_1" placeholder="e.g. client_secret"
              class="flex-none w-36 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
            <input type="password" name="field_value_1" placeholder="value"
              class="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
            <button type="button" onclick="this.parentElement.remove()"
              class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity px-1 text-lg">&times;</button>
          </div>
        </div>
        <button type="button" onclick="addField()"
          class="mt-3 px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 transition-colors">+ Add field</button>
      </div>

      <div class="flex gap-3 mt-8">
        <button type="submit"
          class="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors">Save</button>
        <a href="/"
          class="px-5 py-2 text-sm rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">Cancel</a>
      </div>
    </form>
    <script>
      let fieldIdx = 2;
      function addField() {
        const row = document.createElement('div');
        row.className = 'flex gap-2 items-center mt-2 group';
        row.innerHTML = '<input type="text" name="field_name_' + fieldIdx + '" placeholder="field name" class="flex-none w-36 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">'
          + '<input type="password" name="field_value_' + fieldIdx + '" placeholder="value" class="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">'
          + '<button type="button" onclick="this.parentElement.remove()" class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity px-1 text-lg">&times;</button>';
        document.getElementById('fields').appendChild(row);
        fieldIdx++;
      }
    </script>
  `);
}

export function renderEditForm(key: string, fields: [string, string][], error?: string): string {
  const errorHtml = error ? flash(error, "error") : "";
  const nextIdx = fields.length;
  return layout("Edit Secret", `
    <a href="/" class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">&larr; Back</a>
    <h1 class="text-xl font-semibold text-white mt-4 mb-6">Edit: <code class="text-blue-400">${escapeHtml(key)}</code></h1>
    ${errorHtml}
    <form method="POST" action="/secrets/${encodeURIComponent(key)}">
      <div>
        <label class="block text-sm text-zinc-400 mb-1">Fields</label>
        <div id="fields">
          ${fieldRows(fields)}
        </div>
        <button type="button" onclick="addField()"
          class="mt-3 px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 transition-colors">+ Add field</button>
      </div>

      <div class="flex gap-3 mt-8">
        <button type="submit"
          class="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors">Save</button>
        <a href="/"
          class="px-5 py-2 text-sm rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">Cancel</a>
      </div>
    </form>
    <script>
      let fieldIdx = ${nextIdx};
      function addField() {
        const row = document.createElement('div');
        row.className = 'flex gap-2 items-center mt-2 group';
        row.innerHTML = '<input type="text" name="field_name_' + fieldIdx + '" placeholder="field name" class="flex-none w-36 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">'
          + '<input type="password" name="field_value_' + fieldIdx + '" placeholder="value" class="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">'
          + '<button type="button" onclick="this.parentElement.remove()" class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity px-1 text-lg">&times;</button>';
        document.getElementById('fields').appendChild(row);
        fieldIdx++;
      }
    </script>
  `);
}

export function renderSetup(error?: string): string {
  const errorHtml = error ? flash(error, "error") : "";
  return layout("Setup", `
    <div class="text-center mb-8">
      <h1 class="text-2xl font-semibold text-white">Steve</h1>
      <p class="text-sm text-zinc-500 mt-1">First-time setup</p>
    </div>
    ${errorHtml}
    <form method="POST" action="/setup" class="space-y-6">
      <div>
        <label class="block text-sm text-zinc-400 mb-1">Telegram Bot Token</label>
        <input type="password" name="bot_token" placeholder="paste from @BotFather" required
          class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
        <p class="text-xs text-zinc-600 mt-1">Message @BotFather on Telegram, send /newbot</p>
      </div>

      <div>
        <label class="block text-sm text-zinc-400 mb-1">Users</label>
        <textarea name="users" placeholder="8173486539:Robert&#10;8422682615:Vanessa" required
          class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none h-20 resize-none"></textarea>
        <p class="text-xs text-zinc-600 mt-1">One per line, format: telegram_id:Name. Get your ID from @userinfobot</p>
      </div>

      <div>
        <label class="block text-sm text-zinc-400 mb-1">Model</label>
        <input type="text" name="model" value="openai/gpt-5.2" required
          class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
      </div>

      <button type="submit"
        class="w-full py-2.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium">Save and Start</button>
    </form>
  `);
}

export function renderLogin(error?: string): string {
  const errorHtml = error ? flash(error, "error") : "";
  return layout("Login", `
    <div class="text-center mb-8">
      <h1 class="text-2xl font-semibold text-white">Steve</h1>
      <p class="text-sm text-zinc-500 mt-1">Enter your vault password</p>
    </div>
    ${errorHtml}
    <form method="POST" action="/login">
      <div>
        <input type="password" name="password" placeholder="Vault password" autofocus required
          class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-white font-mono placeholder-zinc-600 focus:border-border-focus focus:outline-none">
      </div>
      <button type="submit"
        class="w-full mt-4 py-2.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium">Unlock</button>
    </form>
  `);
}
