import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable')
}

if (!supabasePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_KEY environment variable')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      canvas_objects: {
        Row: {
          id: string
          canvas_id: string
          type: string
          x: number
          y: number
          width: number
          height: number
          color: string
          rotation: number
          owner: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canvas_id?: string
          type: string
          x: number
          y: number
          width: number
          height: number
          color?: string
          rotation?: number
          owner?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canvas_id?: string
          type?: string
          x?: number
          y?: number
          width?: number
          height?: number
          color?: string
          rotation?: number
          owner?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
