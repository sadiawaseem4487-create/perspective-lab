#!/usr/bin/env node
/**
 * Starts (or reuses) the FastAPI backend for Tauri desktop / desktop-dev.
 * Keeps the process alive so Tauri's beforeDevCommand stays running.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const backendDir = path.join(root, "backend");
const venvPython =
  process.platform === "win32"
    ? path.join(backendDir, ".venv", "Scripts", "python.exe")
    : path.join(backendDir, ".venv", "bin", "python");
const python = existsSync(venvPython) ? venvPython : process.platform === "win32" ? "python" : "python3";

const HEALTH = "http://127.0.0.1:8000/api/health";
const MAX_WAIT_MS = 90_000;

async function healthOk() {
  try {
    const res = await fetch(HEALTH);
    return res.ok || res.status === 503;
  } catch {
    return false;
  }
}

async function waitForHealth() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    if (await healthOk()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  if (await healthOk()) {
    console.log("[desktop] Backend already running on :8000");
    // Keep alive for Tauri beforeDevCommand
    setInterval(() => {}, 1 << 30);
    return;
  }

  console.log(`[desktop] Starting FastAPI with ${python}`);
  const child = spawn(
    python,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: backendDir,
      stdio: "inherit",
      env: { ...process.env },
    }
  );

  child.on("exit", (code) => {
    console.error(`[desktop] Backend exited with code ${code}`);
    process.exit(code ?? 1);
  });

  const ok = await waitForHealth();
  if (!ok) {
    console.error("[desktop] Backend did not become healthy in time");
    child.kill();
    process.exit(1);
  }
  console.log("[desktop] Backend ready at http://127.0.0.1:8000");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
