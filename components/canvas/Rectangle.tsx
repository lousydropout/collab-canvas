'use client'

import { Rect } from 'react-konva'
import { CanvasObject } from '@/types/canvas'

interface RectangleProps {
  object: CanvasObject
  isSelected?: boolean
  onSelect?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<CanvasObject>) => void
}

export default function Rectangle({ 
  object, 
  isSelected = false, 
  onSelect, 
  onUpdate 
}: RectangleProps) {
  const handleClick = () => {
    console.log(`🎯 Rectangle clicked: ${object.id}`)
    onSelect?.(object.id)
  }

  const handleDragEnd = (e: any) => {
    const node = e.target
    const newPos = {
      x: node.x(),
      y: node.y(),
    }
    console.log(`📦 Rectangle moved to: (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)})`)
    onUpdate?.(object.id, newPos)
  }

  return (
    <Rect
      x={object.x}
      y={object.y}
      width={object.width}
      height={object.height}
      fill={object.color}
      rotation={object.rotation}
      stroke={isSelected ? '#0066ff' : undefined}
      strokeWidth={isSelected ? 2 : undefined}
      draggable
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      shadowBlur={isSelected ? 10 : undefined}
      shadowColor={isSelected ? '#0066ff' : undefined}
      shadowOpacity={isSelected ? 0.3 : undefined}
    />
  )
}
