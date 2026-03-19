import type { Cell, CellRule, Color, Cube, DiceValue, BoardSize } from './game-types'

const COLORS: Color[] = ['red', 'green', 'blue', 'purple', 'yellow']
const DICE_VALUES: DiceValue[] = [1, 2, 3, 4, 5, 6]

export function generateCubes(count: number = 5): Cube[] {
  return Array.from({ length: count }, () => ({
    value: DICE_VALUES[Math.floor(Math.random() * DICE_VALUES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }))
}

const ORTHOGONAL: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

function getOrthogonalRules(
  board: Cell[][],
  r: number,
  c: number,
  size: number,
): CellRule[] {
  const rules: CellRule[] = []
  for (const [dr, dc] of ORTHOGONAL) {
    const nr = r + dr
    const nc = c + dc
    if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc].rule) {
      rules.push(board[nr][nc].rule!)
    }
  }
  return rules
}

function getRuleCompatibleColor(
  neighborRules: CellRule[],
): Color | null {
  const forbiddenColors = new Set<Color>()
  for (const rule of neighborRules) {
    if (rule.type === 'color' && rule.color) {
      forbiddenColors.add(rule.color)
    }
  }
  const available = COLORS.filter((c) => !forbiddenColors.has(c))
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

function getRuleCompatibleNumber(
  neighborRules: CellRule[],
): DiceValue | null {
  const forbiddenNumbers = new Set<DiceValue>()
  for (const rule of neighborRules) {
    if (rule.type === 'number' && rule.value) {
      forbiddenNumbers.add(rule.value)
    }
  }
  const available = DICE_VALUES.filter((v) => !forbiddenNumbers.has(v))
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

export function generateBoard(size: BoardSize, ruleCount: number): Cell[][] {
  const board: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ cube: null, rule: null })),
  )

  const allPositions: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      allPositions.push([r, c])
    }
  }

  // Fisher-Yates shuffle
  for (let i = allPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]]
  }

  let placed = 0
  for (let i = 0; i < allPositions.length && placed < ruleCount; i++) {
    const [r, c] = allPositions[i]
    const neighborRules = getOrthogonalRules(board, r, c, size)

    const tryColor = Math.random() < 0.5
    const attempts: (() => CellRule | null)[] = tryColor
      ? [
          () => {
            const color = getRuleCompatibleColor(neighborRules)
            return color ? { type: 'color', color } : null
          },
          () => {
            const value = getRuleCompatibleNumber(neighborRules)
            return value ? { type: 'number', value } : null
          },
        ]
      : [
          () => {
            const value = getRuleCompatibleNumber(neighborRules)
            return value ? { type: 'number', value } : null
          },
          () => {
            const color = getRuleCompatibleColor(neighborRules)
            return color ? { type: 'color', color } : null
          },
        ]

    for (const attempt of attempts) {
      const rule = attempt()
      if (rule) {
        board[r][c].rule = rule
        placed++
        break
      }
    }
  }

  return board
}

export function isEdgeCell(row: number, col: number, size: number): boolean {
  return row === 0 || row === size - 1 || col === 0 || col === size - 1
}

export function getBoardPlacedCount(board: Cell[][]): number {
  let count = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell.cube) count++
    }
  }
  return count
}

export function isValidPlacement(
  board: Cell[][],
  row: number,
  col: number,
  cube: Cube,
): { valid: boolean; reason?: string } {
  const size = board.length
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return { valid: false, reason: 'Out of bounds' }
  }

  if (board[row][col].cube) {
    return { valid: false, reason: 'Cell is already occupied' }
  }

  const placedCount = getBoardPlacedCount(board)

  // First cube must be on edge
  if (placedCount === 0 && !isEdgeCell(row, col, size)) {
    return { valid: false, reason: 'First cube must be placed on the edge' }
  }

  // Subsequent cubes must be adjacent or diagonal to an existing cube
  if (placedCount > 0) {
    const allNeighbors = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ]
    const hasNeighbor = allNeighbors.some(([dr, dc]) => {
      const nr = row + dr
      const nc = col + dc
      return nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc].cube !== null
    })
    if (!hasNeighbor) {
      return { valid: false, reason: 'Must be placed adjacent to an existing cube' }
    }
  }

  // Check cell rule
  const rule = board[row][col].rule
  if (rule) {
    if (rule.type === 'color' && rule.color !== cube.color) {
      return { valid: false, reason: `This cell requires ${rule.color}` }
    }
    if (rule.type === 'number' && rule.value !== cube.value) {
      return { valid: false, reason: `This cell requires number ${rule.value}` }
    }
  }

  // Check adjacency — no same number or same color neighbors
  for (const [dr, dc] of ORTHOGONAL) {
    const nr = row + dr
    const nc = col + dc
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      const adj = board[nr][nc]
      if (adj.cube) {
        if (adj.cube.value === cube.value) {
          return { valid: false, reason: 'Same numbers cannot be adjacent' }
        }
        if (adj.cube.color === cube.color) {
          return { valid: false, reason: 'Same colors cannot be adjacent' }
        }
      }
    }
  }

  return { valid: true }
}
