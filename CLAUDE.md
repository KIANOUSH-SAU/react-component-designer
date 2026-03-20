# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator. Users describe components in a chat interface, Claude generates code via tool calls, and the result renders in a live preview iframe. Components live in a virtual file system (never written to disk) and are persisted as serialized JSON in SQLite.

## Commands

```bash
npm run setup          # Install deps + generate Prisma client + run migrations
npm run dev            # Dev server with Turbopack (localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm test               # Vitest (jsdom environment)
npx vitest run src/components/__tests__/FileTree.test.tsx  # Run single test
npm run db:reset       # Reset database (destructive)
```

The dev server requires `node-compat.cjs` via NODE_OPTIONS.

## Architecture

### Core Data Flow

```
Chat input → POST /api/chat → Claude AI (or mock fallback) → tool calls
→ VirtualFileSystem modified in memory → UI updates via FileSystemContext
→ onFinish: serialize FS + messages → save to Prisma (SQLite)
```

### Key Abstractions

- **VirtualFileSystem** (`src/lib/file-system.ts`): In-memory tree-based file system. Serialized to JSON for DB storage, deserialized on project load. All file operations go through this class.

- **AI Tools** (`src/lib/tools/`): Two tools exposed to Claude:
  - `str_replace_editor`: create/view/edit files (view, create, str_replace, insert, undo_edit commands)
  - `file_manager`: rename/delete files and folders

- **JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Uses Babel standalone to transpile JSX/TSX in-browser. Creates import maps pointing to esm.sh CDN for third-party packages. Generates complete HTML for the preview iframe.

- **React Contexts**: `FileSystemContext` (manages FS state + tool call dispatch) and `ChatContext` (wraps Vercel AI SDK's `useChat()` hook).

### UI Layout

Split-pane layout using `react-resizable-panels`:
- **Left panel (35%)**: Chat interface (MessageList + MessageInput)
- **Right panel (65%)**: Tabbed Preview (sandboxed iframe) / Code view (FileTree + Monaco Editor)

### Authentication

JWT-based auth with HTTP-only cookies (`src/lib/auth.ts`). Uses `jose` for tokens, `bcrypt` for passwords. The `server-only` directive prevents client import. Anonymous users can try the app; their work is tracked in sessionStorage (`src/lib/anon-work-tracker.ts`).

### Data Model

- **User**: email, hashed password, projects relation
- **Project**: name, userId (nullable for anon), messages (JSON string), data (serialized VirtualFileSystem)

### API & Server Actions

- **API route**: `src/app/api/chat/route.ts` — streaming chat endpoint using Vercel AI SDK with Anthropic provider (falls back to mock when no API key)
- **Server Actions**: `src/actions/index.ts` — auth (signUp/signIn/signOut), project CRUD (getProjects/getProject/createProject)
- **System prompt**: `src/lib/prompts/generation.tsx` — instructs Claude to create React components with `/App.jsx` as entry point

### Routing

- `/` — Home page: redirects authenticated users to latest project, shows anonymous playground otherwise
- `/[projectId]` — Project page: requires auth, loads project data from DB
- Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes

## Tech Stack

- Next.js 15 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 with shadcn/ui components (Radix UI primitives, `components.json` configured)
- Prisma with SQLite (`prisma/schema.prisma`)
- Vercel AI SDK (`ai` package) + `@ai-sdk/anthropic`
- Monaco Editor for code editing, Babel standalone for JSX transpilation
- Vitest + Testing Library + jsdom for tests

## Environment Variables

- `ANTHROPIC_API_KEY` — Optional; without it, the app returns static mock responses
- `JWT_SECRET` — Optional; falls back to `"development-secret-key"` in dev
- `DATABASE_URL` — SQLite path (default: `prisma/dev.db`)

## Import Aliases

`@/` maps to `src/` (configured in `tsconfig.json` and `vitest.config.mts` via `vite-tsconfig-paths`).
