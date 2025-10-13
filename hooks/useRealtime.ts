'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel, REALTIME_LISTEN_TYPES } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { RealtimeEvents, PresenceState, RealtimeState, CanvasObject } from '@/types/realtime'
import { useAuth } from './useAuth'

interface UseRealtimeProps {
  canvasId: string
  onObjectCreated?: (event: RealtimeEvents['object_created']) => void
  onObjectUpdated?: (event: RealtimeEvents['object_updated']) => void  
  onObjectDeleted?: (event: RealtimeEvents['object_deleted']) => void
  onObjectsDeleted?: (event: RealtimeEvents['objects_deleted']) => void
  onObjectsDuplicated?: (event: RealtimeEvents['objects_duplicated']) => void
}

export function useRealtime({
  canvasId,
  onObjectCreated,
  onObjectUpdated,
  onObjectDeleted,
  onObjectsDeleted,
  onObjectsDuplicated,
}: UseRealtimeProps) {
  const { user, profile } = useAuth()
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    onlineUsers: [],
    error: null,
  })
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)

  // Broadcast an object creation
  const broadcastObjectCreated = useCallback(async (object: CanvasObject) => {
    if (!channelRef.current || !user) return

    console.log('📡 Broadcasting object created:', object.id)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'object_created',
      payload: {
        object,
        user_id: user.id,
      },
    })
  }, [user])

  // Broadcast an object update
  const broadcastObjectUpdated = useCallback(async (object: CanvasObject) => {
    if (!channelRef.current || !user) return

    console.log('📡 Broadcasting object updated:', object.id)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'object_updated',
      payload: {
        object,
        user_id: user.id,
      },
    })
  }, [user])

  // Broadcast an object deletion
  const broadcastObjectDeleted = useCallback(async (objectId: string) => {
    if (!channelRef.current || !user) return

    console.log('📡 Broadcasting object deleted:', objectId)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'object_deleted',
      payload: {
        object_id: objectId,
        user_id: user.id,
      },
    })
  }, [user])

  // Broadcast multiple objects deletion
  const broadcastObjectsDeleted = useCallback(async (objectIds: string[]) => {
    if (!channelRef.current || !user || objectIds.length === 0) return

    console.log('📡 Broadcasting objects deleted:', objectIds)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'objects_deleted',
      payload: {
        object_ids: objectIds,
        user_id: user.id,
      },
    })
  }, [user])

  // Broadcast object duplication
  const broadcastObjectsDuplicated = useCallback(async (originalIds: string[], newObjects: CanvasObject[]) => {
    if (!channelRef.current || !user) return

    console.log('📡 Broadcasting objects duplicated:', originalIds.length, 'objects')
    await channelRef.current.send({
      type: 'broadcast',
      event: 'objects_duplicated',
      payload: {
        original_ids: originalIds,
        new_objects: newObjects,
        user_id: user.id,
      },
    })
  }, [user])

  // Update cursor position in presence
  const updateCursorPosition = useCallback(async (position: { x: number; y: number }) => {
    if (!presenceChannelRef.current || !user || !profile?.display_name) return

    await presenceChannelRef.current.track({
      user_id: user.id,
      display_name: profile.display_name,
      cursor_position: position,
      last_seen: new Date().toISOString(),
    })
  }, [user, profile])

  // Update selected objects in presence
  const updateSelectedObjects = useCallback(async (selectedObjects: string[]) => {
    if (!presenceChannelRef.current || !user || !profile?.display_name) return

    await presenceChannelRef.current.track({
      user_id: user.id,
      display_name: profile.display_name,
      selected_objects: selectedObjects,
      last_seen: new Date().toISOString(),
    })
  }, [user, profile])

  // Initialize realtime channels
  useEffect(() => {
    if (!user || !profile) {
      console.log('⏳ Waiting for user authentication before setting up realtime...')
      return
    }

    console.log('🚀 Setting up realtime channels for canvas:', canvasId)
    
    // Create main canvas channel for object synchronization
    const channel = supabase.channel(`canvas:${canvasId}`, {
      config: {
        broadcast: { self: true }, // Allow receiving broadcasts (we'll filter our own)
      },
    })

    // Subscribe to database changes
    channel
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_objects',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          console.log('📥 Database INSERT received:', payload)
          if (onObjectCreated && payload.new) {
            onObjectCreated({
              object: payload.new as CanvasObject,
              user_id: payload.new.created_by || 'unknown',
            })
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_objects',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          console.log('📥 Database UPDATE received:', payload)
          if (onObjectUpdated && payload.new) {
            onObjectUpdated({
              object: payload.new as CanvasObject,
              user_id: payload.new.created_by || 'unknown',
            })
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'canvas_objects',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          console.log('📥 Database DELETE received:', payload)
          if (onObjectDeleted && payload.old) {
            onObjectDeleted({
              object_id: payload.old.id,
              user_id: 'unknown', // Can't determine from DELETE event
            })
          }
        }
      )

    // Subscribe to broadcast events for batch operations
    channel
      .on('broadcast', { event: 'objects_deleted' }, (payload) => {
        console.log('📥 Broadcast objects_deleted received:', payload)
        if (onObjectsDeleted) {
          onObjectsDeleted(payload.payload as RealtimeEvents['objects_deleted'])
        }
      })
      .on('broadcast', { event: 'objects_duplicated' }, (payload) => {
        console.log('📥 Broadcast objects_duplicated received:', payload)
        if (onObjectsDuplicated) {
          onObjectsDuplicated(payload.payload as RealtimeEvents['objects_duplicated'])
        }
      })
      // Add broadcast listeners as fallback for individual operations
      .on('broadcast', { event: 'object_created' }, (payload) => {
        console.log('📥 Broadcast object_created received:', payload)
        if (onObjectCreated) {
          onObjectCreated(payload.payload as RealtimeEvents['object_created'])
        }
      })
      .on('broadcast', { event: 'object_updated' }, (payload) => {
        console.log('📥 Broadcast object_updated received:', payload)
        if (onObjectUpdated) {
          onObjectUpdated(payload.payload as RealtimeEvents['object_updated'])
        }
      })
      .on('broadcast', { event: 'object_deleted' }, (payload) => {
        console.log('📥 Broadcast object_deleted received:', payload)
        if (onObjectDeleted) {
          onObjectDeleted(payload.payload as RealtimeEvents['object_deleted'])
        }
      })

    channelRef.current = channel

    // Create presence channel for online users
    const presenceChannel = supabase.channel(`presence:${canvasId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        console.log('👥 Presence sync')
        const presenceState = presenceChannel.presenceState()
        const onlineUsers: PresenceState[] = []
        
        Object.values(presenceState).forEach((users: any) => {
          users.forEach((user: PresenceState) => {
            onlineUsers.push(user)
          })
        })
        
        setState(prev => ({ ...prev, onlineUsers }))
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 User left:', key, leftPresences)
      })

    presenceChannelRef.current = presenceChannel

    // Subscribe to both channels
    const subscribeChannels = async () => {
      try {
        console.log('🔗 Subscribing to realtime channels...')
        
        await Promise.all([
          channel.subscribe((status) => {
            console.log('📡 Canvas channel status:', status)
            setState(prev => ({ 
              ...prev, 
              isConnected: status === 'SUBSCRIBED',
              error: status === 'CHANNEL_ERROR' ? 'Failed to connect to canvas channel' : null
            }))
          }),
          presenceChannel.subscribe(async (status) => {
            console.log('👥 Presence channel status:', status)
            if (status === 'SUBSCRIBED') {
              // Join presence with initial state (only if profile is loaded)
              if (profile?.display_name) {
                await presenceChannel.track({
                  user_id: user.id,
                  display_name: profile.display_name,
                  last_seen: new Date().toISOString(),
                })
              }
            }
          }),
        ])
      } catch (error) {
        console.error('❌ Failed to subscribe to channels:', error)
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to connect'
        }))
      }
    }

    subscribeChannels()

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up realtime channels')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current)
        presenceChannelRef.current = null
      }
      setState({
        isConnected: false,
        onlineUsers: [],
        error: null,
      })
    }
  }, [user, profile, canvasId, onObjectCreated, onObjectUpdated, onObjectDeleted, onObjectsDeleted, onObjectsDuplicated])

  // Track presence once profile is loaded (separate effect to handle async profile loading)
  useEffect(() => {
    if (presenceChannelRef.current && user && profile?.display_name) {
      console.log('👤 Updating presence with profile:', profile.display_name)
      presenceChannelRef.current.track({
        user_id: user.id,
        display_name: profile.display_name,
        last_seen: new Date().toISOString(),
      })
    }
  }, [user, profile?.display_name])

  return {
    ...state,
    broadcastObjectCreated,
    broadcastObjectUpdated,
    broadcastObjectDeleted,
    broadcastObjectsDeleted,
    broadcastObjectsDuplicated,
    updateCursorPosition,
    updateSelectedObjects,
  }
}
