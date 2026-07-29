# R2 Attachments — System Design

**Date:** 2026-07-29
**Slice:** 19 (implementation-plan-p1.md)
**Branch:** `feat/attachments`
**Status:** Ready for implementation

## Overview

Proxied file upload through the Hono API Worker to R2, with MIME-type allowlist and size validation. Files are stored in the `paragon-attachments` R2 bucket; metadata (filename, content_type, size, r2_key) is stored in D1 `attachments` table.

## Architecture

```
Frontend                     Worker (Hono)                    R2 / D1
   │                              │                              │
   ├─ POST /api/attachments ──────┤                              │
   │  (multipart: file,            │                              │
   │   workspace_id, widget_id)    │                              │
   │                              ├─ validate MIME (allowlist)    │
   │                              ├─ validate size (25 MB max)   │
   │                              ├─ getOwnedWorkspaceById()     │
   │                              ├─ generate R2 key             │
   │                              ├─ R2.put(key, bytes) ────────►│
   │                              ├─ INSERT D1 pointer row ─────►│
   │◄──── 201 { id, filename, ... }─┤                              │
   │                              │                              │
   ├─ GET /api/attachments/:id ───┤                              │
   │                              ├─ getOwnedAttachment()        │
   │                              ├─ R2.get(r2_key) ────────────►│
   │◄──── 200 stream (Content-Type, Content-Disposition: inline)  │
   │                              │                              │
   ├─ GET /api/attachments? ──────┤                              │
   │  workspace_id=&widget_id=    ├─ getOwnedWorkspaceById()     │
   │                              ├─ SELECT ... FROM attachments─►│
   │◄──── 200 { attachments: [...] }                              │
```

## Data Model

### D1: `attachments` table (migration 0017)

| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | PRIMARY KEY |
| `workspace_id` | TEXT | NOT NULL, REFERENCES workspaces(id) ON DELETE CASCADE |
| `widget_id` | TEXT | NOT NULL (soft reference, no FK) |
| `r2_key` | TEXT | NOT NULL, UNIQUE |
| `filename` | TEXT | NOT NULL |
| `content_type` | TEXT | NOT NULL |
| `size_bytes` | INTEGER | NOT NULL |
| `created_at` | TEXT | NOT NULL |

Index: `idx_attachments_workspace_id` on `workspace_id`.

### R2: Object key format

```
{system_id}/{widget_id}/{uuid}.{ext}
```

Example: `sys_abc123/w_counter1/a1b2c3d4-.../notes.pdf`

## API Routes

### `POST /api/attachments`

- Content-Type: `multipart/form-data`
- Fields: `file` (binary), `workspace_id`, `widget_id`
- Validates: MIME against allowlist (13 types), size ≤ 25 MB
- Ownership: workspace ownership via `getOwnedWorkspaceById()`
- Write order: R2 first, then D1; orphan log on D1 failure
- Response 201: attachment metadata JSON
- Error 400: `unsupported_file_type` or `file_too_large`
- Error 404: workspace not found / not owned

### `GET /api/attachments/:id`

- Ownership: via `getOwnedAttachment()` (join through `workspaces → systems`)
- Streams R2 object with `Content-Type` from stored `content_type`
- Response 200: binary stream with `Content-Disposition: inline`
- Error 404: not found / not owned

### `GET /api/attachments?workspace_id=&widget_id=`

- Ownership: workspace ownership via `getOwnedWorkspaceById()`
- Returns metadata array (no R2 data)
- Response 200: `{ "attachments": [{ id, filename, content_type, size_bytes, created_at }] }`
- Error 400: missing query params

## Validation Rules

Source of truth: `security-review.md` §2, mirrored in `lib/attachments.ts`.

### MIME Allowlist (13 types)

```
application/pdf
image/jpeg, image/png, image/webp
text/plain, text/csv
application/rtf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.ms-excel
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
application/vnd.ms-powerpoint
application/vnd.openxmlformats-officedocument.presentationml.presentation
```

### Size Limit

25 MB per file (`25 * 1024 * 1024` bytes).

## Error Handling

| Condition | Status | error code |
|---|---|---|
| Unsupported MIME type | 400 | `unsupported_file_type` |
| File exceeds 25 MB | 400 | `file_too_large` |
| Missing required field | 400 | `invalid_input` |
| Workspace not found / not owned | 404 | `not_found` |
| R2 write succeeds, D1 write fails | 500 | `internal_error` |

Orphan handling: if R2 `put()` succeeds but the subsequent D1 `INSERT` fails, the orphaned R2 key is logged via `console.error()` for manual cleanup. No automated cleanup in v1.

## Files

### Backend

| File | Purpose |
|---|---|
| `packages/api/migrations/0017_attachments.sql` | DDL for attachments table |
| `packages/api/src/lib/attachments.ts` | Shared MIME allowlist + size constant |
| `packages/api/src/lib/ownership.ts` | `getOwnedAttachment()` helper |
| `packages/api/src/routes/attachments.ts` | Three Hono route handlers |
| `packages/api/src/index.ts` | Route mount + import |
| `packages/api/vitest.config.ts` | Add R2 bucket to Miniflare |
| `packages/api/src/__tests__/attachments.spec.ts` | Integration tests |

### Frontend

| File | Purpose |
|---|---|
| `packages/web/src/lib/api/attachments.ts` | `uploadAttachment()`, `getAttachments()`, `getAttachmentUrl()` |
| `packages/web/src/lib/components/AttachmentUpload.svelte` | File input + upload button + existing attachment list |
| LogWidget.svelte | Integrate AttachmentUpload |
| LinkListWidget.svelte | Integrate AttachmentUpload |

### Docs

| File | Change |
|---|---|
| `docs/ADRs/001-tech-stack-adr.md` §5.7 | Presigned URL consideration added |
| `docs/reference/api-routes.md` §9 | Add GET list endpoint, fix 10 MB → 25 MB |
| `docs/reference/security-review.md` §2 | Already correct (25 MB) |
| `CHANGELOG.md` | Add Slice 19 entry |
| `docs/plans/implementation-plan-p1.md` | Mark Slice 19 complete |

## Future Considerations

### Presigned URLs (direct-to-R2 upload)

See ADR 001 §5.7 for the full analysis. Key points:
- Would avoid proxying file bytes through the Worker
- Requires `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` dependencies
- Requires CORS policy on the bucket and R2 API token env vars
- Multi-step flow (presign → upload → confirm) with pending/ready states
- Re-evaluate when large-file uploads become a bottleneck

### Virus scanning

Not implemented in v1. The "attacker" would need to be the account owner themselves. If multi-user is added, revisit.

### Automated orphan cleanup

Not implemented in v1. At personal-app scale with 10 GB free tier, orphaned objects from transient D1 failures are negligible.
