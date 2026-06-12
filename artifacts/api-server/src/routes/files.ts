import { Router, type IRouter } from "express";
import fsp from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.js";
import {
  safePath,
  storageRoot,
  listDirectory,
  getBreadcrumbs,
  statToFileItem,
  ensureStorageRoot,
} from "../lib/storage.js";

const router: IRouter = Router();

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const uploadPath = (req.query["path"] as string) ?? "/";
    let destDir: string;
    try {
      destDir = safePath(uploadPath);
    } catch {
      destDir = storageRoot;
    }
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

router.get("/files", requireAuth, async (req, res): Promise<void> => {
  ensureStorageRoot();
  const dirPath = (req.query["path"] as string) ?? "/";
  const search = req.query["search"] as string | undefined;
  const sort = (req.query["sort"] as string) ?? "name";
  const order = (req.query["order"] as string) ?? "asc";

  try {
    const items = await listDirectory(dirPath, search, sort, order);
    const breadcrumbs = getBreadcrumbs(dirPath);
    res.json({ path: dirPath, items, breadcrumbs });
  } catch (err) {
    req.log.error({ err }, "Failed to list files");
    res.status(400).json({ error: "Invalid path" });
  }
});

router.delete("/file", requireAuth, async (req, res): Promise<void> => {
  const filePath = req.query["path"] as string;
  if (!filePath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  try {
    const full = safePath(filePath);
    await fsp.rm(full, { recursive: true, force: true });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete");
    res.status(400).json({ error: "Failed to delete" });
  }
});

router.patch("/file", requireAuth, async (req, res): Promise<void> => {
  const { from, to } = req.body ?? {};
  if (!from || !to) {
    res.status(400).json({ error: "from and to are required" });
    return;
  }

  try {
    const fromFull = safePath(from);
    const toFull = safePath(to);
    await fsp.rename(fromFull, toFull);
    res.json({ success: true, message: "Moved successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to move file");
    res.status(400).json({ error: "Failed to move file" });
  }
});

router.post("/folders", requireAuth, async (req, res): Promise<void> => {
  const { path: folderPath } = req.body ?? {};
  if (!folderPath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  try {
    const full = safePath(folderPath);
    await fsp.mkdir(full, { recursive: true });
    res.status(201).json({ success: true, message: "Folder created" });
  } catch (err) {
    req.log.error({ err }, "Failed to create folder");
    res.status(400).json({ error: "Failed to create folder" });
  }
});

router.post(
  "/upload",
  requireAuth,
  upload.array("files"),
  async (req, res): Promise<void> => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    try {
      const uploadPath = (req.query["path"] as string) ?? "/";
      const fileItems = await Promise.all(
        files.map(async (f) => {
          const stat = await fsp.stat(f.path);
          return statToFileItem(f.path, stat);
        })
      );
      req.log.info({ count: files.length, path: uploadPath }, "Files uploaded");
      res.json({ uploaded: files.length, files: fileItems });
    } catch (err) {
      req.log.error({ err }, "Upload processing failed");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

router.get("/download", requireAuth, async (req, res): Promise<void> => {
  const filePath = req.query["path"] as string;
  if (!filePath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  try {
    const full = safePath(filePath);
    const stat = await fsp.stat(full);
    if (stat.isDirectory()) {
      res.status(400).json({ error: "Cannot download a directory" });
      return;
    }
    res.download(full);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

router.get("/preview", requireAuth, async (req, res): Promise<void> => {
  const filePath = req.query["path"] as string;
  if (!filePath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  try {
    const full = safePath(filePath);
    const stat = await fsp.stat(full);
    if (stat.isDirectory()) {
      res.status(400).json({ error: "Cannot preview a directory" });
      return;
    }
    res.sendFile(full);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

export default router;
