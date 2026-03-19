import { createServerFn } from '@tanstack/react-start'
import type { BoardSize } from './game-types'
import {
  createLobby,
  joinLobby,
  setReady,
  placeCube,
  skipTurn,
  kickPlayer,
  leaveGame,
  createSplitScreen,
  createSinglePlayer,
  getGameState,
} from './game-state'

export const createLobbyFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { playerName: string; boardSize: BoardSize; ruleCount: number }) => d,
  )
  .handler(async ({ data }) => {
    return await createLobby(data.playerName, data.boardSize, data.ruleCount)
  })

export const joinLobbyFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { lobbyId: string; playerName: string }) => d)
  .handler(async ({ data }) => {
    return await joinLobby(data.lobbyId, data.playerName)
  })

export const setReadyFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { lobbyId: string; playerId: string }) => d)
  .handler(async ({ data }) => {
    return await setReady(data.lobbyId, data.playerId)
  })

export const placeCubeFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      lobbyId: string
      playerId: string
      cubeIndex: number
      row: number
      col: number
    }) => d,
  )
  .handler(async ({ data }) => {
    return await placeCube(
      data.lobbyId,
      data.playerId,
      data.cubeIndex,
      data.row,
      data.col,
    )
  })

export const skipTurnFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { lobbyId: string; playerId: string }) => d)
  .handler(async ({ data }) => {
    return await skipTurn(data.lobbyId, data.playerId)
  })

export const kickPlayerFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { lobbyId: string; hostPlayerId: string; targetPlayerId: string }) =>
      d,
  )
  .handler(async ({ data }) => {
    return await kickPlayer(
      data.lobbyId,
      data.hostPlayerId,
      data.targetPlayerId,
    )
  })

export const leaveGameFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { lobbyId: string; playerId: string }) => d)
  .handler(async ({ data }) => {
    return await leaveGame(data.lobbyId, data.playerId)
  })

export const createSplitScreenFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      player1Name: string
      player2Name: string
      boardSize: BoardSize
      ruleCount: number
    }) => d,
  )
  .handler(async ({ data }) => {
    return await createSplitScreen(
      data.player1Name,
      data.player2Name,
      data.boardSize,
      data.ruleCount,
    )
  })

export const createSinglePlayerFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { playerName: string; boardSize: BoardSize; ruleCount: number }) => d,
  )
  .handler(async ({ data }) => {
    return await createSinglePlayer(
      data.playerName,
      data.boardSize,
      data.ruleCount,
    )
  })

export const getGameStateFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { lobbyId: string; playerId: string }) => d)
  .handler(async ({ data }) => {
    return await getGameState(data.lobbyId, data.playerId)
  })
