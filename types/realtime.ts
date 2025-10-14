export interface RealtimeEvents {
  // Object CRUD events
  object_created: {
    object: CanvasObject
    user_id: string
  }
  object_updated: {
    object: CanvasObject
    user_id: string
  }
  object_deleted: {
    object_id: string
    user_id: string
  }
  
  // Batch operations
  objects_deleted: {
    object_ids: string[]
    user_id: string
  }
  
  objects_duplicated: {
    original_ids: string[]
    new_objects: CanvasObject[]
    user_id: string
  }

  // Ownership events
  ownership_claimed: {
    object_id: string
    owner_id: string
    owner_name: string
    claimed_at: string
    expires_at: string
  }
  
  ownership_released: {
    object_id: string
    former_owner_id: string
    released_at: string
  }
  
  ownership_rejected: {
    object_id: string
    requesting_user_id: string
    current_owner_id: string
    current_owner_name: string
  }
}

export interface PresenceState {
  user_id: string
  display_name: string
  cursor_position?: {
    x: number
    y: number
  }
  selected_objects?: string[]
  last_seen: string
}

export interface RealtimeState {
  isConnected: boolean
  onlineUsers: PresenceState[]
  error: string | null
}

// Re-export CanvasObject to avoid circular imports
import { CanvasObject } from './canvas'
export type { CanvasObject }
