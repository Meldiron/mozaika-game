import type { Cell, Color } from '#/lib/game-types'
import { cn } from '#/lib/utils'

export const CUBE_BG: Record<Color, string> = {
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-400',
}

export const CUBE_BORDER: Record<Color, string> = {
  red: 'border-red-300',
  green: 'border-emerald-300',
  blue: 'border-blue-300',
  purple: 'border-purple-300',
  yellow: 'border-yellow-200',
}

export const RULE_BG: Record<Color, string> = {
  red: 'bg-red-500/15',
  green: 'bg-emerald-500/15',
  blue: 'bg-blue-500/15',
  purple: 'bg-purple-500/15',
  yellow: 'bg-yellow-400/15',
}

export const RULE_TEXT: Record<Color, string> = {
  red: 'text-red-400',
  green: 'text-emerald-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  yellow: 'text-yellow-300',
}

interface BoardGridProps {
  board: Cell[][]
  /** Extra class names per cell, keyed by "r-c" */
  cellClassName?: (row: number, col: number, cell: Cell) => string
  /** Called when a cell is clicked. If omitted, cells are not interactive. */
  onCellClick?: (row: number, col: number) => void
  /** Whether a cell is clickable. Only used when onCellClick is provided. */
  isCellEnabled?: (row: number, col: number) => boolean
  /** Overlay content rendered inside a cell (e.g. edge dashes) */
  cellOverlay?: (row: number, col: number, cell: Cell) => React.ReactNode
}

export default function BoardGrid({
  board,
  cellClassName,
  onCellClick,
  isCellEnabled,
  cellOverlay,
}: BoardGridProps) {
  if (!board.length) return null

  const size = board.length
  const cellSize =
    size <= 3
      ? 'h-[4.5rem] w-[4.5rem]'
      : size <= 4
        ? 'h-[3.75rem] w-[3.75rem]'
        : 'h-[3.25rem] w-[3.25rem]'
  const fontSize =
    size <= 3 ? 'text-2xl' : size <= 4 ? 'text-xl' : 'text-lg'

  return (
    <div
      className="inline-grid gap-1 rounded-xl bg-neutral-800/50 p-1.5"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {board.map((row, r) =>
        row.map((cell, c) => {
          const enabled = isCellEnabled?.(r, c) ?? false
          const interactive = !!onCellClick
          const extraClass = cellClassName?.(r, c, cell) ?? ''

          const baseCellClass = cn(
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
                ),
            extraClass,
          )

          const content = (
            <>
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
              {cellOverlay?.(r, c, cell)}
            </>
          )

          if (interactive) {
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => enabled && onCellClick(r, c)}
                disabled={!enabled}
                className={baseCellClass}
              >
                {content}
              </button>
            )
          }

          return (
            <div key={`${r}-${c}`} className={baseCellClass}>
              {content}
            </div>
          )
        }),
      )}
    </div>
  )
}
