'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { CanvasObject, CanvasState, CreateObjectPayload } from '@/types/canvas'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useRealtime } from './useRealtime'

export function useCanvas(canvasId: string = 'default', ownershipHandler?: (payload: any) => void, onNewObjectCreated?: (object: any, userId: string, creatorDisplayName?: string) => Promise<void>) {
  const { user } = useAuth()
  const [state, setState] = useState<CanvasState>({
    objects: [],
    selectedObjects: [],
    tool: 'select',
    isCreating: false,
  })

  // Track operations initiated by this client to avoid infinite loops
  const localOperationsRef = useRef<Set<string>>(new Set())

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
    
    console.log('📥 Received object created:', object.id, 'by user:', user_id)
    setState(prev => {
      // Check if object already exists to avoid duplicates
      const exists = prev.objects.some(obj => obj.id === object.id)
      if (exists) {
        console.log('⚠️ Object already exists, skipping:', object.id)
        return prev
      }
      
      return {
        ...prev,
        objects: [...prev.objects, object],
      }
    })
    
    // Notify ownership system about the new object
    if (onNewObjectCreated) {
      onNewObjectCreated(object, user_id, creatorDisplayName)
    }
  }, [user, onNewObjectCreated])

  const handleRealtimeObjectUpdated = useCallback((event: { object: CanvasObject; user_id: string; ownerDisplayName?: string | null }) => {
    const { object, user_id, ownerDisplayName } = event
    
    // Skip if this was our own operation
    if (user && user_id === user.id) {
      console.log('🔄 Skipping own object update:', object.id)
      return
    }
    
    // Skip if we initiated this operation locally
    if (localOperationsRef.current.has(`update-${object.id}`)) {
      console.log('🔄 Skipping local update operation:', object.id)
      localOperationsRef.current.delete(`update-${object.id}`)
      return
    }
    
    console.log('📥 Received object updated:', object.id, 'by user:', user_id, ownerDisplayName ? `(owner: ${ownerDisplayName})` : '')
    setState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => obj.id === object.id ? object : obj),
    }))
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
    
    console.log('📥 Received object deleted:', object_id, 'by user:', user_id)
    setState(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => obj.id !== object_id),
      selectedObjects: prev.selectedObjects.filter(id => id !== object_id),
    }))
  }, [user])

  const handleRealtimeObjectsDeleted = useCallback((event: { object_ids: string[]; user_id: string }) => {
    const { object_ids, user_id } = event
    
    // Skip if this was our own operation
    if (user && user_id === user.id) {
      console.log('🔄 Skipping own batch delete:', object_ids)
      return
    }
    
    console.log('📥 Received batch delete:', object_ids.length, 'objects by user:', user_id)
    setState(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => !object_ids.includes(obj.id)),
      selectedObjects: prev.selectedObjects.filter(id => !object_ids.includes(id)),
    }))
  }, [user])

  const handleRealtimeObjectsDuplicated = useCallback((event: { original_ids: string[]; new_objects: CanvasObject[]; user_id: string; creatorDisplayName?: string }) => {
    const { new_objects, user_id, creatorDisplayName } = event
    
    // Skip if this was our own operation
    if (user && user_id === user.id) {
      console.log('🔄 Skipping own duplication:', new_objects.map(o => o.id))
      return
    }
    
    console.log('📥 Received objects duplicated:', new_objects.length, 'objects by user:', user_id)
    setState(prev => ({
      ...prev,
      objects: [...prev.objects, ...new_objects],
    }))
    
    // Notify ownership system about the new objects  
    if (onNewObjectCreated) {
      new_objects.forEach(object => {
        onNewObjectCreated(object, user_id, creatorDisplayName)
      })
    }
  }, [user, onNewObjectCreated])

  // Initialize realtime integration
  const realtime = useRealtime({
    canvasId,
    onObjectCreated: handleRealtimeObjectCreated,
    onObjectUpdated: handleRealtimeObjectUpdated,
    onObjectDeleted: handleRealtimeObjectDeleted,
    onObjectsDeleted: handleRealtimeObjectsDeleted,
    onObjectsDuplicated: handleRealtimeObjectsDuplicated,
    onOwnershipChanged: ownershipHandler,
  })

  // Load objects from Supabase
  const loadObjects = useCallback(async () => {
    if (!user) {
      console.log('⏳ User not authenticated yet, skipping object load')
      return
    }

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
        color: payload.color || '#3b82f6',
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
      
      // Add to local state
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

  // Removed broadcastObjectUpdate - we only update on drag end now

  // Full update with database persistence (for final updates)
  const updateObject = useCallback(async (id: string, updates: Partial<CanvasObject>) => {
    try {
      console.log(`📝 Updating object ${id}:`, updates)
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
      
      // Update local state
      setState(prev => ({
        ...prev,
        objects: prev.objects.map(obj => obj.id === id ? data : obj),
      }))
      
      // Broadcast to other clients
      await realtime.broadcastObjectUpdated(data)
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
      
      // Update local state
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
      
      // Update local state and select duplicated objects
      setState(prev => ({
        ...prev,
        objects: [...prev.objects, ...data],
        selectedObjects: data.map(obj => obj.id),
      }))
      
      // Broadcast to other clients
      await realtime.broadcastObjectsDuplicated(objectIds, data)
    } catch (error) {
      console.error('❌ Failed to duplicate objects:', error)
    }
  }, [user, canvasId, state.objects, realtime])

  // Set tool
  const setTool = useCallback((tool: CanvasState['tool']) => {
    console.log('🔧 Tool changed to:', tool)
    setState(prev => ({ 
      ...prev, 
      tool,
      selectedObjects: tool !== 'select' ? [] : prev.selectedObjects
    }))
  }, [])

  // Load objects on mount
  useEffect(() => {
    loadObjects()
  }, [loadObjects])

  return {
    state,
    createRectangle,
    updateObject,
    deleteObjects,
    duplicateObjects,
    selectObjects,
    setTool,
    loadObjects,
    // Realtime state and methods
    realtime,
  }
}
