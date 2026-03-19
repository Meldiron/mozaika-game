import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { GameState } from '#/lib/game-types'
import { generateCubes } from '#/lib/game-logic'
import {
  getGameStateFn,
  setReadyFn,
  placeCubeFn,
  skipTurnFn,
  leaveGameFn,
  kickPlayerFn,
} from '#/lib/game-functions'
import MozaikaBoard from '#/components/MozaikaBoard'
import CubePool from '#/components/CubePool'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/game/$lobbyId')({
  validateSearch: (search: Record<string, unknown>) => ({
    pid: (search.pid as string) || '',
    pid2: (search.pid2 as string) || '',
    split: (search.split as string) || '',
    single: (search.single as string) || '',
  }),
  component: GamePage,
})

function GamePage() {
  const { lobbyId } = Route.useParams()
  const { pid, pid2, split, single } = Route.useSearch()
  const isSplitScreen = split === 'true' && !!pid2
  const isSinglePlayer = single === 'true'
  const navigate = useNavigate()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedCubeIndex, setSelectedCubeIndex] = useState<number | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewingBoard, setViewingBoard] = useState(0) // 0 = my board, 1 = opponent
  const finishedRef = useRef(false)
  // Track in-flight optimistic updates so polls don't overwrite them
  const optimisticRef = useRef(0)

  // In split-screen, auto-switch to the active player's board after each turn
  useEffect(() => {
    if (!isSplitScreen || !gameState || gameState.status !== 'playing') return
    // Stable order: pid is always index 0, pid2 is always index 1
    const activeIdx = gameState.players[gameState.currentPlayerIndex]?.id === pid ? 0 : 1
    setViewingBoard(activeIdx)
  }, [isSplitScreen, pid, gameState?.currentPlayerIndex, gameState?.status])

  // On game end: fire confetti and switch to winner's board
  const confettiFired = useRef(false)
  useEffect(() => {
    if (!gameState || confettiFired.current) return
    if (gameState.status !== 'finished' && gameState.status !== 'abandoned') return
    confettiFired.current = true

    // Switch to winner's board
    if (gameState.winner) {
      const winnerIdx = gameState.winner === pid ? 0 : 1
      setViewingBoard(winnerIdx)
    }

    // Fire confetti
    const duration = 2500
    const end = Date.now() + duration
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [gameState?.status, gameState?.winner, pid])

  // In split-screen, the "active" player id is whoever's turn it is
  const activePlayerId =
    isSplitScreen && gameState?.status === 'playing'
      ? (gameState.players[gameState.currentPlayerIndex]?.id ?? pid)
      : pid

  useEffect(() => {
    let active = true
    let intervalId: ReturnType<typeof setInterval>

    const poll = async () => {
      if (finishedRef.current) return
      // Skip poll if we have an optimistic update in flight
      if (optimisticRef.current > 0) return
      try {
        const result = await getGameStateFn({
          data: { lobbyId, playerId: pid },
        })
        if (!active || optimisticRef.current > 0) return
        if ('error' in result) {
          setError(result.error)
        } else {
          setGameState(result as GameState)
          setError(null)
          const s = (result as GameState).status
          if (s === 'finished' || s === 'abandoned') {
            finishedRef.current = true
            clearInterval(intervalId)
          }
        }
      } catch {
        // network error
      }
      if (active) setLoading(false)
    }

    poll()
    intervalId = setInterval(poll, 750)
    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [lobbyId, pid])

  if (!pid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-sm text-center">
          <p className="mb-4 text-muted-foreground">
            Missing player ID. Please join from the home page.
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Go Home</Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto w-full max-w-sm text-center">
          <p className="mb-4 text-muted-foreground">
            {error || 'Game not found'}
          </p>
          <Button onClick={() => navigate({ to: '/' })}>Go Home</Button>
        </div>
      </div>
    )
  }

  const myPlayer = gameState.players.find((p) => p.id === activePlayerId)
  const isMyTurn =
    gameState.status === 'playing' &&
    gameState.players[gameState.currentPlayerIndex]?.id === activePlayerId
  const selectedCube =
    selectedCubeIndex !== null
      ? (gameState.availableCubes[selectedCubeIndex] ?? null)
      : null

  const handleCellClick = async (row: number, col: number) => {
    if (selectedCubeIndex === null || !isMyTurn || !gameState) return

    const prevState = gameState
    const cube = gameState.availableCubes[selectedCubeIndex]
    if (!cube) return

    // Build optimistic state
    const nextState = structuredClone(gameState)
    const currentPlayer = nextState.players[nextState.currentPlayerIndex]
    currentPlayer.board[row][col].cube = cube
    currentPlayer.placedCount++
    nextState.availableCubes.splice(selectedCubeIndex, 1)
    nextState.consecutiveSkips = 0

    const totalCells = nextState.boardSize * nextState.boardSize
    if (currentPlayer.placedCount === totalCells) {
      nextState.status = 'finished'
      nextState.winner = currentPlayer.id
    } else {
      if (nextState.availableCubes.length === 0) {
        nextState.availableCubes = generateCubes(5)
      }
      nextState.currentPlayerIndex =
        (nextState.currentPlayerIndex + 1) % nextState.players.length
    }

    // Apply optimistically
    setGameState(nextState)
    setSelectedCubeIndex(null)
    optimisticRef.current++

    // Fire server call in background
    try {
      const result = await placeCubeFn({
        data: {
          lobbyId,
          playerId: activePlayerId,
          cubeIndex: selectedCubeIndex,
          row,
          col,
        },
      })
      if (result.error) {
        // Rollback
        setGameState(prevState)
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      } else {
        // Fetch authoritative state (corrects any differences like random cubes)
        const fresh = await getGameStateFn({
          data: { lobbyId, playerId: pid },
        })
        if (!('error' in fresh)) setGameState(fresh as GameState)
      }
    } catch {
      setGameState(prevState)
      setError('Network error')
      setTimeout(() => setError(null), 3000)
    } finally {
      optimisticRef.current--
    }
  }

  const handleReady = async () => {
    const result = await setReadyFn({
      data: { lobbyId, playerId: pid },
    })
    if (result.error) setError(result.error)
  }

  const handleSkip = async () => {
    if (!gameState) return

    const prevState = gameState

    // Build optimistic state
    const nextState = structuredClone(gameState)
    nextState.consecutiveSkips++

    if (nextState.consecutiveSkips >= nextState.players.length) {
      nextState.availableCubes = generateCubes(5)
      nextState.consecutiveSkips = 0
    }

    nextState.currentPlayerIndex =
      (nextState.currentPlayerIndex + 1) % nextState.players.length

    // Apply optimistically
    setGameState(nextState)
    setSelectedCubeIndex(null)
    optimisticRef.current++

    try {
      const result = await skipTurnFn({
        data: { lobbyId, playerId: activePlayerId },
      })
      if (result.error) {
        setGameState(prevState)
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      }
      // No fresh fetch — optimistic state is good enough.
      // The poll will sync authoritative state on the next cycle.
    } catch {
      setGameState(prevState)
      setError('Network error')
      setTimeout(() => setError(null), 3000)
    } finally {
      optimisticRef.current--
    }
  }

  const handleLeave = async () => {
    await leaveGameFn({ data: { lobbyId, playerId: pid } })
    await navigate({ to: '/' })
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobbyId)
  }

  // ─── WAITING / LOBBY ───
  if (gameState.status === 'waiting') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="mx-auto w-full max-w-sm">
          <CardContent className="space-y-5">
            <button
              onClick={handleLeave}
              className="w-full text-center text-2xl font-bold transition hover:opacity-70"
            >
              Mozaika Game
            </button>

            <div className="text-center">
              <p className="mb-1 text-xs text-muted-foreground">
                Share this code with your opponent
              </p>
              <div className="w-full rounded-xl bg-secondary py-2.5 font-mono text-3xl font-bold tracking-widest">
                {lobbyId}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Size</p>
                <p className="font-mono text-lg font-bold">{gameState.boardSize}x{gameState.boardSize}</p>
              </div>
              <div className="flex-1 rounded-lg border px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rules</p>
                <p className="font-mono text-lg font-bold">{gameState.ruleCount}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">Players</p>
              {gameState.players.map((p) => {
                const isHost = p.id === gameState.hostId
                const isMe = p.id === pid
                const canKick = pid === gameState.hostId && !isMe
                return (
                  <div
                    key={p.id}
                    className="mb-1.5 flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {p.name}
                      {isMe && (
                        <span className="ml-1 text-muted-foreground">
                          (you)
                        </span>
                      )}
                      {isHost && (
                        <span className="ml-1 text-muted-foreground">
                          (host)
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={p.ready ? 'default' : 'secondary'}
                        className={
                          p.ready
                            ? 'bg-green-600 text-white'
                            : 'bg-yellow-600/20 text-yellow-500'
                        }
                      >
                        {p.ready ? 'Ready' : 'Not Ready'}
                      </Badge>
                      {canKick && (
                        <button
                          onClick={async () => {
                            await kickPlayerFn({
                              data: {
                                lobbyId,
                                hostPlayerId: pid,
                                targetPlayerId: p.id,
                              },
                            })
                          }}
                          className="rounded-md p-0.5 text-muted-foreground transition hover:bg-red-600/10 hover:text-red-500"
                          title="Kick player"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {gameState.players.length < 2 && (
                <div className="rounded-lg border border-dashed px-3 py-2 text-center text-sm text-muted-foreground">
                  Waiting for opponent...
                </div>
              )}
            </div>

            {myPlayer && !myPlayer.ready && (
              <Button
                onClick={handleReady}
                disabled={gameState.players.length < 2}
                className="w-full bg-green-600 hover:bg-green-500"
                size="lg"
              >
                {gameState.players.length < 2
                  ? 'Waiting for opponent...'
                  : 'Ready Up!'}
              </Button>
            )}
            {myPlayer?.ready && (
              <p className="text-center text-sm font-medium text-green-500">
                Waiting for opponent to ready up...
              </p>
            )}

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── PLAYING / FINISHED / ABANDONED ───
  const currentPlayerName =
    gameState.players[gameState.currentPlayerIndex]?.name
  const winnerName = gameState.players.find(
    (p) => p.id === gameState.winner,
  )?.name
  const isGameOver =
    gameState.status === 'finished' || gameState.status === 'abandoned'

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-sm px-4">
        {/* ── TOP: Status Bar ── */}
        <div className="pt-3 pb-2">
          <div className="flex items-center justify-between">
            <button
              onClick={handleLeave}
              className="text-lg font-bold transition hover:opacity-70"
            >
              Mozaika Game
            </button>
            {isSinglePlayer && gameState.players.length === 1 ? (
              <span className="font-mono text-xs text-foreground font-bold">
                {gameState.players[0].placedCount}
                <span className="text-muted-foreground">/{gameState.boardSize * gameState.boardSize}</span>
              </span>
            ) : gameState.players.length === 2 ? (() => {
              const p1 = gameState.players.find((p) =>
                isSplitScreen ? p.id === gameState.players[0].id : p.id === pid,
              )!
              const p2 = gameState.players.find((p) => p.id !== p1.id)!
              return (
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-foreground font-medium truncate max-w-16">
                    {isSplitScreen ? p1.name : 'You'}
                  </span>
                  <span className="text-foreground font-bold">{p1.placedCount}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-foreground font-bold">{p2.placedCount}</span>
                  <span className="text-muted-foreground truncate max-w-16">
                    {p2.name}
                  </span>
                </div>
              )
            })() : null}
          </div>

          {gameState.status === 'playing' && (
            <div
              className={cn(
                'mt-2 rounded-lg py-2 text-center text-sm font-semibold',
                isMyTurn
                  ? 'bg-green-600/20 text-green-500'
                  : 'bg-secondary text-muted-foreground',
              )}
            >
              {isSinglePlayer
                ? 'Your Turn'
                : isSplitScreen
                  ? `${currentPlayerName}'s Turn`
                  : isMyTurn
                    ? 'Your Turn'
                    : `${currentPlayerName}'s Turn`}
            </div>
          )}

          {isGameOver && (
            <div className="mt-2 space-y-2">
              <div
                className={cn(
                  'rounded-lg py-3 text-center text-lg font-bold',
                  isSinglePlayer
                    ? 'bg-green-600/20 text-green-500'
                    : gameState.status === 'abandoned'
                      ? gameState.winner === pid ||
                        gameState.winner === pid2
                        ? 'bg-green-600/20 text-green-500'
                        : 'bg-destructive/10 text-destructive'
                      : gameState.winner === pid ||
                          gameState.winner === pid2
                        ? 'bg-green-600/20 text-green-500'
                        : 'bg-destructive/10 text-destructive',
                )}
              >
                {gameState.status === 'abandoned'
                  ? 'Opponent left — You Win!'
                  : isSinglePlayer
                    ? 'Board Complete!'
                    : isSplitScreen
                      ? `${winnerName} Wins!`
                      : gameState.winner === pid
                        ? 'You Won!'
                        : `${winnerName} Won!`}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-2 rounded-lg bg-destructive/10 py-1.5 text-center text-xs text-destructive">
              {error}
            </p>
          )}

          {gameState.consecutiveSkips > 0 &&
            gameState.status === 'playing' && (
              <p className="mt-1.5 text-center text-xs text-yellow-500">
                {gameState.consecutiveSkips} skip — if both skip, cubes
                refresh
              </p>
            )}
        </div>

        {/* ── MIDDLE: Board Gallery ── */}
        <div className="flex flex-col items-center py-2">
          {(() => {
            // Stable order: pid player always index 0, other always index 1
            const first = gameState.players.find((p) => p.id === pid)
            const second = gameState.players.find((p) => p.id !== pid)
            const boards = [first, second].filter(Boolean)
            if (boards.length === 0) return null

            return (
              <div className="w-full">
                {/* Board with tall side arrows */}
                <div className="flex items-stretch gap-1">
                  {/* Left arrow */}
                  {boards.length > 1 && (
                    <button
                      onClick={() => setViewingBoard(0)}
                      disabled={viewingBoard === 0}
                      className={cn(
                        'flex w-7 shrink-0 items-center justify-center rounded-lg border transition',
                        viewingBoard === 0
                          ? 'border-border/50 text-muted-foreground/20'
                          : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {/* Sliding boards container */}
                  <div className="relative min-w-0 flex-1 overflow-hidden">
                    <div
                      className="flex transition-transform duration-300 ease-in-out"
                      style={{ transform: `translateX(-${viewingBoard * 100}%)` }}
                    >
                      {boards.map((player) => {
                        const isBoardMine = isSinglePlayer
                          ? true
                          : isSplitScreen
                            ? player!.id === activePlayerId
                            : player!.id === pid
                        const label = isSinglePlayer
                          ? player!.name
                          : isBoardMine
                            ? isSplitScreen
                              ? player!.name
                              : 'Your Board'
                            : player!.name
                        return (
                          <div
                            key={player!.id}
                            className="flex w-full shrink-0 flex-col items-center"
                          >
                            <div
                              className={cn(
                                'mb-2 flex w-full items-center justify-between rounded-md border px-3 py-1.5',
                                isBoardMine && gameState.status === 'playing' && 'border-green-600/40 bg-green-600/5',
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{label}</span>
                                {isBoardMine && gameState.status === 'playing' && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                )}
                              </div>
                              <span className="font-mono text-xs text-muted-foreground">
                                {player!.placedCount}
                                <span className="opacity-50">/{gameState.boardSize * gameState.boardSize}</span>
                              </span>
                            </div>
                            <MozaikaBoard
                              board={player!.board}
                              isMyBoard={isBoardMine}
                              isMyTurn={isMyTurn && isBoardMine}
                              selectedCube={isBoardMine ? selectedCube : null}
                              onCellClick={
                                isBoardMine ? handleCellClick : () => {}
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right arrow */}
                  {boards.length > 1 && (
                    <button
                      onClick={() => setViewingBoard(1)}
                      disabled={viewingBoard === 1}
                      className={cn(
                        'flex w-7 shrink-0 items-center justify-center rounded-lg border transition',
                        viewingBoard === 1
                          ? 'border-border/50 text-muted-foreground/20'
                          : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Dots indicator */}
                {boards.length > 1 && (
                  <div className="mt-2 flex justify-center gap-1.5">
                    {boards.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setViewingBoard(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          i === viewingBoard
                            ? 'w-4 bg-foreground'
                            : 'w-1.5 bg-muted-foreground/30',
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

        </div>

        {/* Spacer so content doesn't hide behind fixed dice pool */}
        {gameState.status === 'playing' && <div className="h-28" />}
      </div>

      {/* ── BOTTOM: Fixed Dice Pool ── */}
      {gameState.status === 'playing' && (
        <div className="fixed inset-x-0 bottom-0 z-10">
          <div className="mx-auto w-full max-w-sm px-4 pb-2 pt-1">
            <div className="rounded-xl border bg-card p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  {isMyTurn ? 'Pick a dice' : 'Waiting for opponent'}
                </p>
                {isMyTurn && (
                  <button
                    onClick={handleSkip}
                    className="rounded-md border border-red-600/40 px-2 py-0.5 text-[10px] font-medium text-red-500 transition hover:bg-red-600/10 hover:text-red-400"
                  >
                    Skip
                  </button>
                )}
              </div>
              <CubePool
                cubes={gameState.availableCubes}
                selectedIndex={selectedCubeIndex}
                onSelect={isMyTurn ? setSelectedCubeIndex : () => {}}
                disabled={!isMyTurn}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
