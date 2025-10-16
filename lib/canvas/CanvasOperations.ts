import { SupabaseClient } from '@supabase/supabase-js'
import { CanvasObject, CreateObjectPayload, EllipseData } from '@/types/canvas'
import { User } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/client'

// Realtime service interface - we'll define this based on useRealtime hook
export interface RealtimeService {
  broadcastObjectCreated: (object: CanvasObject) => Promise<void>
  broadcastObjectUpdated: (object: CanvasObject) => Promise<void>
  broadcastObjectDeleted: (objectId: string) => Promise<void>
  broadcastObjectsDeleted: (objectIds: string[]) => Promise<void>
  broadcastObjectsDuplicated: (originalIds: string[], newObjects: CanvasObject[]) => Promise<void>
}

// Profile type from database
type Profile = Database['public']['Tables']['profiles']['Row']

export class CanvasOperations {
  constructor(
    private supabase: SupabaseClient,
    private realtime: RealtimeService,
    private user: User,
    private profile: Profile | null,
    private canvasId: string
  ) {}

  // Create new rectangle
  async createRectangle(data: CreateObjectPayload): Promise<CanvasObject | null> {
    if (!this.user) {
      console.error('❌ User not authenticated')
      return null
    }

    try {
      console.log('📦 Creating rectangle:', data)
      const objectData = {
        canvas_id: this.canvasId,
        type: 'rectangle' as const,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        color: data.color || '#000000',
        rotation: data.rotation || 0,
        owner: this.user.id, // Creator automatically owns the object
        created_by: this.user.id,
      }

      const { data: newObject, error } = await this.supabase
        .from('canvas_objects')
        .insert([objectData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating rectangle:', error)
        return null
      }

      console.log('✅ Rectangle created:', newObject)
      
      // Broadcast to other clients
      await this.realtime.broadcastObjectCreated(newObject)

      return newObject
    } catch (error) {
      console.error('❌ Failed to create rectangle:', error)
      return null
    }
  }

  // Create new ellipse
  async createEllipse(data: EllipseData): Promise<CanvasObject | null> {
    if (!this.user) {
      console.error('❌ User not authenticated')
      return null
    }

    try {
      console.log('🔵 Creating ellipse:', data)
      const objectData = {
        canvas_id: this.canvasId,
        type: 'ellipse' as const,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        color: data.color || '#000000',
        rotation: data.rotation || 0,
        owner: this.user.id, // Creator automatically owns the object
        created_by: this.user.id,
      }

      const { data: newObject, error } = await this.supabase
        .from('canvas_objects')
        .insert([objectData])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating ellipse:', error)
        return null
      }

      console.log('✅ Ellipse created:', newObject)
      
      // Broadcast to other clients
      await this.realtime.broadcastObjectCreated(newObject)

      return newObject
    } catch (error) {
      console.error('❌ Failed to create ellipse:', error)
      return null
    }
  }

  // Update object properties
  async updateObject(id: string, updates: Partial<CanvasObject>): Promise<CanvasObject | null> {
    try {
      console.log(`📝 Updating object ${id}:`, updates)
      
      const { data, error } = await this.supabase
        .from('canvas_objects')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error updating object:', error)
        return null
      }

      console.log('✅ Object updated:', data)
      
      // Broadcast to other clients
      await this.realtime.broadcastObjectUpdated(data)

      return data
    } catch (error) {
      console.error('❌ Failed to update object:', error)
      return null
    }
  }

  // Delete objects
  async deleteObjects(objectIds: string[]): Promise<boolean> {
    if (!this.user || objectIds.length === 0) return false

    try {
      console.log('🗑️ Deleting objects:', objectIds)
      
      const { error } = await this.supabase
        .from('canvas_objects')
        .delete()
        .in('id', objectIds)

      if (error) {
        console.error('❌ Error deleting objects:', error)
        return false
      }

      console.log('✅ Objects deleted')
      
      // Broadcast to other clients
      if (objectIds.length === 1) {
        await this.realtime.broadcastObjectDeleted(objectIds[0])
      } else {
        await this.realtime.broadcastObjectsDeleted(objectIds)
      }

      return true
    } catch (error) {
      console.error('❌ Failed to delete objects:', error)
      return false
    }
  }

  // Duplicate objects
  async duplicateObjects(objectIds: string[], existingObjects: CanvasObject[]): Promise<CanvasObject[]> {
    if (!this.user || objectIds.length === 0) return []

    try {
      console.log('📋 Duplicating objects:', objectIds)
      const objectsToDuplicate = existingObjects.filter(obj => objectIds.includes(obj.id))
      
      const duplicatedObjects = objectsToDuplicate.map(obj => ({
        canvas_id: this.canvasId,
        type: obj.type,
        x: obj.x + 20, // Offset by 20px
        y: obj.y + 20,
        width: obj.width,
        height: obj.height,
        color: obj.color,
        rotation: obj.rotation,
        owner: this.user.id, // Duplicator automatically owns the new objects
        created_by: this.user.id,
      }))

      const { data, error } = await this.supabase
        .from('canvas_objects')
        .insert(duplicatedObjects)
        .select('*')

      if (error) {
        console.error('❌ Error duplicating objects:', error)
        return []
      }

      console.log('✅ Objects duplicated:', data)
      
      // Broadcast to other clients
      await this.realtime.broadcastObjectsDuplicated(objectIds, data)

      return data
    } catch (error) {
      console.error('❌ Failed to duplicate objects:', error)
      return []
    }
  }

  // Move object by delta
  async moveObject(id: string, deltaX: number, deltaY: number): Promise<CanvasObject | null> {
    const object = await this.getObject(id)
    if (!object) {
      console.error(`❌ Object ${id} not found`)
      return null
    }

    return this.updateObject(id, {
      x: object.x + deltaX,
      y: object.y + deltaY
    })
  }

  // Get single object by ID
  async getObject(id: string): Promise<CanvasObject | null> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_objects')
        .select('*')
        .eq('id', id)
        .eq('canvas_id', this.canvasId)
        .single()

      if (error) {
        console.error('❌ Error getting object:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('❌ Failed to get object:', error)
      return null
    }
  }

  // Get all objects on canvas
  async getAllObjects(): Promise<CanvasObject[]> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_objects')
        .select('*')
        .eq('canvas_id', this.canvasId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Error loading objects:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('❌ Failed to load objects:', error)
      return []
    }
  }

  // Create random object
  async createRandomObject(canvasWidth: number, canvasHeight: number): Promise<CanvasObject | null> {
    const types = ['rectangle', 'ellipse']
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
    
    const randomType = types[Math.floor(Math.random() * types.length)]
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    const randomX = Math.random() * (canvasWidth - 100)
    const randomY = Math.random() * (canvasHeight - 100)
    const randomWidth = 50 + Math.random() * 150
    const randomHeight = 50 + Math.random() * 150
    
    if (randomType === 'rectangle') {
      return this.createRectangle({
        type: 'rectangle',
        x: randomX,
        y: randomY,
        width: randomWidth,
        height: randomHeight,
        color: randomColor
      })
    } else {
      return this.createEllipse({
        x: randomX,
        y: randomY,
        width: randomWidth,
        height: randomHeight,
        color: randomColor
      })
    }
  }
}
