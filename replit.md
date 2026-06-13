# Cloud Drive

A self-hosted personal cloud storage and file manager compatible with Node.js 12, npm 6, and Android 6 Termux.

## Run & Operate

```
npm install
npm start
```

The server runs on `PORT` (default 3000).

## Stack

- Single-package Express.js 4 (no workspaces, no TypeScript, no build step)
- Node.js 12+ compatible
- Frontend: server-side rendered HTML + vanilla JS + inline CSS
- Auth: `express-session` (password-only via `ADMIN_PASSWORD` env var)
- Uploads: `multer` (disk storage, streamed — minimal RAM)
- File types: `mime-types`
- Share links: `sqlite3` (async callbacks, stored in `./data/cloud.db`)
- File storage: `./storage/` folder

## Project structure

```
server.js          — Express app (all routes + logic)
public/index.html  — Complete file manager UI (vanilla JS + CSS)
storage/           — File storage root (auto-created)
data/cloud.db      — SQLite share link database (auto-created)
package.json       — Single-package npm manifest
```

## Environment variables

| Variable         | Required | Description                    |
|------------------|----------|--------------------------------|
| `ADMIN_PASSWORD` | Yes      | Login password                 |
| `SESSION_SECRET` | No       | Session signing key (auto-gen) |
| `PORT`           | No       | Server port (default 3000)     |

## Features

- Password-only login with session auth
- File browser: navigate folders, breadcrumb navigation
- Upload files (drag & drop + file picker) with XHR progress bar
- Download files
- Delete files and folders (recursive)
- Rename / move files and folders
- Create folders
- Search files in current directory
- Sort by name, size, or date
- Preview: images (jpg/jpeg/png/gif/webp), video (mp4/webm), PDF
- Share links with optional expiry date (`/share/:token`)

## REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | No | Login with password |
| POST | /api/auth/logout | No | Logout |
| GET | /api/auth/me | No | Check auth status |
| GET | /api/files | Yes | List directory contents |
| DELETE | /api/file | Yes | Delete file or folder |
| PATCH | /api/file | Yes | Rename or move |
| POST | /api/folders | Yes | Create folder |
| POST | /api/upload | Yes | Upload files (multipart) |
| GET | /api/download | Yes | Download file |
| GET | /api/preview | Yes | Preview file inline |
| POST | /api/share | Yes | Create share link |
| GET | /share/:token | No | Download via share link |

## User preferences

- Password set via `ADMIN_PASSWORD` secret
- Storage root is `./storage/` at the project root
- SQLite database is at `./data/cloud.db`

## Gotchas

- `sqlite3` requires native compilation — install `python`, `make`, `gcc` in Termux before `npm install`
- `trust proxy` is set to `1` in Express for correct IP handling behind Replit's proxy
- File downloads and previews use `res.download()` / `res.sendFile()` for streaming — no memory buffering
- Uploads use `XMLHttpRequest` on the frontend for progress tracking
