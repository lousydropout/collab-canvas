'use client'

import { useState, useCallback, useEffect } from 'react'
import { CanvasObject, CanvasState, CreateObjectPayload } from '@/types/canvas'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export function useCanvas(canvasId: string = 'default') {
  const { user } = useAuth()
  const [state, setState] = useState<CanvasState>({
    objects: [],
    selectedObjects: [],
    tool: 'select',
    isCreating: false,
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
        owner: 'all',
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
      
      // Add to local state
      setState(prev => ({
        ...prev,
        objects: [...prev.objects, data],
        selectedObjects: [data.id],
      }))

      return data
    } catch (error) {
      console.error('❌ Failed to create rectangle:', error)
      return null
    }
  }, [user, canvasId])

  // Update object
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
      
      // Update local state
      setState(prev => ({
        ...prev,
        objects: prev.objects.map(obj => obj.id === id ? data : obj),
      }))
    } catch (error) {
      console.error('❌ Failed to update object:', error)
    }
  }, [])

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
    } catch (error) {
      console.error('❌ Failed to delete objects:', error)
      console.error('❌ Full error:', error)
    }
  }, [user])

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
        owner: 'all',
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
    } catch (error) {
      console.error('❌ Failed to duplicate objects:', error)
    }
  }, [user, canvasId, state.objects])

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
  }
}
