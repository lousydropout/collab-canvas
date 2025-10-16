'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { CanvasObject, CanvasState, CreateObjectPayload, EllipseData } from '@/types/canvas'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useRealtime } from './useRealtime'
import { loadColorFromLocalStorage, saveColorToLocalStorage } from '@/lib/colorUtils'

export function useCanvas(canvasId: string = 'default', ownershipHandler?: (payload: any) => void, onNewObjectCreated?: (object: any, userId: string, creatorDisplayName?: string) => Promise<void>, onCursorUpdates?: (updates: Array<{userId: string, displayName: string, position: {x: number, y: number}, timestamp: string}>) => void) {
  const { user, profile } = useAuth()
  const [state, setState] = useState<CanvasState>({
    objects: [],
    selectedObjects: [],
    tool: 'select',
    isCreating: false,
    currentColor: loadColorFromLocalStorage(),
  })

  // Track operations initiated by this client to avoid infinite loops
  const localOperationsRef = useRef<Set<string>>(new Set())
  
  // Prevent duplicate object loading
  const isLoadingObjectsRef = useRef(false)
  
  // Store callback functions in refs to prevent re-renders
  const ownershipHandlerRef = useRef(ownershipHandler)
  const onNewObjectCreatedRef = useRef(onNewObjectCreated)
  const onCursorUpdatesRef = useRef(onCursorUpdates)
  
  // Update refs when callbacks change
  useEffect(() => {
    ownershipHandlerRef.current = ownershipHandler
  }, [ownershipHandler])
  
  useEffect(() => {
    onNewObjectCreatedRef.current = onNewObjectCreated
  }, [onNewObjectCreated])
  
  useEffect(() => {
    onCursorUpdatesRef.current = onCursorUpdates
  }, [onCursorUpdates])

  // Queue for batched updates
  const updateQueue = useRef<{
    created: CanvasObject[]
    updated: CanvasObject[]
    deleted: string[]
    duplicated: CanvasObject[]
    cursorUpdates: Map<string, {
      userId: string
      displayName: string
      position: { x: number; y: number }
      timestamp: string
    }>
  }>({
    created: [],
    updated: [],
    deleted: [],
    duplicated: [],
    cursorUpdates: new Map()
  })

  // Flush all queued updates in a single setState call
  const flushUpdates = useCallback(() => {
    const { created, updated, deleted, duplicated, cursorUpdates } = updateQueue.current
    
    if (created.length > 0 || updated.length > 0 || deleted.length > 0 || duplicated.length > 0 || cursorUpdates.size > 0) {
      // Only log when there are significant updates to avoid console spam at 60fps
      const totalUpdates = created.length + updated.length + deleted.length + duplicated.length
      if (totalUpdates > 0) {
        console.log(`🔄 Flushing ${totalUpdates} batched updates`)
      }
      
      setState(prev => {
        let newObjects = [...prev.objects]
        
        // Add created objects
        created.forEach(obj => {
          if (!newObjects.some(existing => existing.id === obj.id)) {
            newObjects.push(obj)
          }
        })
        
        // Add duplicated objects
        duplicated.forEach(obj => {
          if (!newObjects.some(existing => existing.id === obj.id)) {
            newObjects.push(obj)
          }
        })
        
        // Update existing objects
        updated.forEach(obj => {
          newObjects = newObjects.map(existing => 
            existing.id === obj.id ? obj : existing
          )
        })
        
        // Remove deleted objects
        newObjects = newObjects.filter(obj => !deleted.includes(obj.id))
        
        return {
          ...prev,
          objects: newObjects,
          selectedObjects: prev.selectedObjects.filter(id => !deleted.includes(id))
        }
      })
      
      // Process cursor updates
      if (cursorUpdates.size > 0 && onCursorUpdatesRef.current) {
        // Cursor updates processed silently
        onCursorUpdatesRef.current(Array.from(cursorUpdates.values()))
      }
      
      // Clear the queue
      updateQueue.current = { created: [], updated: [], deleted: [], duplicated: [], cursorUpdates: new Map() }
    }
  }, [])

  // Realtime event handlers
  const handleRealtimeObjectCreated = useCallback((event: { object: CanvasObject; user_id: string; creatorDisplayName?: string }) => {
    const { object, user_id, creatorDisplayName } = event
    
    // Skip if this was our own operation
    if (user && user_id === user.id) {
      console.log('🔄 Skipping own object creation:', object.id)
      return
    }
    
    // Skip if we initiated this operation locally
    if (localOperationsRef.current.has(object.id)) {
      console.log('🔄 Skipping local operation:', object.id)
      localOperationsRef.current.delete(object.id)
      return
    }
    
    console.log('📥 Queuing object created:', object.id, 'by user:', user_id)
    updateQueue.current.created.push(object)
    
    // Notify ownership system about the new object
    if (onNewObjectCreatedRef.current) {
      onNewObjectCreatedRef.current(object, user_id, creatorDisplayName)
    }
  }, [user])

  const handleRealtimeObjectUpdated = useCallback((event: { object: CanvasObject; user_id: string; ownerDisplayName?: string | null }) => {
    const { object, user_id, ownerDisplayName } = event
    
    // Skip if this was our own operation
    if (user && user_id === user.id) {
      console.log('🔄 Skipping own object update:', object.id)
      return
    }
    
    // Skip if we initiated this operation locally (but only for a short time)
    const localUpdateKey = `update-${object.id}`
    if (localOperationsRef.current.has(localUpdateKey)) {
      console.log('🔄 Skipping local update operation:', object.id)
      localOperationsRef.current.delete(localUpdateKey)
      return
    }
    
    console.log('📥 Queuing object updated:', object.id, 'by user:', user_id, ownerDisplayName ? `(owner: ${ownerDisplayName})` : '')
    updateQueue.current.updated.push(object)
  }, [user])

  const handleRealtimeObjectDeleted = useCallback((event: { object_id: string; user_id: string }) => {
    const { object_id, user_id } = event
    
    // Skip if this was our own operation
    if (user && user_id === user.id) {
      console.log('🔄 Skipping own object deletion:', object_id)
      return
    }
    
    // Skip if we initiated this operation locally
    if (localOperationsRef.current.has(`delete-${object_id}`)) {
      console.log('🔄 Skipping local delete operation:', object_id)
      localOperationsRef.current.delete(`delete-${object_id}`)
      return
    }
    
    console.log('📥 Queuing object deleted:', object_id, 'by user:', user_id)
    updateQueue.current.deleted.push(object_id)
  }, [user])

  const handleRealtimeObjectsDeleted = useCallback((event: { object_ids: string[]; user_id: string }) => {
    const { object_ids, user_id } = event
    
    // Skip if this was our own operation
    if (user && user_id === user.id) {
      console.log('🔄 Skipping own batch delete:', object_ids)
      return
    }
    
    console.log('📥 Queuing batch delete:', object_ids.length, 'objects by user:', user_id)
    updateQueue.current.deleted.push(...object_ids)
  }, [user])

  const handleRealtimeObjectsDuplicated = useCallback((event: { original_ids: string[]; new_objects: CanvasObject[]; user_id: string; creatorDisplayName?: string }) => {
    const { new_objects, user_id, creatorDisplayName } = event
    
    // Skip if this was our own operation
    if (user && user_id === user.id) {
      console.log('🔄 Skipping own duplication:', new_objects.map(o => o.id))
      return
    }
    
    console.log('📥 Queuing objects duplicated:', new_objects.length, 'objects by user:', user_id)
    updateQueue.current.duplicated.push(...new_objects)
    
    // Notify ownership system about the new objects  
    if (onNewObjectCreatedRef.current) {
      new_objects.forEach(object => {
        onNewObjectCreatedRef.current!(object, user_id, creatorDisplayName)
      })
    }
  }, [user])

  // Handle cursor movement from other users
  const handleRealtimeCursorMoved = useCallback((event: any) => {
    // Don't queue our own cursor updates
    if (user && event.user_id === user.id) {
      return
    }
    
    // Cursor update queued silently
    // Use Map to store only the latest position per user (prevents queue buildup)
    updateQueue.current.cursorUpdates.set(event.user_id, {
      userId: event.user_id,
      displayName: event.display_name,
      position: event.position,
      timestamp: event.timestamp
    })
  }, [user])

  // Initialize realtime integration
  const realtime = useRealtime({
    canvasId,
    onObjectCreated: handleRealtimeObjectCreated,
    onObjectUpdated: handleRealtimeObjectUpdated,
    onObjectDeleted: handleRealtimeObjectDeleted,
    onObjectsDeleted: handleRealtimeObjectsDeleted,
    onObjectsDuplicated: handleRealtimeObjectsDuplicated,
    onCursorMoved: handleRealtimeCursorMoved,
    onOwnershipChanged: ownershipHandlerRef.current,
  })

  // Batch updates using setInterval - flushes every 16ms (60fps) for smooth cursor movement
  useEffect(() => {
    const interval = setInterval(() => {
      const { created, updated, deleted, duplicated, cursorUpdates } = updateQueue.current
      const totalUpdates = created.length + updated.length + deleted.length + duplicated.length + cursorUpdates.size
      
      if (totalUpdates > 0) {
        flushUpdates()
      }
    }, 16) // 60fps for smooth cursor movement
    
    return () => clearInterval(interval)
  }, [flushUpdates])

  // Load objects from Supabase
  const loadObjects = useCallback(async () => {
    if (!user) {
      console.log('⏳ User not authenticated yet, skipping object load')
      return
    }
    
    if (isLoadingObjectsRef.current) {
      return // Already loading, skip
    }
    
    isLoadingObjectsRef.current = true

    try {
      console.log('📥 Loading canvas objects...')
      const { data, error } = await supabase
        .from('canvas_objects')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Error loading objects:', error)
        return
      }

      console.log(`✅ Loaded ${data?.length || 0} canvas objects`)
      setState(prev => ({ ...prev, objects: data || [] }))
    } catch (error) {
      console.error('❌ Failed to load objects:', error)
    } finally {
      isLoadingObjectsRef.current = false
    }
  }, [canvasId, user])

  // Create new rectangle
  const createRectangle = useCallback(async (payload: CreateObjectPayload) => {
    if (!user) {
      console.error('❌ User not authenticated')
      return null
    }

    try {
      console.log('📦 Creating rectangle:', payload)
      const objectData = {
        canvas_id: canvasId,
        type: 'rectangle' as const,
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height,
        color: payload.color || state.currentColor,
        rotation: payload.rotation || 0,
        owner: user.id, // Creator automatically owns the object
        created_by: user.id,
      }

      const { data, error } = await supabase
        .from('canvas_objects')
        .insert([objectData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating rectangle:', error)
        return null
      }

      console.log('✅ Rectangle created:', data)
      
      // Track this as a local operation to prevent loop when we receive our own DB change
      localOperationsRef.current.add(data.id)
      
      // Initialize ownership state FIRST (before adding to canvas state)
      if (onNewObjectCreated) {
        console.log('🏷️ Initializing ownership state for creator:', data.id)
        await onNewObjectCreated(data, user.id, profile?.display_name)
      }
      
      // Add to local state AFTER ownership is initialized (prevents race condition)
      setState(prev => ({
        ...prev,
        objects: [...prev.objects, data],
        selectedObjects: [data.id],
      }))

      // Broadcast to other clients
      await realtime.broadcastObjectCreated(data)

      return data
    } catch (error) {
      console.error('❌ Failed to create rectangle:', error)
      return null
    }
  }, [user, canvasId, realtime])

  // Create new ellipse
  const createEllipse = useCallback(async (data: EllipseData) => {
    if (!user) {
      console.error('❌ User not authenticated')
      return null
    }

    try {
      console.log('🔵 Creating ellipse:', data)
      const objectData = {
        canvas_id: canvasId,
        type: 'ellipse' as const,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        color: data.color || state.currentColor,
        rotation: data.rotation || 0,
        owner: user.id, // Creator automatically owns the object
        created_by: user.id,
      }

      const { data: newObject, error } = await supabase
        .from('canvas_objects')
        .insert([objectData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating ellipse:', error)
        return null
      }

      console.log('✅ Ellipse created:', newObject)
      
      // Track this as a local operation to prevent loop when we receive our own DB change
      localOperationsRef.current.add(newObject.id)
      
      // Initialize ownership state FIRST (before adding to canvas state)
      if (onNewObjectCreated) {
        console.log('🏷️ Initializing ownership state for creator:', newObject.id)
        await onNewObjectCreated(newObject, user.id, profile?.display_name)
      }
      
      // Add to local state AFTER ownership is initialized (prevents race condition)
      setState(prev => ({
        ...prev,
        objects: [...prev.objects, newObject],
        selectedObjects: [newObject.id],
      }))

      // Broadcast to other clients
      await realtime.broadcastObjectCreated(newObject)

      return newObject
    } catch (error) {
      console.error('❌ Failed to create ellipse:', error)
      return null
    }
  }, [user, canvasId, realtime])

  // Removed broadcastObjectUpdate - we only update on drag end now

  // Full update with database persistence (for final updates)
  const updateObject = useCallback(async (id: string, updates: Partial<CanvasObject>) => {
    try {
      console.log(`📝 Updating object ${id}:`, updates)
      console.log(`📝 Update details - x: ${updates.x}, y: ${updates.y}, width: ${updates.width}, height: ${updates.height}, rotation: ${updates.rotation}`)
      
      const { data, error } = await supabase
        .from('canvas_objects')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error updating object:', error)
        return
      }

      console.log('✅ Object updated:', data)
      
      // Track this as a local operation to prevent loop when we receive our own DB change
      localOperationsRef.current.add(`update-${id}`)
      
      // Update local state immediately (optimistic update)
      setState(prev => ({
        ...prev,
        objects: prev.objects.map(obj => obj.id === id ? data : obj),
      }))
      
      // Broadcast to other clients
      console.log('📡 Broadcasting object update to other clients...')
      await realtime.broadcastObjectUpdated(data)
      console.log('📡 Broadcast sent successfully')
    } catch (error) {
      console.error('❌ Failed to update object:', error)
    }
  }, [realtime])

  // Select objects
  const selectObjects = useCallback((objectIds: string[]) => {
    console.log('🎯 Selected objects:', objectIds)
    setState(prev => ({ ...prev, selectedObjects: objectIds }))
  }, [])

  // Delete objects
  const deleteObjects = useCallback(async (objectIds: string[]) => {
    if (!user || objectIds.length === 0) return

    try {
      console.log('🗑️ Deleting objects:', objectIds)
      
      const { error } = await supabase
        .from('canvas_objects')
        .delete()
        .in('id', objectIds)

      if (error) {
        console.error('❌ Error deleting objects:', error)
        return
      }

      console.log('✅ Objects deleted')
      
      // Track these as local operations to prevent loop when we receive our own DB change
      objectIds.forEach(id => {
        localOperationsRef.current.add(`delete-${id}`)
      })
      
      // Update local state immediately (optimistic update)
      setState(prev => ({
        ...prev,
        objects: prev.objects.filter(obj => !objectIds.includes(obj.id)),
        selectedObjects: [],
      }))
      
      // Broadcast to other clients - use batch operation for multiple objects
      if (objectIds.length === 1) {
        await realtime.broadcastObjectDeleted(objectIds[0])
      } else {
        await realtime.broadcastObjectsDeleted(objectIds)
      }
    } catch (error) {
      console.error('❌ Failed to delete objects:', error)
      console.error('❌ Full error:', error)
    }
  }, [user, realtime])

  // Duplicate objects
  const duplicateObjects = useCallback(async (objectIds: string[]) => {
    if (!user || objectIds.length === 0) return

    try {
      console.log('📋 Duplicating objects:', objectIds)
      const objectsToDuplicate = state.objects.filter(obj => objectIds.includes(obj.id))
      
      const duplicatedObjects = objectsToDuplicate.map(obj => ({
        canvas_id: canvasId,
        type: obj.type,
        x: obj.x + 20, // Offset by 20px
        y: obj.y + 20,
        width: obj.width,
        height: obj.height,
        color: obj.color,
        rotation: obj.rotation,
        owner: user.id, // Duplicator automatically owns the new objects
        created_by: user.id,
      }))

      const { data, error } = await supabase
        .from('canvas_objects')
        .insert(duplicatedObjects)
        .select('*')

      if (error) {
        console.error('❌ Error duplicating objects:', error)
        return
      }

      console.log('✅ Objects duplicated:', data)
      
      // Track these as local operations to prevent loop when we receive our own DB change
      data.forEach(obj => {
        localOperationsRef.current.add(obj.id)
      })
      
      // Update local state immediately (optimistic update)
      setState(prev => ({
        ...prev,
        objects: [...prev.objects, ...data],
        selectedObjects: data.map(obj => obj.id),
      }))
      
      // Initialize ownership state for the creator (since we skip broadcast handling for our own objects)
      if (onNewObjectCreated) {
        console.log('🏷️ Initializing ownership state for duplicated objects:', data.map(obj => obj.id))
        for (const obj of data) {
          await onNewObjectCreated(obj, user.id, profile?.display_name)
        }
      }
      
      // Broadcast to other clients
      await realtime.broadcastObjectsDuplicated(objectIds, data)
    } catch (error) {
      console.error('❌ Failed to duplicate objects:', error)
    }
  }, [user, canvasId, state.objects, realtime])

  // Set tool
  const setTool = useCallback((tool: CanvasState['tool']) => {
    setState(prev => {
      // Only log if tool actually changed
      if (prev.tool !== tool) {
        console.log('🔧 Tool changed to:', tool)
      }
      return { 
        ...prev, 
        tool,
        selectedObjects: tool !== 'select' ? [] : prev.selectedObjects
      }
    })
  }, [])

  // Set color
  const setColor = useCallback((color: string) => {
    console.log('🎨 Color changed to:', color)
    saveColorToLocalStorage(color)
    setState(prev => ({ ...prev, currentColor: color }))
  }, [])

  // Temporary z-index operations (until CanvasOperations service is integrated)
  const bringToFront = useCallback(async (objectIds: string | string[]) => {
    try {
      // Handle both single object and multiple objects
      const ids = Array.isArray(objectIds) ? objectIds : [objectIds]
      console.log('🔝 Bringing objects to front:', ids)
      
      // Fetch current max z_index directly from database to avoid stale state
      const { data: objects, error: fetchError } = await supabase
        .from('canvas_objects')
        .select('z_index')
        .eq('canvas_id', canvasId)
        .order('z_index', { ascending: false })
        .limit(1)
      
      if (fetchError) {
        console.error('❌ Failed to fetch max z_index:', fetchError)
        return
      }
      
      const maxZIndex = objects && objects.length > 0 ? (objects[0].z_index || 0) : 0
      console.log('📊 Current max z_index:', maxZIndex)
      
      // Assign sequential z_index values starting from maxZIndex + 1
      for (let i = 0; i < ids.length; i++) {
        const newZIndex = maxZIndex + 1 + i
        await updateObject(ids[i], { z_index: newZIndex })
        console.log(`✅ Object ${ids[i]} brought to front with z_index: ${newZIndex}`)
      }
    } catch (error) {
      console.error('❌ Failed to bring objects to front:', error)
    }
  }, [canvasId, updateObject])

  // Load objects on mount
  useEffect(() => {
    loadObjects()
  }, [loadObjects])

  return {
    state,
    createRectangle,
    createEllipse,
    updateObject,
    deleteObjects,
    duplicateObjects,
    selectObjects,
    setTool,
    setColor,
    loadObjects,
    // Temporary z-index operations
    bringToFront,
    // Realtime state and methods
    realtime,
  }
}
