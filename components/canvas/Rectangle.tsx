'use client'

import { Rect } from 'react-konva'
import { CanvasObject } from '@/types/canvas'
import { useRef, useCallback } from 'react'

interface RectangleProps {
  object: CanvasObject
  isSelected?: boolean
  onSelect?: (id: string, event?: any) => void
  onUpdate?: (id: string, updates: Partial<CanvasObject>) => void
  onRealtimeUpdate?: (id: string, updates: Partial<CanvasObject>) => void
}

export default function Rectangle({ 
  object, 
  isSelected = false, 
  onSelect, 
  onUpdate,
  onRealtimeUpdate 
}: RectangleProps) {
  const lastUpdateRef = useRef<number>(0)
  const THROTTLE_MS = 16 // Update every 16ms during drag (~60fps)
  const handleClick = (e: any) => {
    // Stop event from bubbling to canvas
    e.cancelBubble = true
    if (e.stopPropagation) e.stopPropagation()
    
    onSelect?.(object.id, e)
  }

  const handleDragMove = useCallback((e: any) => {
    // Stop event propagation
    e.cancelBubble = true
    if (e.stopPropagation) e.stopPropagation()
    
    // Throttle network updates to avoid overwhelming
    const now = Date.now()
    if (now - lastUpdateRef.current >= THROTTLE_MS) {
      lastUpdateRef.current = now
      
      const node = e.target
      const newPos = {
        x: node.x(),
        y: node.y(),
      }
      
      // Send real-time position update (fast, broadcast-only)
      onRealtimeUpdate?.(object.id, newPos)
    }
  }, [object.id, onRealtimeUpdate, THROTTLE_MS])

  const handleDragStart = (e: any) => {
    // Aggressively stop all event propagation
    e.cancelBubble = true
    if (e.stopPropagation) e.stopPropagation()
    if (e.preventDefault) e.preventDefault()
    
    // Stop the event at the Konva level too
    if (e.evt) {
      e.evt.stopPropagation()
      e.evt.preventDefault()
      e.evt.cancelBubble = true
    }
    
    // Ensure rectangle is selected when starting to drag
    if (!isSelected) {
      onSelect?.(object.id, e)
    }
  }

  const handleDragEnd = (e: any) => {
    // Aggressively stop all event propagation to prevent Stage drag
    e.cancelBubble = true
    if (e.stopPropagation) e.stopPropagation()
    if (e.preventDefault) e.preventDefault()
    
    // Stop the event at the Konva level too
    if (e.evt) {
      e.evt.stopPropagation()
      e.evt.preventDefault()
      e.evt.cancelBubble = true
    }
    
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
      id={object.id}
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
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      shadowBlur={isSelected ? 10 : undefined}
      shadowColor={isSelected ? '#0066ff' : undefined}
      shadowOpacity={isSelected ? 0.3 : undefined}
    />
  )
}
