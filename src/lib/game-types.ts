export type Color = 'red' | 'green' | 'blue' | 'purple' | 'yellow'
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6
export type BoardSize = 3 | 4 | 5
export type GameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned'

export interface Cube {
  value: DiceValue
  color: Color
}

export interface CellRule {
  type: 'color' | 'number'
  color?: Color
  value?: DiceValue
}

export interface Cell {
  cube: Cube | null
  rule: CellRule | null
}

export interface PlayerState {
  id: string
  name: string
  board: Cell[][]
  ready: boolean
  placedCount: number
}

export interface GameState {
  lobbyId: string
  hostId: string
  status: GameStatus
  boardSize: BoardSize
  ruleCount: number
  players: PlayerState[]
  availableCubes: Cube[]
  currentPlayerIndex: number
  winner: string | null
  consecutiveSkips: number
}

export const SIZE_RULES: Record<BoardSize, number[]> = {
  3: [0, 3, 5, 7],
  4: [0, 4, 8, 12],
  5: [0, 5, 10, 20],
}
