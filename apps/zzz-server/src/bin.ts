#!/usr/bin/env node
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { startZZZServer } from "./server.ts";

function resolveDataDir(): string {
  return process.env.ZZZ_SERVER_DATA_DIR?.trim() || NodePath.join(NodeOS.homedir(), ".zzz-server");
}

function loadOrCreateToken(dataDir: string): {
  readonly token: string;
  readonly generated: boolean;
} {
  const fromEnv = process.env.ZZZ_SERVER_TOKEN?.trim();
  if (fromEnv) return { token: fromEnv, generated: false };
  NodeFS.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const tokenPath = NodePath.join(dataDir, "admin-token");
  if (NodeFS.existsSync(tokenPath)) {
    const existing = NodeFS.readFileSync(tokenPath, "utf8").trim();
    if (existing.length > 0) return { token: existing, generated: false };
  }
  const generated = NodeCrypto.randomBytes(32).toString("base64url");
  NodeFS.writeFileSync(tokenPath, `${generated}\n`, { mode: 0o600 });
  return { token: generated, generated: true };
}

const dataDir = resolveDataDir();
const host = process.env.ZZZ_SERVER_HOST?.trim() || "127.0.0.1";
const port = Number(process.env.ZZZ_SERVER_PORT || 8787);
const dbPath = NodePath.join(dataDir, "zzz-server.sqlite");
const { token, generated } = loadOrCreateToken(dataDir);

const running = await startZZZServer({ host, port, token, dbPath });

console.log(`[zzz-server] listening on http://${running.host}:${running.port}`);
console.log(`[zzz-server] database: ${dbPath}`);
if (generated) {
  console.log(
    `[zzz-server] generated admin token saved to ${NodePath.join(dataDir, "admin-token")}`,
  );
}

const shutdown = async () => {
  await running.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
