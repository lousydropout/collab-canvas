'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer } from 'react-konva'
import Konva from 'konva'

interface CanvasStageProps {
  width: number
  height: number
  children?: React.ReactNode
  scale?: number
  onScaleChange?: (scale: number) => void
  onStageClick?: (e: any) => void
  onMouseMove?: (e: any) => void
  onMouseUp?: (e: any) => void
}

export default function CanvasStage({ 
  width, 
  height, 
  children, 
  onScaleChange, 
  onStageClick,
  onMouseMove,
  onMouseUp 
}: CanvasStageProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Zoom sensitivity
    const scaleBy = 1.05
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    
    // Clamp zoom between 0.1x and 5x
    const clampedScale = Math.max(0.1, Math.min(5, newScale))
    
    // Log zoom changes
    console.log(`🔍 Zoom: ${(clampedScale * 100).toFixed(1)}% (${oldScale.toFixed(3)} → ${clampedScale.toFixed(3)})`)
    
    setStageScale(clampedScale)
    onScaleChange?.(clampedScale)

    // Adjust position to zoom towards mouse cursor
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }

    setStagePos(newPos)
  }, [])

  // Handle stage drag (pan)
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    console.log('🖱️ Started panning')
  }, [])

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false)
    const newPos = {
      x: e.target.x(),
      y: e.target.y(),
    }
    setStagePos(newPos)
    console.log(`📍 Pan position: (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)})`)
  }, [])

  // Prevent context menu on right click
  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault()
    }

    const stageNode = stageRef.current?.container()
    if (stageNode) {
      stageNode.addEventListener('contextmenu', handleContextMenu)
      return () => {
        stageNode.removeEventListener('contextmenu', handleContextMenu)
      }
    }
  }, [])

  return (
    <div className="border border-gray-300 bg-white rounded-lg overflow-hidden relative">
      {/* Zoom Level Indicator */}
      <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded text-sm font-mono">
        {(stageScale * 100).toFixed(0)}%
      </div>
      
      {/* Pan Position Indicator */}
      <div className="absolute top-4 right-4 z-10 bg-black/70 text-white px-3 py-1 rounded text-sm font-mono">
        ({stagePos.x.toFixed(0)}, {stagePos.y.toFixed(0)})
      </div>
      
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        onWheel={handleWheel}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onStageClick}
        onTap={onStageClick}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <Layer>
          {children}
        </Layer>
      </Stage>
    </div>
  )
}
