import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface Profile {
  id: string
  display_name: string
  created_at: string
  updated_at: string
}

export interface User extends SupabaseUser {
  profile?: Profile
}

export interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
}
