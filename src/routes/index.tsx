import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { BoardSize, Cell, CellRule, Cube } from '#/lib/game-types'
import { SIZE_RULES } from '#/lib/game-types'
import {
  createLobbyFn,
  joinLobbyFn,
  createSplitScreenFn,
  createSinglePlayerFn,
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
import ThemeToggle from '#/components/ThemeToggle'
import BoardGrid, { CUBE_BG } from '#/components/BoardGrid'

export const Route = createFileRoute('/')({ component: Home })

type View = 'menu' | 'create' | 'join' | 'split' | 'single'

const ADJECTIVES = [
  'Swift', 'Bold', 'Clever', 'Brave', 'Calm', 'Daring', 'Eager', 'Fierce',
  'Grand', 'Happy', 'Jolly', 'Keen', 'Lucky', 'Mighty', 'Noble', 'Proud',
  'Quick', 'Royal', 'Sharp', 'Tough', 'Vivid', 'Warm', 'Wild', 'Zesty',
  'Bright', 'Cosmic', 'Epic', 'Golden', 'Iron', 'Jade', 'Mystic', 'Rapid',
  'Silent', 'Stormy', 'Tiny', 'Vast', 'Witty', 'Frozen', 'Gentle', 'Humble',
]

const NOUNS = [
  'Fox', 'Wolf', 'Bear', 'Hawk', 'Tiger', 'Raven', 'Otter', 'Panda',
  'Eagle', 'Shark', 'Cobra', 'Falcon', 'Lion', 'Lynx', 'Owl', 'Viper',
  'Badger', 'Crane', 'Drake', 'Gecko', 'Heron', 'Jackal', 'Koala', 'Moose',
  'Newt', 'Orchid', 'Pike', 'Quail', 'Robin', 'Squid', 'Trout', 'Wren',
  'Bison', 'Coyote', 'Dove', 'Finch', 'Goose', 'Ibis', 'Kite', 'Mole',
]

function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj} ${noun}`
}

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

// Tutorial: rules for each cell (null = no rule)
const TUTORIAL_RULES: (CellRule | null)[][] = [
  [{ type: 'color', color: 'red' }, { type: 'number', value: 3 }, { type: 'color', color: 'blue' }],
  [{ type: 'number', value: 5 }, null, { type: 'number', value: 2 }],
  [null, { type: 'color', color: 'green' }, null],
]

// Each step: placement + note
const TUTORIAL_STEPS: { row: number; col: number; cube: Cube; note: string }[] = [
  { row: 1, col: 0, cube: { value: 5, color: 'blue' }, note: 'We start by filling cell with number 5 rule. We use blue, because no neighbor cell will require blue dice.' },
  { row: 0, col: 0, cube: { value: 4, color: 'red' }, note: 'Next, we fill the cell with red dice rule. Number 4 works, as it is not 5 (5 is disallowed by neigbour blue 5 below).' },
  { row: 1, col: 1, cube: { value: 6, color: 'purple' }, note: 'Next, we fill cell without a rule using purple 6 dice. We know we will not need 6, or purple, to fill cell with a rule.' },
  { row: 0, col: 1, cube: { value: 3, color: 'green' }, note: 'We use green 3 to fill cell with 3 rule, because there is no rule 4 to satisfy - We priritize number over color.' },
  { row: 2, col: 1, cube: { value: 4, color: 'green' }, note: 'We use last dice from tray, green 4, to fill the cell with green rule. Our tray is empty, so we get 5 new dices.' },
  { row: 2, col: 0, cube: { value: 1, color: 'yellow' }, note: 'Yellow 1 is not needed for any rule, so we place it on an empty cell in bottom left corner of the grid.' },
  { row: 1, col: 2, cube: { value: 2, color: 'yellow' }, note: 'Yellow 2 is used to fill the cell with 2 rule. We cannot use blue 2, as it would block blue needed above.' },
  { row: 0, col: 2, cube: { value: 1, color: 'blue' }, note: 'We place blue 1 on cell with blue rule. We cannot use blue 2 because neigbour dice (below) is number 2.' },
  { row: 2, col: 2, cube: { value: 5, color: 'red' }, note: 'We finish off the grid with red 5 in cell without rule. Blue 2 would not fit here, due to the dice 2 above.' },
]

// Dice pools — first 5 are used for steps 1-5, second 5 for steps 6-9 (+ 1 leftover)
const TUTORIAL_POOLS: Cube[][] = [
  [
    { value: 5, color: 'blue' },
    { value: 4, color: 'red' },
    { value: 6, color: 'purple' },
    { value: 4, color: 'green' },
    { value: 3, color: 'green' },
  ],
  [
    { value: 1, color: 'yellow' },
    { value: 2, color: 'yellow' },
    { value: 1, color: 'blue' },
    { value: 5, color: 'red' },
    { value: 2, color: 'blue' },
  ],
]

/**
 * Step layout:
 *   0 — intro: empty board, "?" placeholders in tray
 *   1 — dice revealed: empty board, first pool shown (no pick)
 *   2..10 — placement steps (index into TUTORIAL_STEPS[step-2])
 */
function getTrayAtStep(step: number): { tray: Cube[] | null; pickedIndex: number } {
  // Step 0: "?" placeholders
  if (step === 0) return { tray: null, pickedIndex: -1 }
  // Step 1: reveal the first pool, nothing picked yet
  if (step === 1) return { tray: TUTORIAL_POOLS[0], pickedIndex: -1 }

  const placeIndex = step - 2 // 0-based index into TUTORIAL_STEPS
  // Determine which pool we're in and how many picks happened in it
  const poolIndex = placeIndex < 5 ? 0 : 1
  const pickInPool = poolIndex === 0 ? placeIndex : placeIndex - 5
  const pool = TUTORIAL_POOLS[poolIndex]

  // Remove cubes picked in prior steps within this pool
  const remaining = [...pool]
  for (let i = 0; i < pickInPool; i++) {
    const s = poolIndex === 0 ? i : i + 5
    const cube = TUTORIAL_STEPS[s].cube
    const idx = remaining.findIndex(
      (c) => c.value === cube.value && c.color === cube.color,
    )
    if (idx !== -1) remaining.splice(idx, 1)
  }

  // Find the current pick in the remaining tray
  const currentCube = TUTORIAL_STEPS[placeIndex].cube
  const pickedIndex = remaining.findIndex(
    (c) => c.value === currentCube.value && c.color === currentCube.color,
  )

  return { tray: remaining, pickedIndex }
}

function buildBoardAtStep(step: number): Cell[][] {
  const board: Cell[][] = TUTORIAL_RULES.map((row) =>
    row.map((rule) => ({ cube: null, rule })),
  )
  for (let i = 0; i < step; i++) {
    const { row, col, cube } = TUTORIAL_STEPS[i]
    board[row][col] = { ...board[row][col], cube }
  }
  return board
}

function TutorialBoard({ step }: { step: number }) {
  const board = buildBoardAtStep(step)
  const justPlaced = step > 0 ? TUTORIAL_STEPS[step - 1] : null

  return (
    <BoardGrid
      board={board}
      cellClassName={(r, c) =>
        justPlaced?.row === r && justPlaced?.col === c
          ? 'ring-2 ring-white/50 scale-105 duration-300'
          : 'duration-300'
      }
    />
  )
}

function TutorialSlider() {
  const [step, setStep] = useState(0)
  // 0 = intro, 1 = dice revealed, 2..10 = placements
  const total = TUTORIAL_STEPS.length + 1 // 10

  // Board shows placements from steps 2+
  const boardStep = step >= 2 ? step - 1 : 0

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold">Example playthrough</h3>
      <p className="text-sm text-neutral-400">
        Step by step example game in 3x3 grid game.
      </p>
      <div className="flex justify-center">
        <div className={`rounded-xl ring-2 ${step === 0 ? 'ring-white/50 animate-pulse' : 'ring-transparent'}`}>
          <TutorialBoard step={boardStep} />
        </div>
      </div>
      {/* Dice tray */}
      {(() => {
        const { tray, pickedIndex } = getTrayAtStep(step)
        if (!tray) {
          return (
            <div className="flex justify-center">
            <div className="inline-flex gap-2 rounded-xl px-2 py-1.5 ring-2 ring-transparent">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 text-sm font-bold text-neutral-600"
                >
                  ?
                </div>
              ))}
            </div>
            </div>
          )
        }
        return (
          <div className="flex justify-center">
          <div className={`inline-flex gap-2 rounded-xl px-2 py-1.5 ring-2 ${step === 1 ? 'ring-white/50 animate-pulse' : 'ring-transparent'}`}>
            {tray.map((cube, i) => {
              const isPicked = i === pickedIndex
              return (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold shadow transition-all ${CUBE_BG[cube.color]} ${
                    cube.color === 'yellow' ? 'text-neutral-900' : 'text-white'
                  } ${isPicked ? 'ring-2 ring-white/70 scale-110' : step === 1 ? '' : 'opacity-60'}`}
                >
                  {cube.value}
                </div>
              )
            })}
          </div>
          </div>
        )
      })()}
      <p className="min-h-[2.5rem] text-center text-sm text-neutral-300">
        {step === 0
          ? 'First we check out rules the grid cells. Even single mistake can make the board impossible to finish.'
          : step === 1
            ? 'Then we look at the dice tray and decide which one we want to place first - must be on the border of board.'
            : TUTORIAL_STEPS[step - 2].note}
      </p>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          Prev
        </Button>
        <span className="text-xs text-muted-foreground">
          {step} / {total}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={step === total}
          onClick={() => setStep((s) => s + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function HowToPlay() {
  return (
    <div className="space-y-5 border-t pt-6">
      <h2 className="text-xl font-bold">How to play</h2>

      <div className="space-y-3 text-sm text-neutral-300">
        <p>
          Two players take turns placing dice on a shared board. First to fill every cell on their board wins.
        </p>

        <div className="space-y-1.5">
          <p className="font-semibold text-white">Placement rules</p>
          <ul className="list-inside list-disc space-y-1 text-neutral-400">
            <li>Your first dice must go on an <span className="text-neutral-200">edge cell</span></li>
            <li>After that, each dice must be <span className="text-neutral-200">next to</span> one already on the board (including diagonals)</li>
            <li>No two <span className="text-neutral-200">same numbers</span> adjacent (touching sides)</li>
            <li>No two <span className="text-neutral-200">same colors</span> adjacent (touhing sides)</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="font-semibold text-white">Cell rules</p>
          <p className="text-neutral-400">
            Some cells show a letter (<span className="text-red-400">R</span>, <span className="text-blue-400">B</span>, <span className="text-emerald-400">G</span>, ...) or a number. You must place a dice matching that color or number.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="font-semibold text-white">Each turn</p>
          <p className="text-neutral-400">
            Pick one of 5 available dice, then place it. If you can't go, skip. If both players skip in a row, the dice pool refreshes.
          </p>
        </div>
      </div>

      <TutorialSlider />
    </div>
  )
}

function Home() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('menu')
  const [createName, setCreateName] = useState(randomName)
  const [boardSize, setBoardSize] = useState<BoardSize>(5)
  const [ruleCount, setRuleCount] = useState(() => defaultRuleCount(5))
  const [joinName, setJoinName] = useState(randomName)
  const [joinCode, setJoinCode] = useState('')
  const [splitName1, setSplitName1] = useState(randomName)
  const [splitName2, setSplitName2] = useState(randomName)
  const [splitBoardSize, setSplitBoardSize] = useState<BoardSize>(5)
  const [splitRuleCount, setSplitRuleCount] = useState(() => defaultRuleCount(5))
  const [singleName, setSingleName] = useState(randomName)
  const [singleBoardSize, setSingleBoardSize] = useState<BoardSize>(5)
  const [singleRuleCount, setSingleRuleCount] = useState(() => defaultRuleCount(5))
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

  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!singleName.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await createSinglePlayerFn({
        data: {
          playerName: singleName.trim(),
          boardSize: singleBoardSize,
          ruleCount: singleRuleCount,
        },
      })
      await navigate({
        to: '/game/$lobbyId',
        params: { lobbyId: result.lobbyId },
        search: { pid: result.playerId, single: 'true' },
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
        <div className="mx-auto flex h-14 w-full max-w-sm items-center justify-between px-4">
          <h1 className="text-lg font-bold tracking-tight">Mozaika Game</h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto w-full max-w-sm space-y-5 px-4 pt-8 pb-12">
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
            <Button
              onClick={() => setView('single')}
              variant="outline"
              className="h-14 w-full text-lg font-bold"
            >
              Single Player
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

        {view === 'single' && (
          <Card>
            <CardHeader>
              <CardTitle>Single Player</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSingle} className="space-y-3">
                <Input
                  placeholder="Your name"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                />
                <SizeAndRulesSelect
                  boardSize={singleBoardSize}
                  ruleCount={singleRuleCount}
                  onSizeChange={setSingleBoardSize}
                  onRuleCountChange={setSingleRuleCount}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !singleName.trim()}
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

        {view === 'menu' && <HowToPlay />}
      </div>
    </div>
  )
}
