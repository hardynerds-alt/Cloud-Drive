import { Router, type IRouter } from "express";
import fsp from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import { requireAuth } from "../middlewares/auth.js";
import { safePath, storageRoot } from "../lib/storage.js";
import { createShareLink, getShareLink, deleteExpiredLinks } from "../lib/sqlite.js";

const router: IRouter = Router();

router.post("/share", requireAuth, async (req, res): Promise<void> => {
  const { path: filePath, expiresAt } = req.body ?? {};

  if (!filePath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  try {
    const full = safePath(filePath);
    await fsp.access(full);
  } catch {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const token = uuidv4();
  const expiry = expiresAt ?? null;

  createShareLink(token, filePath, expiry);
  req.log.info({ token, path: filePath }, "Share link created");

  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0] ??
    `localhost:${process.env["PORT"] ?? 5000}`;
  const protocol = domain.includes("localhost") ? "http" : "https";

  res.status(201).json({
    token,
    url: `${protocol}://${domain}/api/share/${token}/download`,
    expiresAt: expiry,
  });
});

router.get("/share/:token", async (req, res): Promise<void> => {
  deleteExpiredLinks();

  const rawToken = req.params["token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const link = getShareLink(token);

  if (!link) {
    res.status(404).json({ error: "Share link not found or expired" });
    return;
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    res.status(404).json({ error: "Share link has expired" });
    return;
  }

  try {
    const full = safePath(link.file_path);
    const stat = await fsp.stat(full);
    const name = path.basename(full);
    const mimeType = mime.lookup(name) || null;

    res.json({
      token,
      filename: name,
      mimeType,
      size: stat.size,
      expiresAt: link.expires_at,
    });
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

router.get("/share/:token/download", async (req, res): Promise<void> => {
  deleteExpiredLinks();

  const rawToken = req.params["token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const link = getShareLink(token);

  if (!link) {
    res.status(404).json({ error: "Share link not found or expired" });
    return;
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    res.status(404).json({ error: "Share link has expired" });
    return;
  }

  try {
    const full = safePath(link.file_path);
    await fsp.access(full);
    res.sendFile(full);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

export default router;
