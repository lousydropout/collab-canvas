'use client'

import { useState, useEffect } from 'react'
import { AuthService } from '@/lib/supabase/auth'
import type { User } from '@supabase/supabase-js'
import type { Profile, AuthState } from '@/types/user'

export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>
} {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        const currentUser = await AuthService.getCurrentUser()
        
        if (currentUser) {
          setUser(currentUser)
          const userProfile = await AuthService.getProfile(currentUser.id)
          setProfile(userProfile)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize auth')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          setUser(session.user)
          const userProfile = await AuthService.getProfile(session.user.id)
          setProfile(userProfile)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.error('Error handling auth state change:', err)
        setError(err instanceof Error ? err.message : 'Auth state change failed')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const { user: authUser, error: authError } = await AuthService.signIn(email, password)
      
      if (authError) {
        setError(authError.message)
        return { success: false, error: authError.message }
      }

      if (authUser) {
        setUser(authUser)
        const userProfile = await AuthService.getProfile(authUser.id)
        setProfile(userProfile)
        return { success: true }
      }

      return { success: false, error: 'Sign in failed' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null)
      setLoading(true)

      const { user: authUser, error: authError } = await AuthService.signUp(email, password, displayName)

      if (authError) {
        setError(authError.message)
        return { success: false, error: authError.message }
      }

      if (authUser) {
        setUser(authUser)
        // Profile will be created automatically by the trigger
        // Wait a moment and then fetch it
        setTimeout(async () => {
          const userProfile = await AuthService.getProfile(authUser.id)
          setProfile(userProfile)
        }, 500)
        
        return { success: true }
      }

      return { success: false, error: 'Sign up failed' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      console.log('useAuth: Starting signOut process...')
      
      // Try to sign out from Supabase
      const result = await AuthService.signOut()
      console.log('useAuth: Supabase signOut result:', result)
      
      // Always clear local state, even if Supabase call fails
      setUser(null)
      setProfile(null)
      setError(null)
      console.log('useAuth: Local state cleared')
    } catch (err) {
      console.error('useAuth: Error signing out:', err)
      // Still clear local state even on error
      setUser(null)
      setProfile(null)
      setError(err instanceof Error ? err.message : 'Sign out failed')
    } finally {
      setLoading(false)
      console.log('useAuth: signOut process completed')
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) return false

      const updatedProfile = await AuthService.updateProfile(user.id, updates)
      if (updatedProfile) {
        setProfile(updatedProfile)
        return true
      }
      return false
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Profile update failed')
      return false
    }
  }

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
}
