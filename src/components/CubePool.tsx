import type { Cube, Color } from '#/lib/game-types'
import { cn } from '#/lib/utils'

const CUBE_BG: Record<Color, string> = {
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-400',
}

interface Props {
  cubes: Cube[]
  selectedIndex: number | null
  onSelect: (index: number | null) => void
  disabled: boolean
}

export default function CubePool({
  cubes,
  selectedIndex,
  onSelect,
  disabled,
}: Props) {
  return (
    <div className="flex justify-center gap-2">
      {cubes.map((cube, i) => (
        <button
          key={i}
          onClick={() => {
            if (disabled) return
            onSelect(selectedIndex === i ? null : i)
          }}
          disabled={disabled}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold shadow-lg transition-all',
            CUBE_BG[cube.color],
            cube.color === 'yellow' ? 'text-neutral-900' : 'text-white',
            selectedIndex === i && 'ring-4 ring-white scale-110',
            !disabled && 'cursor-pointer hover:scale-105',
            disabled && 'opacity-50',
          )}
        >
          {cube.value}
        </button>
      ))}
      {cubes.length === 0 && (
        <p className="text-sm text-neutral-500">No cubes available</p>
      )}
    </div>
  )
}
