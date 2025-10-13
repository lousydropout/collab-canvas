'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import CanvasStage from './CanvasStage'
import Grid from './Grid'
import Rectangle from './Rectangle'
import KonvaTransformer from './Transformer'
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

  const { state, createRectangle, updateObject, broadcastObjectUpdate, deleteObjects, duplicateObjects, selectObjects, setTool, realtime } = useCanvas()

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
    // Only handle clicks on the stage itself (not on shapes)
    const clickedOnEmpty = e.target === e.target.getStage()
    
    if (!clickedOnEmpty) {
      return
    }
    
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

  // Handle object selection (with multi-select support)
  const handleObjectSelect = useCallback((objectId: string, event?: any) => {
    if (currentTool === 'select') {
      const isShiftClick = event?.evt?.shiftKey || false
      
      if (isShiftClick) {
        // Multi-select: add/remove from selection
        const currentSelection = state.selectedObjects
        if (currentSelection.includes(objectId)) {
          // Remove from selection
          const newSelection = currentSelection.filter(id => id !== objectId)
          selectObjects(newSelection)
          console.log(`🎯 Removed from selection: ${objectId}`)
        } else {
          // Add to selection
          const newSelection = [...currentSelection, objectId]
          selectObjects(newSelection)
          console.log(`🎯 Added to selection: ${objectId}`)
        }
      } else {
        // Single select: replace selection
        selectObjects([objectId])
        console.log(`🎯 Single selected: ${objectId}`)
      }
    }
  }, [currentTool, selectObjects, state.selectedObjects])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected objects
        if (state.selectedObjects.length > 0) {
          e.preventDefault()
          deleteObjects(state.selectedObjects)
          console.log('⌫ Deleted selected objects')
        }
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        // Duplicate selected objects (Ctrl/Cmd + D)
        if (state.selectedObjects.length > 0) {
          e.preventDefault()
          duplicateObjects(state.selectedObjects)
          console.log('📋 Duplicated selected objects')
        }
      } else if (e.key === 'Escape') {
        // Deselect all
        selectObjects([])
        console.log('🚫 Deselected all objects')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [state.selectedObjects, deleteObjects, duplicateObjects, selectObjects])

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
      className={`w-full h-full max-w-full max-h-full overflow-hidden relative ${className}`}
      style={{ minHeight: '600px' }}
    >
      {/* Realtime Status Indicator */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            realtime.isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className={realtime.isConnected ? 'text-green-700' : 'text-red-700'}>
            {realtime.isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {realtime.onlineUsers.length > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600">
                {realtime.onlineUsers.length} online
              </span>
            </>
          )}
        </div>
        {realtime.error && (
          <div className="text-xs text-red-600 mt-1">
            {realtime.error}
          </div>
        )}
      </div>
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
        {state.objects.map((object) => {
          const isSelected = state.selectedObjects.includes(object.id)
          
          return (
            <Rectangle
              key={object.id}
              object={object}
              isSelected={isSelected}
              onSelect={handleObjectSelect}
              onUpdate={updateObject}
              onRealtimeUpdate={broadcastObjectUpdate}
            />
          )
        })}
        
        {/* Transformer for selected objects */}
        <KonvaTransformer 
          selectedIds={state.selectedObjects}
          onUpdate={updateObject}
        />
        
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
