import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "output", "screenshots", "desktop");
const pnpmPath =
  "C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm.cmd";
const playwrightPath =
  "C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.js";
const require = createRequire(import.meta.url);
const { chromium } = require(playwrightPath);

const baseUrl = "http://localhost:3000";
const staticRoutes = [
  ["01-dashboard", "/"],
  ["03-admin-heroes", "/admin/heroes"],
  ["04-admin-patch-notes", "/admin/patch-notes"],
];

await mkdir(outDir, { recursive: true });

const server = spawn(pnpmPath, ["dev"], {
  cwd: rootDir,
  shell: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});

const logs = [];
server.stdout.on("data", (chunk) => logs.push(chunk.toString()));
server.stderr.on("data", (chunk) => logs.push(chunk.toString()));

async function waitForServer() {
  const started = Date.now();
  let lastError = null;

  while (Date.now() - started < 45000) {
    try {
      const response = await fetch(baseUrl);
      if (response.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error(
    `Next dev server did not become ready. ${lastError?.message ?? ""}`,
  );
}

async function main() {
  try {
    await waitForServer();
    const heroesResponse = await fetch(`${baseUrl}/api/heroes`);
    const heroesPayload = await heroesResponse.json();
    const heroWithHistory =
      heroesPayload.data
        ?.filter((hero) => hero.changeCount > 0)
        .sort((a, b) => b.changeCount - a.changeCount)[0]?.heroId ?? "ana";
    const routes = [
      staticRoutes[0],
      ["02-hero-detail", `/heroes/${encodeURIComponent(heroWithHistory)}`],
      ...staticRoutes.slice(1),
    ];

    const browser = await chromium.launch({
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    });
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 1024,
      },
      deviceScaleFactor: 1,
    });

    for (const [name, route] of routes) {
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page
        .waitForFunction(
          () => {
            const text = document.body?.innerText ?? "";
            return (
              !text.includes("읽는 중") &&
              !text.includes("불러오는 중") &&
              !text.includes("Loading")
            );
          },
          { timeout: 20000 },
        )
        .catch(() => undefined);
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: path.join(outDir, `${name}.png`),
        fullPage: true,
      });
    }

    await browser.close();
  } finally {
    if (server.pid) {
      spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
        stdio: "ignore",
      });
    } else {
      server.kill();
    }
    await writeFile(path.join(outDir, "capture-server.log"), logs.join(""));
  }
}

await main();
console.log(outDir);
