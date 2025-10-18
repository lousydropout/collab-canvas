'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { RealtimeEvents, PresenceState, RealtimeState, CanvasObject } from '@/types/realtime'
import { useAuth } from './useAuth'
import { AuthService } from '@/lib/supabase/auth'

const isDev = process.env.NODE_ENV === 'development'

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
  const reconnectAttemptsRef = useRef(0)
  
  // Store callback functions in refs to prevent re-renders
  const onObjectCreatedRef = useRef(onObjectCreated)
  const onObjectUpdatedRef = useRef(onObjectUpdated)
  const onObjectDeletedRef = useRef(onObjectDeleted)
  const onObjectsDeletedRef = useRef(onObjectsDeleted)
  const onObjectsDuplicatedRef = useRef(onObjectsDuplicated)
  const onCursorMovedRef = useRef(onCursorMoved)
  const onOwnershipChangedRef = useRef(onOwnershipChanged)
  
  // Update refs when callbacks change
  useEffect(() => {
    onObjectCreatedRef.current = onObjectCreated
  }, [onObjectCreated])
  
  useEffect(() => {
    onObjectUpdatedRef.current = onObjectUpdated
  }, [onObjectUpdated])
  
  useEffect(() => {
    onObjectDeletedRef.current = onObjectDeleted
  }, [onObjectDeleted])
  
  useEffect(() => {
    onObjectsDeletedRef.current = onObjectsDeleted
  }, [onObjectsDeleted])
  
  useEffect(() => {
    onObjectsDuplicatedRef.current = onObjectsDuplicated
  }, [onObjectsDuplicated])
  
  useEffect(() => {
    onCursorMovedRef.current = onCursorMoved
  }, [onCursorMoved])
  
  useEffect(() => {
    onOwnershipChangedRef.current = onOwnershipChanged
  }, [onOwnershipChanged])

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
  const broadcastObjectCreated = useCallback(async (object: CanvasObject, userId?: string, displayName?: string) => {
    console.log('🚨 DEBUG: broadcastObjectCreated called for:', object.id)
    console.log('🚨 DEBUG: Channel ref:', !!channelRef.current, 'User:', !!user, 'User ID:', user?.id)
    console.log('🚨 DEBUG: Provided userId:', userId, 'displayName:', displayName)
    
    const effectiveUser = user || (userId ? { id: userId } : null)
    const effectiveDisplayName = displayName || profile?.display_name || user?.email || 'Anonymous'
    
    if (!channelRef.current || !effectiveUser) {
      console.log('🚨 DEBUG: broadcastObjectCreated skipped - missing channel/user')
      return
    }

    // Validate session before broadcasting
    const isValidSession = await validateSession()
    if (!isValidSession) {
      console.warn('⚠️ Invalid session, skipping broadcast')
      return
    }

    if (isDev) {
      console.log('📡 Broadcasting object created:', object.id, 'by', effectiveDisplayName)
    }
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'object_created',
        payload: {
          object,
          user_id: effectiveUser.id,
          creatorDisplayName: effectiveDisplayName,
        },
      })
      console.log('📡 broadcastObjectCreated sent successfully')
    } catch (error) {
      console.error('📡 broadcastObjectCreated failed:', error)
    }
  }, [user, profile?.display_name, validateSession])

  // Broadcast an object update
  const broadcastObjectUpdated = useCallback(async (object: CanvasObject, userId?: string) => {
    console.log('🚨 DEBUG: broadcastObjectUpdated called for:', object.id)
    console.log('🚨 DEBUG: Channel ref:', !!channelRef.current, 'User:', !!user, 'User ID:', user?.id)
    console.log('🚨 DEBUG: Provided userId:', userId)
    
    const effectiveUser = user || (userId ? { id: userId } : null)
    
    if (!channelRef.current || !effectiveUser) {
      console.log('🚨 DEBUG: broadcastObjectUpdated skipped - missing channel/user')
      return
    }

    // Validate session before broadcasting
    const isValidSession = await validateSession()
    if (!isValidSession) {
      console.warn('⚠️ Invalid session, skipping broadcast')
      return
    }

    if (isDev) {
      console.log('📡 Broadcasting object updated:', object.id)
    }
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'object_updated',
        payload: {
          object,
          user_id: effectiveUser.id,
        },
      })
      console.log('📡 broadcastObjectUpdated sent successfully')
    } catch (error) {
      console.error('📡 broadcastObjectUpdated failed:', error)
    }
  }, [user, validateSession])

  // Broadcast an object deletion
  const broadcastObjectDeleted = useCallback(async (objectId: string) => {
    if (!channelRef.current || !user) return

    if (isDev) {
      console.log('📡 Broadcasting object deleted:', objectId)
    }
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

    if (isDev) {
      console.log('📡 Broadcasting objects deleted:', objectIds)
    }
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

    if (isDev) {
      console.log('📡 Broadcasting objects duplicated:', originalIds.length, 'objects by', profile.display_name)
    }
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
  }, [user, profile?.display_name])

  // Broadcast ownership claimed
  const broadcastOwnershipClaimed = useCallback(async (event: { object_id: string; owner_id: string; owner_name: string; claimed_at: string; expires_at: string }) => {
    if (!channelRef.current || !user) return

    if (isDev) {
      console.log('📡 Broadcasting ownership claimed:', event.object_id)
    }
    await channelRef.current.send({
      type: 'broadcast',
      event: 'ownership_claimed',
      payload: event,
    })
  }, [user])

  // Broadcast ownership released
  const broadcastOwnershipReleased = useCallback(async (event: { object_id: string; former_owner_id: string; released_at: string }) => {
    if (!channelRef.current || !user) return

    if (isDev) {
      console.log('📡 Broadcasting ownership released:', event.object_id)
    }
    await channelRef.current.send({
      type: 'broadcast',
      event: 'ownership_released',
      payload: event,
    })
  }, [user])

  // Broadcast ownership rejected
  const broadcastOwnershipRejected = useCallback(async (event: { object_id: string; requesting_user_id: string; current_owner_id: string; current_owner_name: string }) => {
    if (!channelRef.current || !user) return

    if (isDev) {
      console.log('📡 Broadcasting ownership rejected:', event.object_id)
    }
    await channelRef.current.send({
      type: 'broadcast',
      event: 'ownership_rejected',
      payload: event,
    })
  }, [user])

  // Track current presence state to avoid overwriting other fields
  const currentPresenceRef = useRef<PresenceState | null>(null)

  // Broadcast cursor position movement (no session validation - cursors are not critical)
  const broadcastCursorMoved = useCallback(async (position: { x: number; y: number }) => {
    if (!channelRef.current || !user || !profile?.display_name) return

    try {
      // Cursor position broadcasted silently
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
      // Don't trigger reconnection for cursor broadcast failures
    }
  }, [user, profile?.display_name])

  // Trigger reconnection when auth issues are detected
  const triggerReconnection = useCallback(() => {
    if (isReconnectingRef.current) {
      if (isDev) {
        console.log('🔄 Reconnection already in progress, skipping...')
      }
      return
    }

    if (isDev) {
      console.log('🔄 Triggering reconnection due to auth issues...')
    }
    isReconnectingRef.current = true
    
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    // Calculate exponential backoff delay (2s, 4s, 8s, 16s, max 30s)
    const baseDelay = 2000
    const maxDelay = 30000
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay)
    
    console.log(`🔄 Scheduling reconnection attempt ${reconnectAttemptsRef.current + 1} in ${delay}ms...`)
    
    // Set a timeout to attempt reconnection
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        reconnectAttemptsRef.current++
        console.log(`🔄 Attempting to reconnect channels (attempt ${reconnectAttemptsRef.current})...`)
        
        // Clean up existing channels
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current)
          presenceChannelRef.current = null
        }

        // Reset initialization flag to allow reconnection
        isInitializingRef.current = false

        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Reinitialize channels (this will be handled by the main useEffect)
        console.log('🔄 Channels cleaned up, reinitializing...')
        
      } catch (error) {
        console.error('❌ Reconnection failed:', error)
      } finally {
        isReconnectingRef.current = false
      }
    }, delay)
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
  }, [user, profile?.display_name])

  // Track if channels are being initialized to prevent duplicates
  const isInitializingRef = useRef(false)
  const hasLoggedWaitingRef = useRef(false)
  
  // Initialize realtime channels
  useEffect(() => {
    // Prevent multiple initializations
    if (channelRef.current || presenceChannelRef.current || isInitializingRef.current) {
      return
    }
    
    if (!user || !profile) {
      // Only log once per authentication state
      if (!hasLoggedWaitingRef.current) {
        console.log('⏳ Waiting for user authentication before setting up realtime...')
        hasLoggedWaitingRef.current = true
      }
      return
    }
    
    isInitializingRef.current = true

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
      } else if (event === 'INITIAL_SESSION') {
        console.log('🔐 Initial session detected, no action needed')
        // Don't do anything for initial session - channels are already being set up
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
            if (onOwnershipChangedRef.current) {
              console.log('📡 Calling onOwnershipChanged handler')
              onOwnershipChangedRef.current(payload)
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
        if (onObjectsDeletedRef.current) {
          onObjectsDeletedRef.current(payload.payload as RealtimeEvents['objects_deleted'])
        }
      })
      .on('broadcast', { event: 'objects_duplicated' }, (payload) => {
        console.log('📥 Broadcast objects_duplicated received:', payload)
        if (onObjectsDuplicatedRef.current) {
          onObjectsDuplicatedRef.current(payload.payload as RealtimeEvents['objects_duplicated'])
        }
      })
      // Add broadcast listeners as fallback for individual operations
      .on('broadcast', { event: 'object_created' }, (payload) => {
        console.log('📥 Broadcast object_created received:', payload)
        if (onObjectCreatedRef.current) {
          onObjectCreatedRef.current(payload.payload as RealtimeEvents['object_created'])
        }
      })
      .on('broadcast', { event: 'object_updated' }, (payload) => {
        console.log('📥 Broadcast object_updated received:', payload)
        if (onObjectUpdatedRef.current) {
          onObjectUpdatedRef.current(payload.payload as RealtimeEvents['object_updated'])
        }
      })
      .on('broadcast', { event: 'object_deleted' }, (payload) => {
        console.log('📥 Broadcast object_deleted received:', payload)
        if (onObjectDeletedRef.current) {
          onObjectDeletedRef.current(payload.payload as RealtimeEvents['object_deleted'])
        }
      })
      .on('broadcast', { event: 'cursor_moved' }, (payload) => {
        const cursorData = payload.payload as RealtimeEvents['cursor_moved']
        // Cursor broadcast received silently
        if (onCursorMovedRef.current) {
          onCursorMovedRef.current(cursorData)
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
    
    if (isDev) {
      // Presence channel created silently
    }

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        if (isDev) {
          // Presence sync processed silently
        }
        const presenceState = presenceChannel.presenceState()
        if (isDev) {
          // Raw presence state processed silently
        }
        
        const onlineUsers: PresenceState[] = []
        const seenUserIds = new Set<string>()
        
        Object.values(presenceState).forEach((users: any) => {
          if (isDev) {
            // Users group processed silently
          }
          users.forEach((user: PresenceState) => {
            if (isDev) {
              // User added to list silently
            }
            // Deduplicate users by user_id to prevent multiple entries for the same user
            if (!seenUserIds.has(user.user_id)) {
              seenUserIds.add(user.user_id)
              onlineUsers.push(user)
            } else {
              if (isDev) {
                // Duplicate user skipped silently
              }
            }
          })
        })
        
        if (isDev) {
          // Final online users list processed silently
        }
        setState(prev => ({ ...prev, onlineUsers }))
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (isDev) {
          // User joined silently
        }
        // Don't update state here - let sync handle it to avoid conflicts
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (isDev) {
          // User left silently
        }
        // Don't update state here - let sync handle it to avoid conflicts
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
            
            // Reset reconnection attempts on successful connection
            if (status === 'SUBSCRIBED') {
              reconnectAttemptsRef.current = 0
            }
            
            // Trigger reconnection on channel error
            if (status === 'CHANNEL_ERROR') {
              console.log('🔄 Channel error detected, triggering reconnection...')
              triggerReconnection()
            }
          }),
          presenceChannel.subscribe(async (status) => {
            if (isDev) {
              // Presence channel status processed silently
            }
            if (status === 'SUBSCRIBED') {
              // Join presence with initial state (only if profile is loaded)
              if (profile?.display_name) {
                const initialPresenceState: PresenceState = {
                  user_id: user.id,
                  display_name: profile.display_name,
                  last_seen: new Date().toISOString(),
                }
                
                if (isDev) {
                  // Initial presence state tracked silently
                }
                currentPresenceRef.current = initialPresenceState
                await presenceChannel.track(initialPresenceState)
                if (isDev) {
                  // Presence tracked successfully
                }
              } else {
                console.warn('⚠️ Profile not loaded, cannot track presence')
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
      
      // Reset initialization flags
      isInitializingRef.current = false
      hasLoggedWaitingRef.current = false
      reconnectAttemptsRef.current = 0
      
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
  }, [user, profile?.display_name, canvasId])

  // Track presence once profile is loaded (separate effect to handle async profile loading)
  useEffect(() => {
    if (presenceChannelRef.current && user && profile?.display_name) {
      if (isDev) {
        // Presence updated with profile silently
      }
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
