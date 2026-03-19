# Mozaika Game

A strategic 2-player dice-placement board game. Built with TanStack Start (React), Tailwind CSS 4, and shadcn/ui.

## Commands

- `npm run dev` — dev server on port 3000
- `npm run build` — production build
- `node scripts/generate-assets.mjs` — regenerate logo, favicon, OG image from SVGs

## Architecture

**Stack:** TanStack Start (React 19) + Nitro server + Tailwind CSS 4 + shadcn/ui + Appwrite TablesDB

**File structure:**
- `src/routes/` — file-based routing (TanStack Router)
  - `__root.tsx` — HTML shell, SEO meta, dark mode
  - `index.tsx` — homepage (create/join/split-screen)
  - `game.$lobbyId.tsx` — game page (lobby + playing + finished states)
- `src/lib/` — core game logic and server state
  - `game-types.ts` — all TypeScript types + `SIZE_RULES` config
  - `game-logic.ts` — pure functions: board generation, placement validation, cube generation
  - `game-state.ts` — async game operations, Appwrite TablesDB persistence (falls back to in-memory Map)
  - `game-functions.ts` — `createServerFn` wrappers (TanStack Start server RPCs)
  - `appwrite.ts` — Appwrite client setup (lazy-initialized)
- `src/components/` — UI components
  - `MozaikaBoard.tsx` — dynamic NxN board with color-coded cubes, rule indicators, valid placement highlights
  - `CubePool.tsx` — dice picker row
  - `ui/` — shadcn/ui components (Button, Card, Input, Select, Badge, InputOTP)
- `scripts/generate-assets.mjs` — sharp-based asset pipeline (SVG → PNG for logo, favicon, OG image)

## Server Functions API

All in `game-functions.ts`, using `createServerFn({ method: 'POST' }).inputValidator().handler()`:
- `createLobbyFn` — create game with boardSize + ruleCount
- `joinLobbyFn` — join by 6-digit numeric lobby code
- `setReadyFn` — ready up in lobby
- `placeCubeFn` — place a cube on the board
- `skipTurnFn` — skip turn
- `kickPlayerFn` — host kicks a player from lobby
- `leaveGameFn` — leave game (abandons if mid-game)
- `createSplitScreenFn` — create split-screen game (auto-starts)
- `getGameStateFn` — poll game state (750ms interval)

## Game Rules

- Board sizes: 3x3, 4x4, 5x5
- Rule counts per size: 3x3→[0,3,5,7], 4x4→[0,4,8,12], 5x5→[0,5,10,20]
- Cell rules (color or number) are generated respecting adjacency constraints
- Same numbers cannot be orthogonally adjacent
- Same colors cannot be orthogonally adjacent
- First cube must be on the edge
- Subsequent cubes must be adjacent (orthogonal or diagonal) to existing cubes
- Players alternate turns picking from a shared pool of 5 cubes
- If both players skip consecutively, cubes are refreshed
- First to fill the board wins

## Appwrite Integration

Env vars (server-side only, no VITE_ prefix):
```
APPWRITE_ENDPOINT=https://your-region.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...        # scopes: rows.read, rows.write
APPWRITE_DATABASE_ID=...
APPWRITE_TABLE_ID=...
```

Table schema: one string column `state` storing JSON-serialized GameState. Row ID = lobby code.
Without env vars, falls back to in-memory Map (dev mode).

## Design Conventions

- Mobile-first, max-w-sm container everywhere
- Dark mode only (`class="dark"` on html)
- Neutral grays (`neutral-*`), not blue-toned
- shadcn/ui components for forms/buttons/cards
- Destructive buttons use vibrant `red-600` (Geist-style)
- Board gallery with horizontal slide animation (both boards always rendered)
- Dice picker fixed at bottom of viewport with `position: fixed`
- Confetti on win (canvas-confetti)
- Split-screen auto-switches to active player's board after each turn

## TypeScript

- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `noUnusedLocals: true` / `noUnusedParameters: true` — no unused code
- Path alias: `#/*` → `./src/*`
