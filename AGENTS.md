# AGENTS.md

## Project Overview

"Projeto Quintal para Todos": a public form for student name, one or more weekdays, and a class time (18:40 or 19:10), stored in Netlify Database. Only Netlify Identity users with the `admin` role can view, search, delete, and export submissions. UI copy is in Brazilian Portuguese (`lang="pt-BR"`).

## Architecture

| Piece | Location | Notes |
| --- | --- | --- |
| DB schema | `db/schema.ts` | Single `entries` table (`id`, `name`, `weekdays`, `class_time`, `created_at`). |
| DB client | `db/index.ts` | `drizzle-orm/netlify-db`, connection is automatic. |
| Migrations | `netlify/database/migrations/` | Generated with `npx drizzle-kit generate --name <name>`. Never edit applied migrations; never run migrate/push. |
| Server functions | `src/lib/entries.functions.ts` | `submitName` (public, zod-validated), `getViewer`, and admin-only `listEntries` / `deleteEntry` guarded by the `requireAdmin` middleware. |
| Export helpers | `src/lib/export.ts` | Client-side CSV/TXT generation with UTF-8 BOM and formula-injection escaping. |
| Public form | `src/routes/index.tsx` | Collects name, selected weekdays, and class time. Also forwards Identity email links (`#invite_token`, `#recovery_token`, …) to `/admin`, because Identity emails link to the site root. |
| Admin area | `src/routes/admin.tsx` | Client-side state machine: loading → login / invite / recovery / forbidden / admin. |
| Theme | `src/styles.css`, fonts in `src/routes/__root.tsx` | Cool blue palette, Instrument Serif headings (`font-display`) + Manrope body. |

## Non-obvious decisions

- Authorization is enforced server-side in every admin server function (`getUser()` + `roles.includes('admin')`). The client screen state is only UX.
- Auth mutations (`login`, `logout`, `acceptInvite`, `updateUser`) run in the browser; the `nf_jwt` cookie then authenticates server-function calls.
- The first admin must be invited and given the `admin` role in the Netlify UI (Identity tab). There is no in-app signup.
- Export is done in the browser from the already-loaded list, so no separate download endpoint is needed.

## Conventions

- Import from `src` with `@/`; db imports use relative paths with `.js` extension.
- Use the theme variable classes (`bg-primary`, `text-muted-foreground`) instead of raw colors.
- Use existing shadcn components in `src/components/ui/`.
- Local dev with all Netlify features: `netlify dev`.
