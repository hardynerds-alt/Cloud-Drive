# Vault Storage

A self-hosted personal cloud storage and file manager — your own private Google Drive, running on Node.js with zero external cloud dependencies.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cloud-storage run dev` — run the frontend (port 18153)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: SQLite (`better-sqlite3`) for share link metadata
- File storage: `./storage/` folder (workspace root)
- Session auth: `express-session` (SESSION_SECRET env var)
- Security: `helmet`, `express-rate-limit`
- File uploads: `multer`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/storage.ts` — file system helpers
- `artifacts/api-server/src/lib/sqlite.ts` — SQLite share link store
- `artifacts/cloud-storage/src/` — React frontend
- `storage/` — file storage root (auto-created)
- `data/cloud.db` — SQLite database (auto-created)

## Architecture decisions

- Password-only auth (no username) — stored in `ADMIN_PASSWORD` secret
- SQLite chosen over PostgreSQL for lightweight operation on Termux/Android
- `better-sqlite3` (synchronous) for low-latency share link lookups
- Storage root resolved from `process.cwd()` to work in both dev and production
- File downloads use `res.sendFile()` / `res.download()` for streaming — no memory buffering
- Uploads use `XMLHttpRequest` on the frontend for progress tracking

## Product

- **Login**: Password-only login page
- **File Manager**: Browse, upload (drag & drop), download, rename, move, delete files and folders
- **Views**: Grid and list view toggle, search, sort by name/date/size
- **Previews**: Images, videos (mp4/webm/mkv), PDFs in-browser
- **Share Links**: Generate public URLs with optional expiry dates
- **Storage Stats**: Total files, folders, used space, largest files dashboard

## User preferences

- Username is always "admin" — password set via `ADMIN_PASSWORD` secret
- Storage root is `./storage/` at the workspace root
- SQLite database is at `./data/cloud.db`

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- `better-sqlite3` requires native builds — listed in `pnpm-workspace.yaml` `onlyBuiltDependencies`
- `trust proxy` is set to `1` in Express for rate-limiting to work behind Replit's proxy
- Session cookies use `secure: true` in production — ensure HTTPS

## REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | No | Login with password |
| POST | /api/auth/logout | No | Logout |
| GET | /api/auth/me | No | Get auth status |
| GET | /api/files | Yes | List directory contents |
| DELETE | /api/file | Yes | Delete file or folder |
| PATCH | /api/file | Yes | Rename or move |
| POST | /api/folders | Yes | Create folder |
| POST | /api/upload | Yes | Upload files (multipart) |
| GET | /api/download | Yes | Download file |
| GET | /api/preview | Yes | Preview file inline |
| POST | /api/share | Yes | Create share link |
| GET | /api/share/:token | No | Get share info |
| GET | /api/share/:token/download | No | Download via share link |
| GET | /api/storage/stats | Yes | Storage statistics |

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
