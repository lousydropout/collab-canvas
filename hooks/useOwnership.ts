'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { OwnershipState, OwnershipEvents, OWNERSHIP_CONFIG, OwnershipStatus } from '@/types/ownership'

interface UseOwnershipProps {
  canvasId: string
  onOwnershipClaimed?: (event: OwnershipEvents['ownership_claimed']) => void
  onOwnershipReleased?: (event: OwnershipEvents['ownership_released']) => void
  onOwnershipRejected?: (event: OwnershipEvents['ownership_rejected']) => void
}

export function useOwnership({
  canvasId,
  onOwnershipClaimed,
  onOwnershipReleased,
  onOwnershipRejected,
}: UseOwnershipProps) {
  const { user, profile } = useAuth()
  const [ownershipState, setOwnershipState] = useState<OwnershipState>({})
  const [isConnected, setIsConnected] = useState(false)
  
  // Track pending claims to show loading states
  const pendingClaimsRef = useRef<Set<string>>(new Set())
  const [pendingClaims, setPendingClaims] = useState<Set<string>>(new Set())
  
  // Cleanup timers
  const cleanupTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Get ownership status for an object
  const getOwnershipStatus = useCallback((objectId: string): OwnershipStatus => {
    const ownership = ownershipState[objectId]
    if (!ownership || !ownership.owner_id) return 'available'
    
    if (ownership.is_claimed_by_me) return 'claimed_by_me'
    
    // Check if expired
    if (ownership.expires_at && new Date(ownership.expires_at) < new Date()) {
      return 'expired'
    }
    
    return 'claimed'
  }, [ownershipState])

  // Check if current user can edit an object
  const canEdit = useCallback((objectId: string): boolean => {
    const status = getOwnershipStatus(objectId)
    return status === 'available' || status === 'claimed_by_me' || status === 'expired'
  }, [getOwnershipStatus])

  // Check if an object is claimed by someone else
  const isClaimedByOther = useCallback((objectId: string): boolean => {
    const status = getOwnershipStatus(objectId)
    return status === 'claimed'
  }, [getOwnershipStatus])

  // Get owner info for an object
  const getOwnerInfo = useCallback((objectId: string) => {
    return ownershipState[objectId] || null
  }, [ownershipState])

  // Initialize ownership state from existing canvas objects
  useEffect(() => {
    if (!user) return

    const initializeOwnership = async () => {
      const { data: objects, error } = await supabase
        .from('canvas_objects')
        .select('id, owner')

      if (error) {
        console.error('❌ Error loading canvas objects for ownership:', error)
        return
      }

      const initialState: OwnershipState = {}
      
      // Get all unique owner IDs that aren't 'all'
      const ownerIds = [...new Set(objects?.map(obj => obj.owner).filter(owner => owner !== 'all'))]
      
      // Fetch owner names if there are any claims
      let ownerProfiles: Record<string, string> = {}
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ownerIds)
        
        profiles?.forEach(profile => {
          ownerProfiles[profile.id] = profile.display_name
        })
      }

      objects?.forEach(obj => {
        if (obj.owner !== 'all') {
          initialState[obj.id] = {
            owner_id: obj.owner,
            owner_name: ownerProfiles[obj.owner] || 'Unknown User',
            claimed_at: new Date().toISOString(), // Approximate
            expires_at: new Date(Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS).toISOString(),
            is_claimed_by_me: obj.owner === user.id,
          }
        }
      })
      
      setOwnershipState(initialState)
    }

    initializeOwnership()
  }, [user])

  // Claim an object (simple owner field approach)
  const claimObject = useCallback(async (objectId: string): Promise<boolean> => {
    if (!user || !profile) {
      console.warn('Cannot claim object: user not authenticated')
      return false
    }

    // Check if already claimed by me
    if (getOwnershipStatus(objectId) === 'claimed_by_me') {
      return true
    }

    // Add to pending claims (for visual feedback)
    pendingClaimsRef.current.add(objectId)
    setPendingClaims(new Set(pendingClaimsRef.current))

    try {
      console.log(`🏷️ Attempting to claim object: ${objectId}`)

      // Atomically claim object if available (owner = 'all')
      const { data, error } = await supabase
        .from('canvas_objects')
        .update({ 
          owner: user.id 
        })
        .eq('id', objectId)
        .eq('owner', 'all') // Only claim if currently available
        .select('*')
        .single()

      if (error) {
        // If no rows affected, object is already claimed
        if (error.code === 'PGRST116') {
          console.log(`❌ Object already claimed by someone else`)
          
          // Get current owner info
          const { data: currentObj } = await supabase
            .from('canvas_objects')
            .select('owner')
            .eq('id', objectId)
            .single()

          // Find owner name from profiles
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', currentObj?.owner)
            .single()

          onOwnershipRejected?.({
            object_id: objectId,
            requesting_user_id: user.id,
            current_owner_id: currentObj?.owner || 'unknown',
            current_owner_name: ownerProfile?.display_name || 'Unknown User',
          })

          return false
        }
        
        console.error('❌ Error claiming object:', error)
        return false
      }

      console.log(`✅ Successfully claimed object: ${objectId}`)
      
      const claimedAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS).toISOString()
      
      // Update local state
      setOwnershipState(prev => ({
        ...prev,
        [objectId]: {
          owner_id: user.id,
          owner_name: profile.display_name,
          claimed_at: claimedAt,
          expires_at: expiresAt,
          is_claimed_by_me: true,
        }
      }))

      // Set up auto-release timer
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Auto-releasing expired claim: ${objectId}`)
        releaseObject(objectId)
      }, OWNERSHIP_CONFIG.CLAIM_DURATION_MS)
      
      cleanupTimersRef.current.set(objectId, timeoutId)

      // Broadcast the claim event
      onOwnershipClaimed?.({
        object_id: objectId,
        owner_id: user.id,
        owner_name: profile.display_name,
        claimed_at: claimedAt,
        expires_at: expiresAt,
      })

      return true
    } catch (error) {
      console.error('❌ Failed to claim object:', error)
      return false
    } finally {
      // Remove from pending claims
      pendingClaimsRef.current.delete(objectId)
      setPendingClaims(new Set(pendingClaimsRef.current))
    }
  }, [user, profile, getOwnershipStatus, onOwnershipClaimed, onOwnershipRejected])

  // Release an object (simple owner field approach)
  const releaseObject = useCallback(async (objectId: string): Promise<boolean> => {
    if (!user) {
      console.warn('Cannot release object: user not authenticated')
      return false
    }

    try {
      console.log(`🏷️ Releasing object: ${objectId}`)

      // Set owner back to 'all' if currently owned by this user
      const { error } = await supabase
        .from('canvas_objects')
        .update({ 
          owner: 'all' 
        })
        .eq('id', objectId)
        .eq('owner', user.id) // Only release if we own it

      if (error) {
        console.error('❌ Error releasing object:', error)
        return false
      }

      // Clear local state
      setOwnershipState(prev => ({
        ...prev,
        [objectId]: {
          owner_id: null,
          owner_name: null,
          claimed_at: null,
          expires_at: null,
          is_claimed_by_me: false,
        }
      }))

      // Clear cleanup timer
      const timerId = cleanupTimersRef.current.get(objectId)
      if (timerId) {
        clearTimeout(timerId)
        cleanupTimersRef.current.delete(objectId)
      }

      // Broadcast the release event
      onOwnershipReleased?.({
        object_id: objectId,
        former_owner_id: user.id,
        released_at: new Date().toISOString(),
      })

      console.log(`✅ Successfully released object: ${objectId}`)
      return true
    } catch (error) {
      console.error('❌ Failed to release object:', error)
      return false
    }
  }, [user, onOwnershipReleased])

  // Release all objects claimed by this user
  const releaseAllObjects = useCallback(async () => {
    const myObjects = Object.keys(ownershipState).filter(objectId => 
      ownershipState[objectId]?.is_claimed_by_me
    )
    
    await Promise.all(myObjects.map(objectId => releaseObject(objectId)))
  }, [ownershipState, releaseObject])

  // Release all objects except the specified one
  const releaseAllExcept = useCallback(async (excludeObjectId?: string) => {
    const myObjects = Object.keys(ownershipState).filter(objectId => 
      ownershipState[objectId]?.is_claimed_by_me && 
      objectId !== excludeObjectId
    )
    
    await Promise.all(myObjects.map(objectId => releaseObject(objectId)))
  }, [ownershipState, releaseObject])

  // Handle ownership changes from canvas_objects realtime updates
  const handleCanvasObjectUpdate = useCallback((payload: any) => {
    const { new: newRecord, old: oldRecord } = payload
    
    if (!newRecord?.id) return

    const objectId = newRecord.id
    const newOwner = newRecord.owner
    const oldOwner = oldRecord?.owner

    // Only process ownership changes (when owner field changes)
    if (newOwner !== oldOwner) {
      console.log('📥 Ownership change via realtime:', objectId, `${oldOwner} → ${newOwner}`)
      
      if (newOwner === 'all') {
        // Object was released
        setOwnershipState(prev => ({
          ...prev,
          [objectId]: {
            owner_id: null,
            owner_name: null,
            claimed_at: null,
            expires_at: null,
            is_claimed_by_me: false,
          }
        }))
      } else if (newOwner === user?.id && user) {
        // Object was claimed by me (or I created it)
        setOwnershipState(prev => ({
          ...prev,
          [objectId]: {
            owner_id: user.id,
            owner_name: profile?.display_name || 'Me',
            claimed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS).toISOString(),
            is_claimed_by_me: true,
          }
        }))
      } else {
        // Object was claimed by someone else - need to get their name
        supabase
          .from('profiles')
          .select('display_name')
          .eq('id', newOwner)
          .single()
          .then(({ data: ownerProfile }) => {
            setOwnershipState(prev => ({
              ...prev,
              [objectId]: {
                owner_id: newOwner,
                owner_name: ownerProfile?.display_name || 'Unknown User',
                claimed_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS).toISOString(),
                is_claimed_by_me: false,
              }
            }))
          })
      }
    }
  }, [user, profile])

  // We don't need a separate subscription - we'll hook into the existing canvas_objects updates

  // Auto-release only on window unload (keep for cleanup)
  useEffect(() => {
    const handleUnload = () => {
      console.log('🏷️ Window unload detected, releasing all objects')
      releaseAllObjects()
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [releaseAllObjects])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach(timerId => clearTimeout(timerId))
      cleanupTimersRef.current.clear()
    }
  }, [])

  return {
    // State
    ownershipState,
    pendingClaims,
    isConnected: true, // Always connected since we use canvas_objects updates
    
    // Actions
    claimObject,
    releaseObject,
    releaseAllObjects,
    releaseAllExcept,
    
    // Utilities
    canEdit,
    isClaimedByOther,
    getOwnershipStatus,
    getOwnerInfo,
    
    // Handler for integration
    handleCanvasObjectUpdate,
  }
}
