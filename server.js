'use strict';

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');
const sqlite3 = require('sqlite3').verbose();

const PORT = parseInt(process.env.PORT || '3000', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'cloud.db');

if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// SQLite
// ---------------------------------------------------------------------------

const db = new sqlite3.Database(DB_PATH);
db.serialize(function () {
  db.run(
    'CREATE TABLE IF NOT EXISTS shares (' +
      'token TEXT PRIMARY KEY,' +
      'file_path TEXT NOT NULL,' +
      'expires_at TEXT,' +
      'created_at TEXT NOT NULL' +
    ')'
  );
});

function dbGet(sql, params) {
  return new Promise(function (resolve, reject) {
    db.get(sql, params, function (err, row) {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbRun(sql, params) {
  return new Promise(function (resolve, reject) {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function safePath(userPath) {
  const normalized = path.normalize(userPath).replace(/^(\.\.[/\\])+/, '');
  const full = path.resolve(STORAGE_ROOT, normalized.replace(/^[/\\]/, ''));
  const rootWithSep = STORAGE_ROOT.endsWith(path.sep)
    ? STORAGE_ROOT
    : STORAGE_ROOT + path.sep;
  if (full !== STORAGE_ROOT && full.indexOf(rootWithSep) !== 0) {
    throw new Error('Path traversal detected');
  }
  return full;
}

function toRelativePath(absolutePath) {
  return '/' + path.relative(STORAGE_ROOT, absolutePath).replace(/\\/g, '/');
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function statToItem(fullPath, stat) {
  const name = path.basename(fullPath);
  const rel = toRelativePath(fullPath);
  const isDir = stat.isDirectory();
  return {
    name: name,
    path: rel,
    type: isDir ? 'folder' : 'file',
    size: isDir ? 0 : stat.size,
    sizeFormatted: isDir ? '\u2014' : formatSize(stat.size),
    modifiedAt: stat.mtime.toISOString(),
    mimeType: isDir ? null : (mime.lookup(name) || null),
  };
}

async function listDirectory(dirPath) {
  const full = safePath(dirPath);
  const entries = await fs.promises.readdir(full, { withFileTypes: true });
  const items = [];
  for (const entry of entries) {
    const entryPath = path.join(full, entry.name);
    try {
      const stat = await fs.promises.stat(entryPath);
      items.push(statToItem(entryPath, stat));
    } catch (e) {
      // skip unreadable entries
    }
  }
  items.sort(function (a, b) {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return items;
}

async function removeRecursive(fullPath) {
  const stat = await fs.promises.stat(fullPath);
  if (stat.isDirectory()) {
    const entries = await fs.promises.readdir(fullPath);
    for (const entry of entries) {
      await removeRecursive(path.join(fullPath, entry));
    }
    await fs.promises.rmdir(fullPath);
  } else {
    await fs.promises.unlink(fullPath);
  }
}

function getBreadcrumbs(dirPath) {
  const normalized = path.normalize(dirPath).replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const crumbs = [{ name: 'Home', path: '/' }];
  let current = '';
  for (const part of parts) {
    current += '/' + part;
    crumbs.push({ name: part, path: current });
  }
  return crumbs;
}

// ---------------------------------------------------------------------------
// Multer
// ---------------------------------------------------------------------------

const uploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = req.query.path || '/';
    let destDir;
    try {
      destDir = safePath(uploadPath);
    } catch (e) {
      destDir = STORAGE_ROOT;
    }
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    cb(null, destDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: uploadStorage });

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.post('/api/auth/login', function (req, res) {
  const body = req.body || {};
  const password = body.password;
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured' });
  }
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  req.session.authenticated = true;
  res.json({ authenticated: true });
});

app.post('/api/auth/logout', function (req, res) {
  req.session.destroy(function () {
    res.json({ authenticated: false });
  });
});

app.get('/api/auth/me', function (req, res) {
  const auth = !!(req.session && req.session.authenticated);
  res.json({ authenticated: auth });
});

// ---------------------------------------------------------------------------
// File routes
// ---------------------------------------------------------------------------

app.get('/api/files', requireAuth, async function (req, res) {
  const dirPath = req.query.path || '/';
  const search = req.query.search || '';
  try {
    let items = await listDirectory(dirPath);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(function (item) {
        return item.name.toLowerCase().indexOf(q) !== -1;
      });
    }
    res.json({ path: dirPath, items: items, breadcrumbs: getBreadcrumbs(dirPath) });
  } catch (err) {
    res.status(400).json({ error: 'Invalid path' });
  }
});

app.post('/api/upload', requireAuth, upload.array('files'), function (req, res) {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  res.json({ uploaded: files.length });
});

app.get('/api/download', requireAuth, function (req, res) {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  try {
    const full = safePath(filePath);
    res.download(full);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/api/preview', requireAuth, function (req, res) {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  try {
    const full = safePath(filePath);
    res.sendFile(full);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.delete('/api/file', requireAuth, async function (req, res) {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  try {
    const full = safePath(filePath);
    await removeRecursive(full);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Delete failed' });
  }
});

app.patch('/api/file', requireAuth, async function (req, res) {
  const body = req.body || {};
  const from = body.from;
  const to = body.to;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  try {
    const fromFull = safePath(from);
    const toFull = safePath(to);
    await fs.promises.rename(fromFull, toFull);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Rename failed' });
  }
});

app.post('/api/folders', requireAuth, async function (req, res) {
  const body = req.body || {};
  const folderPath = body.path;
  if (!folderPath) return res.status(400).json({ error: 'path required' });
  try {
    const full = safePath(folderPath);
    await fs.promises.mkdir(full, { recursive: true });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Create folder failed' });
  }
});

// ---------------------------------------------------------------------------
// Share routes
// ---------------------------------------------------------------------------

app.post('/api/share', requireAuth, async function (req, res) {
  const body = req.body || {};
  const filePath = body.path;
  const expiresAt = body.expiresAt || null;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  try {
    const full = safePath(filePath);
    await fs.promises.access(full);
  } catch (err) {
    return res.status(404).json({ error: 'File not found' });
  }
  const token = crypto.randomBytes(16).toString('hex');
  await dbRun(
    'INSERT INTO shares (token, file_path, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [token, filePath, expiresAt, new Date().toISOString()]
  );
  const domainsEnv = process.env.REPLIT_DOMAINS || '';
  const domain = domainsEnv.split(',')[0] || ('localhost:' + PORT);
  const protocol = domain.indexOf('localhost') !== -1 ? 'http' : 'https';
  res.status(201).json({
    token: token,
    url: protocol + '://' + domain + '/share/' + token,
  });
});

app.get('/share/:token', async function (req, res) {
  const token = req.params.token;
  try {
    const link = await dbGet('SELECT * FROM shares WHERE token = ?', [token]);
    if (!link) return res.status(404).send('Share link not found');
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).send('Share link has expired');
    }
    const full = safePath(link.file_path);
    res.sendFile(full);
  } catch (err) {
    res.status(404).send('File not found');
  }
});

// ---------------------------------------------------------------------------
// Storage stats
// ---------------------------------------------------------------------------

async function getStorageStats() {
  var totalFiles = 0;
  var totalFolders = 0;
  var totalSize = 0;
  var allFiles = [];

  async function walk(dir) {
    var entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        totalFolders++;
        await walk(fullPath);
      } else {
        try {
          var stat = await fs.promises.stat(fullPath);
          totalFiles++;
          totalSize += stat.size;
          allFiles.push(statToItem(fullPath, stat));
        } catch (e) {
          // skip
        }
      }
    }
  }

  await walk(STORAGE_ROOT);
  allFiles.sort(function (a, b) { return b.size - a.size; });
  return {
    totalFiles: totalFiles,
    totalFolders: totalFolders,
    totalSize: totalSize,
    largestFiles: allFiles.slice(0, 10),
  };
}

app.get('/api/storage/stats', requireAuth, async function (req, res) {
  try {
    var stats = await getStorageStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ---------------------------------------------------------------------------
// Catch-all: SPA fallback
// ---------------------------------------------------------------------------

app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, function () {
  console.log('Cloud Drive running on port ' + PORT);
  if (!ADMIN_PASSWORD) {
    console.warn('WARNING: ADMIN_PASSWORD environment variable is not set!');
  }
});
