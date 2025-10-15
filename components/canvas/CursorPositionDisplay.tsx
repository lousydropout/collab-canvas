'use client'

interface CursorPositionDisplayProps {
  position: { x: number; y: number } | null
  className?: string
}

export default function CursorPositionDisplay({ position, className = '' }: CursorPositionDisplayProps) {
  if (!position) {
    return null
  }

  return (
    <div className={`absolute bottom-4 left-4 z-10 bg-black/70 text-white px-3 py-2 rounded text-sm font-mono ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-gray-300">Cursor:</span>
        <span className="text-white">
          ({Math.round(position.x)}, {Math.round(position.y)})
        </span>
      </div>
    </div>
  )
}
