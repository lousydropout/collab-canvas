'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import CanvasStage from './CanvasStage'
import Grid from './Grid'
import Rectangle from './Rectangle'
import KonvaTransformer from './Transformer'
import Cursor from './Cursor'
import { useCanvas } from '@/hooks/useCanvas'
import { useOwnership } from '@/hooks/useOwnership'
import { useAuth } from '@/hooks/useAuth'
import { CanvasState } from '@/types/canvas'

interface CanvasProps {
  className?: string
  currentTool: CanvasState['tool']
  onToolChange: (tool: CanvasState['tool']) => void
}

export default function Canvas({ className = '', currentTool, onToolChange }: CanvasProps) {
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [currentScale, setCurrentScale] = useState(1)
  const [isCreatingRect, setIsCreatingRect] = useState(false)
  const [creatingRect, setCreatingRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const [isHoveringObject, setIsHoveringObject] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Cursor position tracking refs
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null)
  const lastCursorUpdateRef = useRef<number>(0)
  
  // Other users' cursor positions
  const [otherCursors, setOtherCursors] = useState<Map<string, {
    userId: string
    displayName: string
    position: { x: number; y: number }
    lastSeen: number
    color: string
  }>>(new Map())

  // Generate consistent color for each user based on their ID
  const getUserColor = useCallback((userId: string) => {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
      '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#84cc16'
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }, [])

  // Initialize ownership system first
  const ownership = useOwnership({
    canvasId: 'default',
    onOwnershipClaimed: (event) => {
      console.log(`🏷️ Ownership claimed: ${event.object_id} by ${event.owner_name}`)
    },
    onOwnershipReleased: (event) => {
      console.log(`🏷️ Ownership released: ${event.object_id}`)
    },
    onOwnershipRejected: (event) => {
      console.log(`🏷️ Ownership rejected: ${event.object_id} (claimed by ${event.current_owner_name})`)
    },
  })

  // Handle cursor movements from other users
  const handleOtherUserCursor = useCallback((event: any) => {
    // Don't track our own cursor
    if (event.user_id === user?.id) return
    
    console.log('👆 Rendering cursor for user:', event.display_name, event.position)
    
    setOtherCursors(prev => {
      const updated = new Map(prev)
      updated.set(event.user_id, {
        userId: event.user_id,
        displayName: event.display_name,
        position: event.position,
        lastSeen: Date.now(),
        color: getUserColor(event.user_id)
      })
      return updated
    })
  }, [user?.id, getUserColor])

  const { state, createRectangle, updateObject, deleteObjects, duplicateObjects, selectObjects, setTool, realtime } = useCanvas('default', (payload) => {
    // Handle ownership updates
    ownership.handleCanvasObjectUpdate(payload)
    
    // Auto-deselect objects that become owned by someone else
    const { new: newRecord, old: oldRecord } = payload
    if (newRecord?.id && newRecord.owner !== oldRecord?.owner) {
      const objectId = newRecord.id
      const newOwner = newRecord.owner
      
      // If object is now owned by someone else (not 'all' and not current user)
      if (newOwner !== 'all' && newOwner !== user?.id && state.selectedObjects.includes(objectId)) {
        console.log(`🚫 Auto-deselecting object ${objectId} - now owned by someone else`)
        selectObjects(state.selectedObjects.filter(id => id !== objectId))
      }
    }
  }, ownership.handleNewObjectCreated, handleOtherUserCursor)

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
  const handleCanvasClick = useCallback(async (e: any) => {
    // Only handle clicks on the stage itself (not on shapes)
    const clickedOnEmpty = e.target === e.target.getStage()
    
    if (!clickedOnEmpty) {
      return
    }
    
    const stage = e.target.getStage()
    const pointerPos = stage.getPointerPosition()
    const isShiftClick = e.evt?.shiftKey || false
    
    if (currentTool === 'rectangle' && pointerPos) {
      // Convert screen coordinates to stage coordinates
      const stagePos = {
        x: (pointerPos.x - stage.x()) / stage.scaleX(),
        y: (pointerPos.y - stage.y()) / stage.scaleY()
      }
      
      if (!isCreatingRect) {
        // Start rectangle creation
        console.log('🚀 Starting rectangle creation at stage coords:', stagePos)
        setIsCreatingRect(true)
        setIsDragging(false) // Reset drag state
        setCreatingRect({
          startX: stagePos.x,
          startY: stagePos.y,
          endX: stagePos.x,
          endY: stagePos.y,
        })
      } else if (creatingRect && !isDragging) {
        // Finish rectangle creation (click-to-finish workflow)
        // Only if we haven't been dragging (to avoid conflict with drag workflow)
        console.log('🏁 Finishing rectangle creation at stage coords:', stagePos)
        const width = Math.abs(stagePos.x - creatingRect.startX)
        const height = Math.abs(stagePos.y - creatingRect.startY)
        
        // Create rectangle with minimum size of 50x50 if too small
        const finalWidth = Math.max(width, 50)
        const finalHeight = Math.max(height, 50)
        const x = Math.min(creatingRect.startX, stagePos.x)
        const y = Math.min(creatingRect.startY, stagePos.y)
        
        await createRectangle({
          type: 'rectangle',
          x,
          y,
          width: finalWidth,
          height: finalHeight,
          color: '#3b82f6',
        })
        
        console.log('✅ Rectangle created!')
        setIsCreatingRect(false)
        setCreatingRect(null)
        setIsDragging(false)
        onToolChange('select') // Switch back to select tool
      }
    } else if (currentTool === 'select') {
      // Deselect all when clicking empty space
      selectObjects([])
      
      // Release ownership of all objects when clicking empty space (unless shift is held)
      if (!isShiftClick) {
        console.log('🏷️ Releasing all ownership due to empty space click')
        ownership.releaseAllObjects()
      }
    }
  }, [currentTool, isCreatingRect, creatingRect, isDragging, selectObjects, ownership, createRectangle, onToolChange])

  // Handle mouse move during rectangle creation and cursor updates
  const handleMouseMove = useCallback((e: any) => {
    const stage = e.target.getStage()
    const pointerPos = stage.getPointerPosition()
    
    // Track cursor position for multiplayer cursors (throttled to ~50ms)
    if (pointerPos) {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastCursorUpdateRef.current
      
      // Convert screen coordinates to stage coordinates for consistent positioning
      const stagePos = {
        x: (pointerPos.x - stage.x()) / stage.scaleX(),
        y: (pointerPos.y - stage.y()) / stage.scaleY()
      }
      
      // Throttle cursor updates to ~50ms (20 FPS) for good responsiveness
      if (timeSinceLastUpdate >= 50) {
        // Clear any pending throttled update
        if (cursorThrottleRef.current) {
          clearTimeout(cursorThrottleRef.current)
          cursorThrottleRef.current = null
        }
        
        // Update cursor position immediately
        realtime.broadcastCursorMoved(stagePos)
        lastCursorUpdateRef.current = now
        console.log('🎯 Cursor position updated:', stagePos)
      } else {
        // Schedule a throttled update if none is pending
        if (!cursorThrottleRef.current) {
          cursorThrottleRef.current = setTimeout(() => {
            realtime.broadcastCursorMoved(stagePos)
            lastCursorUpdateRef.current = Date.now()
            cursorThrottleRef.current = null
            console.log('🎯 Cursor position updated (throttled):', stagePos)
          }, 50 - timeSinceLastUpdate)
        }
      }
    }
    
    // Handle rectangle creation
    if (isCreatingRect && creatingRect) {
      if (pointerPos) {
        // Convert screen coordinates to stage coordinates
        const stagePos = {
          x: (pointerPos.x - stage.x()) / stage.scaleX(),
          y: (pointerPos.y - stage.y()) / stage.scaleY()
        }
        
        // Check if we've moved enough to consider this a drag
        const dragDistance = Math.abs(stagePos.x - creatingRect.startX) + Math.abs(stagePos.y - creatingRect.startY)
        if (dragDistance > 5) {
          setIsDragging(true)
        }
        
        setCreatingRect(prev => prev ? {
          ...prev,
          endX: stagePos.x,
          endY: stagePos.y,
        } : null)
      }
    }
    
    // Update cursor state for select tool
    if (currentTool === 'select') {
      const target = e.target
      const isOverObject = target !== target.getStage()
      setIsHoveringObject(isOverObject)
    }
  }, [isCreatingRect, creatingRect, currentTool, realtime])

  // Handle mouse up to finish rectangle creation (drag workflow only)
  const handleMouseUp = useCallback(async () => {
    if (isCreatingRect && creatingRect && isDragging) {
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
        
        console.log('✅ Rectangle created via drag!')
      }
      
      setIsCreatingRect(false)
      setCreatingRect(null)
      setIsDragging(false)
      onToolChange('select') // Switch back to select tool
    }
  }, [isCreatingRect, creatingRect, isDragging, createRectangle, onToolChange])

  // Handle object selection (with multi-select support)
  const handleObjectSelect = useCallback((objectId: string, event?: any) => {
    if (currentTool === 'select') {
      // Check if we can edit/select this object
      const canSelectObject = ownership.canEdit(objectId)
      
      if (!canSelectObject) {
        console.log(`🚫 Cannot select object ${objectId}: owned by someone else`)
        return
      }
      
      const isShiftClick = event?.evt?.shiftKey || false
      
      // Release ownership of all other objects unless shift is held
      if (!isShiftClick) {
        console.log(`🏷️ Releasing ownership of all objects except: ${objectId}`)
        ownership.releaseAllExcept(objectId)
      }
      
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
  }, [currentTool, selectObjects, state.selectedObjects, ownership])

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
        e.preventDefault()
        
        // Cancel rectangle creation if in progress
        if (isCreatingRect) {
          setIsCreatingRect(false)
          setCreatingRect(null)
          setIsDragging(false)
          onToolChange('select')
          console.log('🚫 Cancelled rectangle creation')
        } else {
          // Deselect all and release ownership
          selectObjects([])
          ownership.releaseAllObjects()
          console.log('🚫 Deselected all objects and released ownership')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [state.selectedObjects, deleteObjects, duplicateObjects, selectObjects, ownership, isCreatingRect, onToolChange])

  // Cleanup cursor throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current)
      }
    }
  }, [])


  // Cleanup stale cursors (remove cursors that haven't been seen for 5 seconds)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      setOtherCursors(prev => {
        const updated = new Map(prev)
        let hasChanges = false
        
        for (const [userId, cursor] of updated.entries()) {
          if (now - cursor.lastSeen > 5000) { // 5 seconds timeout
            console.log('🧹 Removing stale cursor for user:', cursor.displayName)
            updated.delete(userId)
            hasChanges = true
          }
        }
        
        return hasChanges ? new Map(updated) : prev
      })
    }, 1000) // Check every second

    return () => clearInterval(cleanupInterval)
  }, [])

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
            realtime.isConnected && ownership.isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className={realtime.isConnected && ownership.isConnected ? 'text-green-700' : 'text-red-700'}>
            {realtime.isConnected && ownership.isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {realtime.onlineUsers.length > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600">
                {realtime.onlineUsers.length} online
              </span>
            </>
          )}
          {ownership.pendingClaims.size > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-yellow-600">
                {ownership.pendingClaims.size} claiming
              </span>
            </>
          )}
        </div>
        {(realtime.error || !ownership.isConnected) && (
          <div className="text-xs text-red-600 mt-1">
            {realtime.error || 'Ownership system disconnected'}
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
        onMouseLeave={() => setIsHoveringObject(false)}
        cursor={
          currentTool === 'rectangle' 
            ? 'crosshair' 
            : currentTool === 'select' && isHoveringObject 
              ? 'pointer' 
              : 'default'
        }
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
          const ownershipStatus = ownership.getOwnershipStatus(object.id)
          const ownerInfo = ownership.getOwnerInfo(object.id)
          const isPendingClaim = ownership.pendingClaims.has(object.id)
          
          return (
            <Rectangle
              key={object.id}
              object={object}
              isSelected={isSelected}
              onSelect={handleObjectSelect}
              onUpdate={updateObject}
              ownershipStatus={ownershipStatus}
              ownerInfo={ownerInfo}
              isPendingClaim={isPendingClaim}
              onClaimAttempt={ownership.claimObject}
            />
          )
        })}
        
        {/* Transformer for selected objects */}
        <KonvaTransformer 
          selectedIds={state.selectedObjects}
          onUpdate={updateObject}
        />
        
        {/* Other users' cursors */}
        {Array.from(otherCursors.values()).map((cursor) => (
          <Cursor
            key={cursor.userId}
            userId={cursor.userId}
            displayName={cursor.displayName}
            position={cursor.position}
            color={cursor.color}
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
