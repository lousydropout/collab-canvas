'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import CanvasStage from './CanvasStage'
import Grid from './Grid'
import Rectangle from './Rectangle'
import { useCanvas } from '@/hooks/useCanvas'
import { CanvasState } from '@/types/canvas'

interface CanvasProps {
  className?: string
  currentTool: CanvasState['tool']
  onToolChange: (tool: CanvasState['tool']) => void
}

export default function Canvas({ className = '', currentTool, onToolChange }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [currentScale, setCurrentScale] = useState(1)
  const [isCreatingRect, setIsCreatingRect] = useState(false)
  const [creatingRect, setCreatingRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)

  const { state, createRectangle, updateObject, selectObjects, setTool } = useCanvas()

  // Sync tool state
  useEffect(() => {
    setTool(currentTool)
  }, [currentTool, setTool])

  // Update canvas dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newWidth = Math.floor(rect.width)
        const newHeight = Math.floor(rect.height)
        
        // Only update if dimensions actually changed (prevent feedback loops)
        setDimensions(prev => {
          if (Math.abs(prev.width - newWidth) > 1 || Math.abs(prev.height - newHeight) > 1) {
            console.log(`📐 Canvas dimensions updated: ${newWidth}x${newHeight} (was ${prev.width}x${prev.height})`)
            return {
              width: newWidth,
              height: newHeight,
            }
          }
          return prev
        })
      }
    }

    // Initial size
    updateDimensions()

    // Use window resize instead of ResizeObserver to avoid feedback loops
    const handleWindowResize = () => {
      updateDimensions()
    }

    window.addEventListener('resize', handleWindowResize)
    
    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])

  // Handle canvas click for rectangle creation
  const handleCanvasClick = useCallback((e: any) => {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    
    if (currentTool === 'rectangle' && !isCreatingRect) {
      console.log('🚀 Starting rectangle creation at:', pos)
      setIsCreatingRect(true)
      setCreatingRect({
        startX: pos.x,
        startY: pos.y,
        endX: pos.x,
        endY: pos.y,
      })
    } else if (currentTool === 'select') {
      // Deselect all when clicking empty space
      selectObjects([])
    }
  }, [currentTool, isCreatingRect, selectObjects])

  // Handle mouse move during rectangle creation
  const handleMouseMove = useCallback((e: any) => {
    if (isCreatingRect && creatingRect) {
      const stage = e.target.getStage()
      const pos = stage.getPointerPosition()
      setCreatingRect(prev => prev ? {
        ...prev,
        endX: pos.x,
        endY: pos.y,
      } : null)
    }
  }, [isCreatingRect, creatingRect])

  // Handle mouse up to finish rectangle creation
  const handleMouseUp = useCallback(async () => {
    if (isCreatingRect && creatingRect) {
      const width = Math.abs(creatingRect.endX - creatingRect.startX)
      const height = Math.abs(creatingRect.endY - creatingRect.startY)
      
      // Only create if rectangle is large enough
      if (width > 10 && height > 10) {
        const x = Math.min(creatingRect.startX, creatingRect.endX)
        const y = Math.min(creatingRect.startY, creatingRect.endY)
        
        await createRectangle({
          type: 'rectangle',
          x,
          y,
          width,
          height,
          color: '#3b82f6',
        })
        
        console.log('✅ Rectangle created!')
      }
      
      setIsCreatingRect(false)
      setCreatingRect(null)
      onToolChange('select') // Switch back to select tool
    }
  }, [isCreatingRect, creatingRect, createRectangle, onToolChange])

  // Handle object selection
  const handleObjectSelect = useCallback((objectId: string) => {
    if (currentTool === 'select') {
      selectObjects([objectId])
    }
  }, [currentTool, selectObjects])

  // Virtual canvas size (larger than viewport for infinite canvas feel)
  const virtualCanvasSize = {
    width: 5000,
    height: 5000,
  }

  // Calculate rectangle dimensions for preview during creation
  const previewRect = creatingRect ? {
    x: Math.min(creatingRect.startX, creatingRect.endX),
    y: Math.min(creatingRect.startY, creatingRect.endY),
    width: Math.abs(creatingRect.endX - creatingRect.startX),
    height: Math.abs(creatingRect.endY - creatingRect.startY),
  } : null

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full max-w-full max-h-full overflow-hidden ${className}`}
      style={{ minHeight: '600px' }}
    >
      <CanvasStage 
        width={dimensions.width} 
        height={dimensions.height}
        onScaleChange={setCurrentScale}
        onStageClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Grid 
          width={virtualCanvasSize.width} 
          height={virtualCanvasSize.height} 
          gridSize={20}
          stroke="#f3f4f6"
          strokeWidth={0.5}
          scale={currentScale}
        />
        
        {/* Render existing rectangles */}
        {state.objects.map((object) => (
          <Rectangle
            key={object.id}
            object={object}
            isSelected={state.selectedObjects.includes(object.id)}
            onSelect={handleObjectSelect}
            onUpdate={updateObject}
          />
        ))}
        
        {/* Preview rectangle during creation */}
        {previewRect && previewRect.width > 0 && previewRect.height > 0 && (
          <Rectangle
            object={{
              id: 'preview',
              canvas_id: 'default',
              type: 'rectangle',
              x: previewRect.x,
              y: previewRect.y,
              width: previewRect.width,
              height: previewRect.height,
              color: '#3b82f6',
              rotation: 0,
              owner: 'all',
              created_by: null,
              created_at: '',
              updated_at: '',
            }}
            isSelected={false}
          />
        )}
      </CanvasStage>
    </div>
  )
}
