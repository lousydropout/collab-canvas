/**
 * Authentication Service
 * 
 * This service provides a clean abstraction layer for all authentication operations.
 * Handles user registration, login, logout, and profile management through Supabase Auth.
 * 
 * Features:
 * - User registration with email/password
 * - User login and session management
 * - Profile creation and updates
 * - Auth state change listeners
 * - Error handling and type safety
 * - Integration with Supabase profiles table
 */

import { supabase } from './client'
import type { User, AuthError } from '@supabase/supabase-js'

export interface AuthResult {
  user: User | null
  error: AuthError | null
}

export interface Profile {
  id: string
  display_name: string
  created_at: string
  updated_at: string
}

export class AuthService {
  // Sign up new user
  static async signUp(email: string, password: string, displayName: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      return {
        user: data.user,
        error,
      }
    } catch (error) {
      return {
        user: null,
        error: error as AuthError,
      }
    }
  }

  // Sign in existing user
  static async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return {
        user: data.user,
        error,
      }
    } catch (error) {
      return {
        user: null,
        error: error as AuthError,
      }
    }
  }

  // Sign out current user
  static async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser()
    return data.user
  }

  // Get current session
  static async getCurrentSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
  }

  // Get user profile
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      return null
    }
  }

  // Listen to auth changes
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
