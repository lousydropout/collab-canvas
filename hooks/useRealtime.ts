'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel, REALTIME_LISTEN_TYPES } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { RealtimeEvents, PresenceState, RealtimeState, CanvasObject } from '@/types/realtime'
import { useAuth } from './useAuth'
import { AuthService } from '@/lib/supabase/auth'

interface UseRealtimeProps {
  canvasId: string
  onObjectCreated?: (event: RealtimeEvents['object_created']) => void
  onObjectUpdated?: (event: RealtimeEvents['object_updated']) => void  
  onObjectDeleted?: (event: RealtimeEvents['object_deleted']) => void
  onObjectsDeleted?: (event: RealtimeEvents['objects_deleted']) => void
  onObjectsDuplicated?: (event: RealtimeEvents['objects_duplicated']) => void
  onCursorMoved?: (event: RealtimeEvents['cursor_moved']) => void
  onOwnershipChanged?: (payload: any) => void
}

export function useRealtime({
  canvasId,
  onObjectCreated,
  onObjectUpdated,
  onObjectDeleted,
  onObjectsDeleted,
  onObjectsDuplicated,
  onCursorMoved,
  onOwnershipChanged,
}: UseRealtimeProps) {
  const { user, profile } = useAuth()
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    onlineUsers: [],
    error: null,
  })
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isReconnectingRef = useRef(false)

  // Validate session before operations
  const validateSession = useCallback(async () => {
    try {
      const session = await AuthService.getCurrentSession()
      if (!session) {
        console.warn('⚠️ No valid session found, attempting to refresh...')
        return false
      }
      
      // Check if session is expired (with 5 minute buffer)
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      if (expiresAt - now < 300) { // 5 minutes buffer
        console.warn('⚠️ Session expires soon, attempting to refresh...')
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ Session validation failed:', error)
      return false
    }
  }, [])

  // Broadcast an object creation
  const broadcastObjectCreated = useCallback(async (object: CanvasObject) => {
    if (!channelRef.current || !user || !profile) return

    // Validate session before broadcasting
    const isValidSession = await validateSession()
    if (!isValidSession) {
      console.warn('⚠️ Invalid session, skipping broadcast')
      return
    }

    console.log('📡 Broadcasting object created:', object.id, 'by', profile.display_name)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'object_created',
      payload: {
        object,
        user_id: user.id,
        creatorDisplayName: profile.display_name,
      },
    })
  }, [user, profile, validateSession])

  // Broadcast an object update
  const broadcastObjectUpdated = useCallback(async (object: CanvasObject) => {
    if (!channelRef.current || !user) return

    // Validate session before broadcasting
    const isValidSession = await validateSession()
    if (!isValidSession) {
      console.warn('⚠️ Invalid session, skipping broadcast')
      return
    }

    console.log('📡 Broadcasting object updated:', object.id)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'object_updated',
      payload: {
        object,
        user_id: user.id,
      },
    })
  }, [user, validateSession])

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
    if (!channelRef.current || !user || !profile) return

    console.log('📡 Broadcasting objects duplicated:', originalIds.length, 'objects by', profile.display_name)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'objects_duplicated',
      payload: {
        original_ids: originalIds,
        new_objects: newObjects,
        user_id: user.id,
        creatorDisplayName: profile.display_name,
      },
    })
  }, [user, profile])

  // Broadcast ownership claimed
  const broadcastOwnershipClaimed = useCallback(async (event: { object_id: string; owner_id: string; owner_name: string; claimed_at: string; expires_at: string }) => {
    if (!channelRef.current || !user) return

    console.log('📡 Broadcasting ownership claimed:', event.object_id)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'ownership_claimed',
      payload: event,
    })
  }, [user])

  // Broadcast ownership released
  const broadcastOwnershipReleased = useCallback(async (event: { object_id: string; former_owner_id: string; released_at: string }) => {
    if (!channelRef.current || !user) return

    console.log('📡 Broadcasting ownership released:', event.object_id)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'ownership_released',
      payload: event,
    })
  }, [user])

  // Broadcast ownership rejected
  const broadcastOwnershipRejected = useCallback(async (event: { object_id: string; requesting_user_id: string; current_owner_id: string; current_owner_name: string }) => {
    if (!channelRef.current || !user) return

    console.log('📡 Broadcasting ownership rejected:', event.object_id)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'ownership_rejected',
      payload: event,
    })
  }, [user])

  // Track current presence state to avoid overwriting other fields
  const currentPresenceRef = useRef<PresenceState | null>(null)

  // Broadcast cursor position movement
  const broadcastCursorMoved = useCallback(async (position: { x: number; y: number }) => {
    if (!channelRef.current || !user || !profile?.display_name) return

    // Validate session before broadcasting
    const isValidSession = await validateSession()
    if (!isValidSession) {
      console.warn('⚠️ Invalid session, skipping cursor broadcast')
      return
    }

    console.log('📡 Broadcasting cursor position:', position)
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'cursor_moved',
        payload: {
          user_id: user.id,
          display_name: profile.display_name,
          position,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.warn('⚠️ Failed to broadcast cursor position:', error)
      // If broadcast fails due to auth, trigger reconnection
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        console.warn('🔄 401 error detected, triggering reconnection...')
        triggerReconnection()
      }
    }
  }, [user, profile, validateSession])

  // Trigger reconnection when auth issues are detected
  const triggerReconnection = useCallback(() => {
    if (isReconnectingRef.current) {
      console.log('🔄 Reconnection already in progress, skipping...')
      return
    }

    console.log('🔄 Triggering reconnection due to auth issues...')
    isReconnectingRef.current = true
    
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    // Set a timeout to attempt reconnection
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔄 Attempting to reconnect channels...')
        
        // Clean up existing channels
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current)
          presenceChannelRef.current = null
        }

        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Reinitialize channels (this will be handled by the main useEffect)
        console.log('🔄 Channels cleaned up, reinitializing...')
        
      } catch (error) {
        console.error('❌ Reconnection failed:', error)
      } finally {
        isReconnectingRef.current = false
      }
    }, 2000) // Wait 2 seconds before attempting reconnection
  }, [])

  // Update selected objects in presence
  const updateSelectedObjects = useCallback(async (selectedObjects: string[]) => {
    if (!presenceChannelRef.current || !user || !profile?.display_name) return

    // Maintain the current presence state and only update selected objects
    const newPresenceState = {
      ...currentPresenceRef.current,
      user_id: user.id,
      display_name: profile.display_name,
      selected_objects: selectedObjects,
      last_seen: new Date().toISOString(),
    }
    
    currentPresenceRef.current = newPresenceState
    
    await presenceChannelRef.current.track(newPresenceState)
  }, [user, profile])

  // Initialize realtime channels
  useEffect(() => {
    if (!user || !profile) {
      console.log('⏳ Waiting for user authentication before setting up realtime...')
      return
    }

    console.log('🚀 Setting up realtime channels for canvas:', canvasId)
    
    // Listen for auth state changes to handle session refresh
    const { data: { subscription: authSubscription } } = AuthService.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session ? 'session exists' : 'no session')
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('🚪 User signed out, cleaning up channels...')
        // Clean up channels when user signs out
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
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🔄 Token refreshed, channels should reconnect automatically...')
        // Supabase should automatically reconnect channels with new token
        // Reset reconnection flag
        isReconnectingRef.current = false
      }
    })
    
    // Create main canvas channel for object synchronization
    const channel = supabase.channel(`canvas:${canvasId}`, {
      config: {
        broadcast: { 
          self: true,     // Allow receiving broadcasts (we'll filter our own)
          ack: false      // Don't wait for acknowledgments to improve performance
        },
      },
    })

    // Subscribe to database changes - ONLY for ownership changes
    // 
    // Architecture:
    // - Broadcast channels: Handle all object CRUD (create, update, delete, duplicate)
    // - Database subscriptions: Handle only ownership changes (owner field updates)
    // 
    // This prevents duplicate processing of the same events
    channel
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_objects',
          filter: `canvas_id=eq.${canvasId}`,
        },
        async (payload) => {
          console.log('📥 Database UPDATE received:', payload)
          console.log('🔍 Payload details:', {
            new: payload.new,
            old: payload.old,
            eventType: payload.eventType,
            schema: payload.schema,
            table: payload.table
          })
          
          // Only process if this is an ownership change
          const { new: newRecord, old: oldRecord } = payload
          if (newRecord && oldRecord && newRecord.owner !== oldRecord.owner) {
            console.log('🏷️ Ownership change detected:', `${oldRecord.owner} → ${newRecord.owner}`)
            console.log('🏷️ Object ID:', newRecord.id)
            
            // Handle ownership changes
            if (onOwnershipChanged) {
              console.log('📡 Calling onOwnershipChanged handler')
              onOwnershipChanged(payload)
            } else {
              console.warn('⚠️ No onOwnershipChanged handler provided')
            }
          } else {
            // This is a regular object update (position, etc.) - ignore since broadcasts handle it
            console.log('📝 Regular object update - handled by broadcast')
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
      .on('broadcast', { event: 'cursor_moved' }, (payload) => {
        const cursorData = payload.payload as RealtimeEvents['cursor_moved']
        console.log('📥 Cursor broadcast received:', cursorData.display_name, cursorData.position, 
                   'timestamp:', cursorData.timestamp)
        if (onCursorMoved) {
          onCursorMoved(cursorData)
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
                const initialPresenceState: PresenceState = {
                  user_id: user.id,
                  display_name: profile.display_name,
                  last_seen: new Date().toISOString(),
                }
                
                currentPresenceRef.current = initialPresenceState
                await presenceChannel.track(initialPresenceState)
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
      
      // Clean up auth subscription
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
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
  }, [user, profile, canvasId, onObjectCreated, onObjectUpdated, onObjectDeleted, onObjectsDeleted, onObjectsDuplicated, validateSession, triggerReconnection])

  // Track presence once profile is loaded (separate effect to handle async profile loading)
  useEffect(() => {
    if (presenceChannelRef.current && user && profile?.display_name) {
      console.log('👤 Updating presence with profile:', profile.display_name)
      const presenceState: PresenceState = {
        user_id: user.id,
        display_name: profile.display_name,
        last_seen: new Date().toISOString(),
      }
      
      currentPresenceRef.current = presenceState
      presenceChannelRef.current.track(presenceState)
    }
  }, [user, profile?.display_name])

  return {
    ...state,
    broadcastObjectCreated,
    broadcastObjectUpdated,
    broadcastObjectDeleted,
    broadcastObjectsDeleted,
    broadcastObjectsDuplicated,
    broadcastOwnershipClaimed,
    broadcastOwnershipReleased,
    broadcastOwnershipRejected,
    broadcastCursorMoved,
    updateSelectedObjects,
  }
}
