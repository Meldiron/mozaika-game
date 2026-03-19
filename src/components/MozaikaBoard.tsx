import type { Cell, Cube, Color } from '#/lib/game-types'
import { isValidPlacement, isEdgeCell, getBoardPlacedCount } from '#/lib/game-logic'
import { cn } from '#/lib/utils'

const CUBE_BG: Record<Color, string> = {
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-400',
}

const CUBE_BORDER: Record<Color, string> = {
  red: 'border-red-300',
  green: 'border-emerald-300',
  blue: 'border-blue-300',
  purple: 'border-purple-300',
  yellow: 'border-yellow-200',
}

const RULE_BG: Record<Color, string> = {
  red: 'bg-red-500/15',
  green: 'bg-emerald-500/15',
  blue: 'bg-blue-500/15',
  purple: 'bg-purple-500/15',
  yellow: 'bg-yellow-400/15',
}

const RULE_TEXT: Record<Color, string> = {
  red: 'text-red-400',
  green: 'text-emerald-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  yellow: 'text-yellow-300',
}

interface Props {
  board: Cell[][]
  isMyBoard: boolean
  isMyTurn: boolean
  selectedCube: Cube | null
  onCellClick: (row: number, col: number) => void
}

export default function MozaikaBoard({
  board,
  isMyBoard,
  isMyTurn,
  selectedCube,
  onCellClick,
}: Props) {
  if (!board.length) return null

  const placedCount = getBoardPlacedCount(board)

  const size = board.length
  const cellSize = size <= 3 ? 'h-[4.5rem] w-[4.5rem]' : size <= 4 ? 'h-[3.75rem] w-[3.75rem]' : 'h-[3.25rem] w-[3.25rem]'
  const fontSize = size <= 3 ? 'text-2xl' : size <= 4 ? 'text-xl' : 'text-lg'

  return (
    <div
      className="inline-grid gap-1 rounded-xl bg-neutral-800/50 p-1.5"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {board.map((row, r) =>
        row.map((cell, c) => {
          const canPlace =
            isMyBoard && isMyTurn && selectedCube && !cell.cube
              ? isValidPlacement(board, r, c, selectedCube).valid
              : false

          return (
            <button
              key={`${r}-${c}`}
              onClick={() => canPlace && onCellClick(r, c)}
              disabled={!canPlace}
              className={cn(
                'relative flex items-center justify-center rounded-md border-2 transition-all',
                cellSize,
                cell.cube
                  ? cn(
                      CUBE_BG[cell.cube.color],
                      CUBE_BORDER[cell.cube.color],
                      'font-bold shadow-inner',
                    )
                  : cn(
                      'border-neutral-700 bg-neutral-800',
                      cell.rule?.type === 'color' &&
                        cell.rule.color &&
                        RULE_BG[cell.rule.color],
                      canPlace &&
                        'cursor-pointer border-green-500/60 hover:bg-green-900/30',
                      isMyBoard &&
                        isMyTurn &&
                        selectedCube &&
                        !cell.cube &&
                        !canPlace &&
                        'border-neutral-700/50 opacity-40',
                    ),
              )}
            >
              {cell.cube ? (
                <span
                  className={cn(
                    'font-bold drop-shadow',
                    fontSize,
                    cell.cube.color === 'yellow'
                      ? 'text-neutral-900'
                      : 'text-white',
                  )}
                >
                  {cell.cube.value}
                </span>
              ) : cell.rule ? (
                <span
                  className={cn(
                    'text-xs font-semibold opacity-70',
                    cell.rule.type === 'color' &&
                      cell.rule.color &&
                      RULE_TEXT[cell.rule.color],
                    cell.rule.type === 'number' && 'text-sm text-neutral-400',
                  )}
                >
                  {cell.rule.type === 'color'
                    ? cell.rule.color?.charAt(0).toUpperCase()
                    : cell.rule.value}
                </span>
              ) : null}

              {isMyBoard &&
                placedCount === 0 &&
                isEdgeCell(r, c, size) &&
                !cell.cube && (
                  <div className="pointer-events-none absolute inset-0 rounded-md border border-dashed border-neutral-500/30" />
                )}
            </button>
          )
        }),
      )}
    </div>
  )
}
