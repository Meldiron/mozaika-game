import type { Cell, Cube } from '#/lib/game-types'
import { isValidPlacement, isEdgeCell, getBoardPlacedCount } from '#/lib/game-logic'
import BoardGrid from './BoardGrid'

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
  const placedCount = getBoardPlacedCount(board)
  const size = board.length

  const canPlaceAt = (r: number, c: number) =>
    isMyBoard && isMyTurn && selectedCube && !board[r][c].cube
      ? isValidPlacement(board, r, c, selectedCube).valid
      : false

  return (
    <BoardGrid
      board={board}
      onCellClick={onCellClick}
      isCellEnabled={canPlaceAt}
      cellClassName={(r, c, cell) => {
        const canPlace = canPlaceAt(r, c)
        if (cell.cube) return ''
        if (canPlace) return 'cursor-pointer border-green-500/60 hover:bg-green-900/30'
        if (isMyBoard && isMyTurn && selectedCube && !cell.cube)
          return 'border-neutral-700/50 opacity-40'
        return ''
      }}
      cellOverlay={(r, c, cell) =>
        isMyBoard &&
        placedCount === 0 &&
        isEdgeCell(r, c, size) &&
        !cell.cube ? (
          <div className="pointer-events-none absolute inset-0 rounded-md border border-dashed border-neutral-500/30" />
        ) : null
      }
    />
  )
}
