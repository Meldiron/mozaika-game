import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { BoardSize } from '#/lib/game-types'
import { SIZE_RULES } from '#/lib/game-types'
import {
  createLobbyFn,
  joinLobbyFn,
  createSplitScreenFn,
} from '#/lib/game-functions'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '#/components/ui/input-otp'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export const Route = createFileRoute('/')({ component: Home })

type View = 'menu' | 'create' | 'join' | 'split'

function defaultRuleCount(size: BoardSize): number {
  return SIZE_RULES[size].find((r) => r > 0) ?? SIZE_RULES[size][0]
}

function SizeAndRulesSelect({
  boardSize,
  ruleCount,
  onSizeChange,
  onRuleCountChange,
}: {
  boardSize: BoardSize
  ruleCount: number
  onSizeChange: (size: BoardSize) => void
  onRuleCountChange: (count: number) => void
}) {
  const availableRules = SIZE_RULES[boardSize]

  return (
    <div className="flex gap-2">
      <Select
        value={String(boardSize)}
        onValueChange={(v) => {
          const newSize = Number(v) as BoardSize
          onSizeChange(newSize)
          // Reset rule count to first available for new size
          onRuleCountChange(defaultRuleCount(newSize))
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="3">3 x 3</SelectItem>
          <SelectItem value="4">4 x 4</SelectItem>
          <SelectItem value="5">5 x 5</SelectItem>
        </SelectContent>
      </Select>
      <Select
        key={boardSize}
        value={String(ruleCount)}
        onValueChange={(v) => onRuleCountChange(Number(v))}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableRules.map((r) => (
            <SelectItem key={r} value={String(r)}>
              {r === 0 ? 'No rules' : `${r} rules`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function Home() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('menu')
  const [createName, setCreateName] = useState('')
  const [boardSize, setBoardSize] = useState<BoardSize>(5)
  const [ruleCount, setRuleCount] = useState(() => defaultRuleCount(5))
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [splitName1, setSplitName1] = useState('')
  const [splitName2, setSplitName2] = useState('')
  const [splitBoardSize, setSplitBoardSize] = useState<BoardSize>(5)
  const [splitRuleCount, setSplitRuleCount] = useState(() => defaultRuleCount(5))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await createLobbyFn({
        data: { playerName: createName.trim(), boardSize, ruleCount },
      })
      await navigate({
        to: '/game/$lobbyId',
        params: { lobbyId: result.lobbyId },
        search: { pid: result.playerId },
      })
    } catch {
      setError('Failed to create lobby')
    }
    setLoading(false)
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinName.trim() || !joinCode.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await joinLobbyFn({
        data: {
          playerName: joinName.trim(),
          lobbyId: joinCode.trim(),
        },
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        await navigate({
          to: '/game/$lobbyId',
          params: { lobbyId: joinCode.trim() },
          search: { pid: result.playerId },
        })
      }
    } catch {
      setError('Failed to join lobby')
    }
    setLoading(false)
  }

  const handleSplit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!splitName1.trim() || !splitName2.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await createSplitScreenFn({
        data: {
          player1Name: splitName1.trim(),
          player2Name: splitName2.trim(),
          boardSize: splitBoardSize,
          ruleCount: splitRuleCount,
        },
      })
      await navigate({
        to: '/game/$lobbyId',
        params: { lobbyId: result.lobbyId },
        search: {
          pid: result.player1Id,
          pid2: result.player2Id,
          split: 'true',
        },
      })
    } catch {
      setError('Failed to create game')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-sm items-center px-4">
          <h1 className="text-lg font-bold tracking-tight">Mozaika Game</h1>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto w-full max-w-sm space-y-5 px-4 pt-8">
        {error && (
          <p className="rounded-lg bg-destructive/10 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {view === 'menu' && (
          <div className="space-y-3">
            <h2 className="mb-1 text-xl font-bold">Play a friend online</h2>
            <Button
              onClick={() => setView('create')}
              variant="outline"
              className="h-14 w-full text-lg font-bold"
            >
              Create Game
            </Button>
            <Button
              onClick={() => setView('join')}
              variant="outline"
              className="h-14 w-full text-lg font-bold"
            >
              Join Game
            </Button>
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">Or play on one device</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button
              onClick={() => setView('split')}
              variant="outline"
              className="h-14 w-full text-lg font-bold"
            >
              Split Screen
            </Button>
          </div>
        )}

        {view === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Game</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <Input
                  placeholder="Your name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
                <SizeAndRulesSelect
                  boardSize={boardSize}
                  ruleCount={ruleCount}
                  onSizeChange={setBoardSize}
                  onRuleCountChange={setRuleCount}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !createName.trim()}
                >
                  Create Lobby
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setView('menu')
                    setError(null)
                  }}
                >
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {view === 'join' && (
          <Card>
            <CardHeader>
              <CardTitle>Join Game</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Your name</p>
                  <Input
                    placeholder="Enter your name"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Lobby code</p>
                  <InputOTP
                    maxLength={6}
                    value={joinCode}
                    onChange={setJoinCode}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading || !joinName.trim() || !joinCode.trim()
                  }
                >
                  Join Lobby
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setView('menu')
                    setError(null)
                  }}
                >
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {view === 'split' && (
          <Card>
            <CardHeader>
              <CardTitle>Split Screen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSplit} className="space-y-3">
                <Input
                  placeholder="Player 1 name"
                  value={splitName1}
                  onChange={(e) => setSplitName1(e.target.value)}
                />
                <Input
                  placeholder="Player 2 name"
                  value={splitName2}
                  onChange={(e) => setSplitName2(e.target.value)}
                />
                <SizeAndRulesSelect
                  boardSize={splitBoardSize}
                  ruleCount={splitRuleCount}
                  onSizeChange={setSplitBoardSize}
                  onRuleCountChange={setSplitRuleCount}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading || !splitName1.trim() || !splitName2.trim()
                  }
                >
                  Start Game
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setView('menu')
                    setError(null)
                  }}
                >
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
