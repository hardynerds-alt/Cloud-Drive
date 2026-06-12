import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";

export const workspaceRoot = process.cwd().endsWith(
  path.join("artifacts", "api-server")
)
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const storageRoot = path.resolve(workspaceRoot, "storage");

export function ensureStorageRoot() {
  if (!fs.existsSync(storageRoot)) {
    fs.mkdirSync(storageRoot, { recursive: true });
  }
}

export function safePath(userPath: string): string {
  const normalized = path.normalize(userPath).replace(/^(\.\.[/\\])+/, "");
  const full = path.resolve(storageRoot, normalized.replace(/^\//, ""));
  if (!full.startsWith(storageRoot)) {
    throw new Error("Path traversal detected");
  }
  return full;
}

export function toRelativePath(absolutePath: string): string {
  return "/" + path.relative(storageRoot, absolutePath).replace(/\\/g, "/");
}

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "folder";
  size: number;
  modifiedAt: string;
  mimeType: string | null;
}

export interface Breadcrumb {
  name: string;
  path: string;
}

export async function statToFileItem(
  fullPath: string,
  stat: fs.Stats
): Promise<FileItem> {
  const name = path.basename(fullPath);
  const rel = toRelativePath(fullPath);
  const isDir = stat.isDirectory();
  return {
    name,
    path: rel,
    type: isDir ? "folder" : "file",
    size: isDir ? 0 : stat.size,
    modifiedAt: stat.mtime.toISOString(),
    mimeType: isDir ? null : (mime.lookup(name) || null),
  };
}

export async function listDirectory(
  dirPath: string,
  search?: string,
  sort: string = "name",
  order: string = "asc"
): Promise<FileItem[]> {
  const full = safePath(dirPath);
  const entries = await fsp.readdir(full, { withFileTypes: true });

  let items: FileItem[] = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(full, entry.name);
      try {
        const stat = await fsp.stat(entryPath);
        return statToFileItem(entryPath, stat);
      } catch {
        return null;
      }
    })
  ).then((results) => results.filter((r): r is FileItem => r !== null));

  if (search) {
    const q = search.toLowerCase();
    items = items.filter((item) => item.name.toLowerCase().includes(q));
  }

  items.sort((a, b) => {
    // Folders first
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;

    let cmp = 0;
    if (sort === "size") {
      cmp = a.size - b.size;
    } else if (sort === "date") {
      cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
    } else {
      cmp = a.name.localeCompare(b.name);
    }
    return order === "desc" ? -cmp : cmp;
  });

  return items;
}

export function getBreadcrumbs(dirPath: string): Breadcrumb[] {
  const normalized = path.normalize(dirPath).replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const crumbs: Breadcrumb[] = [{ name: "Home", path: "/" }];
  let current = "";
  for (const part of parts) {
    current += "/" + part;
    crumbs.push({ name: part, path: current });
  }
  return crumbs;
}

export async function getStorageStats() {
  ensureStorageRoot();
  let totalFiles = 0;
  let totalFolders = 0;
  let totalSize = 0;
  const allFiles: FileItem[] = [];

  async function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        totalFolders++;
        await walk(fullPath);
      } else {
        try {
          const stat = await fsp.stat(fullPath);
          totalFiles++;
          totalSize += stat.size;
          allFiles.push(await statToFileItem(fullPath, stat));
        } catch {
          // skip
        }
      }
    }
  }

  await walk(storageRoot);

  const largestFiles = allFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  return { totalFiles, totalFolders, totalSize, largestFiles };
}
