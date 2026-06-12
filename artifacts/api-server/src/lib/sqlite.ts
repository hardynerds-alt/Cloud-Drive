import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { workspaceRoot } from "./storage.js";

const dataDir = path.resolve(workspaceRoot, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, "cloud.db");
export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS share_links (
    token TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export function createShareLink(
  token: string,
  filePath: string,
  expiresAt: string | null
) {
  db.prepare(
    "INSERT INTO share_links (token, file_path, expires_at) VALUES (?, ?, ?)"
  ).run(token, filePath, expiresAt);
}

export function getShareLink(
  token: string
): { token: string; file_path: string; expires_at: string | null } | null {
  const row = db
    .prepare("SELECT * FROM share_links WHERE token = ?")
    .get(token) as
    | { token: string; file_path: string; expires_at: string | null }
    | undefined;
  return row ?? null;
}

export function deleteExpiredLinks() {
  db.prepare(
    "DELETE FROM share_links WHERE expires_at IS NOT NULL AND expires_at < datetime('now')"
  ).run();
}
