import type { GameState, BoardSize } from './game-types'
import { generateBoard, generateCubes, isValidPlacement } from './game-logic'
import {
  isAppwriteConfigured,
  getTablesDB,
  APPWRITE_DATABASE_ID,
  APPWRITE_TABLE_ID,
} from './appwrite'

// ─── Storage layer ───────────────────────────────────────────
// Falls back to in-memory Map when Appwrite env vars aren't set.

const memoryStore = new Map<string, GameState>()

async function loadGame(lobbyId: string): Promise<GameState | null> {
  if (isAppwriteConfigured) {
    try {
      const row = await getTablesDB().getRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: APPWRITE_TABLE_ID,
        rowId: lobbyId,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return JSON.parse((row as any).state) as GameState
    } catch {
      return null
    }
  }
  return memoryStore.get(lobbyId) ?? null
}

async function saveGame(game: GameState): Promise<void> {
  if (isAppwriteConfigured) {
    await getTablesDB().upsertRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_TABLE_ID,
      rowId: game.lobbyId,
      data: { state: JSON.stringify(game) },
    })
  } else {
    memoryStore.set(game.lobbyId, game)
  }
}

async function removeGame(lobbyId: string): Promise<void> {
  if (isAppwriteConfigured) {
    try {
      await getTablesDB().deleteRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: APPWRITE_TABLE_ID,
        rowId: lobbyId,
      })
    } catch {
      // Row may already be deleted
    }
  } else {
    memoryStore.delete(lobbyId)
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function generateLobbyId(): string {
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += Math.floor(Math.random() * 10).toString()
  }
  return id
}

function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// ─── Game operations ─────────────────────────────────────────

export async function createLobby(
  playerName: string,
  boardSize: BoardSize,
  ruleCount: number,
): Promise<{ lobbyId: string; playerId: string }> {
  const lobbyId = generateLobbyId()
  const playerId = generatePlayerId()

  const game: GameState = {
    lobbyId,
    hostId: playerId,
    status: 'waiting',
    boardSize,
    ruleCount,
    players: [
      {
        id: playerId,
        name: playerName,
        board: [],
        ready: false,
        placedCount: 0,
      },
    ],
    availableCubes: [],
    currentPlayerIndex: 0,
    winner: null,
    consecutiveSkips: 0,
  }

  await saveGame(game)
  return { lobbyId, playerId }
}

export async function joinLobby(
  lobbyId: string,
  playerName: string,
): Promise<{ playerId: string } | { error: string }> {
  const game = await loadGame(lobbyId)
  if (!game) return { error: 'Lobby not found' }
  if (game.status !== 'waiting') return { error: 'Game already started' }
  if (game.players.length >= 2) return { error: 'Lobby is full' }

  const playerId = generatePlayerId()
  game.players.push({
    id: playerId,
    name: playerName,
    board: [],
    ready: false,
    placedCount: 0,
  })

  await saveGame(game)
  return { playerId }
}

export async function setReady(
  lobbyId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const game = await loadGame(lobbyId)
  if (!game) return { error: 'Lobby not found' }

  const player = game.players.find((p) => p.id === playerId)
  if (!player) return { error: 'Player not found' }

  player.ready = true

  if (game.players.length === 2 && game.players.every((p) => p.ready)) {
    game.status = 'playing'
    game.availableCubes = generateCubes(5)
    game.currentPlayerIndex = 0
    for (const p of game.players) {
      p.board = generateBoard(game.boardSize, game.ruleCount)
    }
  }

  await saveGame(game)
  return {}
}

export async function placeCube(
  lobbyId: string,
  playerId: string,
  cubeIndex: number,
  row: number,
  col: number,
): Promise<{ error?: string }> {
  const game = await loadGame(lobbyId)
  if (!game) return { error: 'Lobby not found' }
  if (game.status !== 'playing') return { error: 'Game is not in progress' }

  const currentPlayer = game.players[game.currentPlayerIndex]
  if (currentPlayer.id !== playerId) return { error: 'Not your turn' }
  if (cubeIndex < 0 || cubeIndex >= game.availableCubes.length)
    return { error: 'Invalid cube' }

  const cube = game.availableCubes[cubeIndex]
  const validation = isValidPlacement(currentPlayer.board, row, col, cube)
  if (!validation.valid) return { error: validation.reason }

  currentPlayer.board[row][col].cube = cube
  currentPlayer.placedCount++

  game.availableCubes.splice(cubeIndex, 1)
  game.consecutiveSkips = 0

  const totalCells = game.boardSize * game.boardSize
  if (currentPlayer.placedCount === totalCells) {
    game.status = 'finished'
    game.winner = currentPlayer.id
    await saveGame(game)
    return {}
  }

  if (game.availableCubes.length === 0) {
    game.availableCubes = generateCubes(5)
  }

  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length
  await saveGame(game)
  return {}
}

export async function skipTurn(
  lobbyId: string,
  playerId: string,
  newCubes?: { value: number; color: string }[],
): Promise<{ error?: string }> {
  const game = await loadGame(lobbyId)
  if (!game) return { error: 'Lobby not found' }
  if (game.status !== 'playing') return { error: 'Game is not in progress' }

  const currentPlayer = game.players[game.currentPlayerIndex]
  if (currentPlayer.id !== playerId) return { error: 'Not your turn' }

  game.consecutiveSkips++

  if (game.consecutiveSkips >= game.players.length) {
    game.availableCubes = newCubes?.length ? newCubes as typeof game.availableCubes : generateCubes(5)
    game.consecutiveSkips = 0
  }

  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length
  await saveGame(game)
  return {}
}

export async function kickPlayer(
  lobbyId: string,
  hostPlayerId: string,
  targetPlayerId: string,
): Promise<{ error?: string }> {
  const game = await loadGame(lobbyId)
  if (!game) return { error: 'Lobby not found' }
  if (game.status !== 'waiting') return { error: 'Game already started' }
  if (game.hostId !== hostPlayerId) return { error: 'Only the host can kick' }
  if (hostPlayerId === targetPlayerId) return { error: 'Cannot kick yourself' }

  const target = game.players.find((p) => p.id === targetPlayerId)
  if (!target) return { error: 'Player not found' }

  game.players = game.players.filter((p) => p.id !== targetPlayerId)
  await saveGame(game)
  return {}
}

export async function leaveGame(
  lobbyId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const game = await loadGame(lobbyId)
  if (!game) return { error: 'Lobby not found' }

  const player = game.players.find((p) => p.id === playerId)
  if (!player) return { error: 'Player not found' }

  if (game.status === 'waiting') {
    game.players = game.players.filter((p) => p.id !== playerId)
    if (game.players.length === 0) {
      await removeGame(lobbyId)
      return {}
    }
    await saveGame(game)
  } else if (game.status === 'playing') {
    if (game.players.length === 1) {
      // Single player — just remove the game
      await removeGame(lobbyId)
      return {}
    }
    game.status = 'abandoned'
    const remaining = game.players.find((p) => p.id !== playerId)
    game.winner = remaining?.id ?? null
    await saveGame(game)
  }

  return {}
}

export async function createSplitScreen(
  player1Name: string,
  player2Name: string,
  boardSize: BoardSize,
  ruleCount: number,
): Promise<{ lobbyId: string; player1Id: string; player2Id: string }> {
  const lobbyId = generateLobbyId()
  const player1Id = generatePlayerId()
  const player2Id = generatePlayerId()

  const game: GameState = {
    lobbyId,
    hostId: player1Id,
    status: 'playing',
    boardSize,
    ruleCount,
    players: [
      {
        id: player1Id,
        name: player1Name,
        board: generateBoard(boardSize, ruleCount),
        ready: true,
        placedCount: 0,
      },
      {
        id: player2Id,
        name: player2Name,
        board: generateBoard(boardSize, ruleCount),
        ready: true,
        placedCount: 0,
      },
    ],
    availableCubes: generateCubes(5),
    currentPlayerIndex: 0,
    winner: null,
    consecutiveSkips: 0,
  }

  await saveGame(game)
  return { lobbyId, player1Id, player2Id }
}

export async function createSinglePlayer(
  playerName: string,
  boardSize: BoardSize,
  ruleCount: number,
): Promise<{ lobbyId: string; playerId: string }> {
  const lobbyId = generateLobbyId()
  const playerId = generatePlayerId()

  const game: GameState = {
    lobbyId,
    hostId: playerId,
    status: 'playing',
    boardSize,
    ruleCount,
    players: [
      {
        id: playerId,
        name: playerName,
        board: generateBoard(boardSize, ruleCount),
        ready: true,
        placedCount: 0,
      },
    ],
    availableCubes: generateCubes(5),
    currentPlayerIndex: 0,
    winner: null,
    consecutiveSkips: 0,
  }

  await saveGame(game)
  return { lobbyId, playerId }
}

export async function getGameState(
  lobbyId: string,
  playerId: string,
): Promise<GameState | { error: string }> {
  const game = await loadGame(lobbyId)
  if (!game) return { error: 'Lobby not found' }

  const player = game.players.find((p) => p.id === playerId)
  if (!player) return { error: 'Player not found in this lobby' }

  return game
}
