export interface CanvasObject {
  id: string
  canvas_id: string
  type: 'rectangle'
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

export interface RectangleData {
  id?: string
  x: number
  y: number
  width: number
  height: number
  color?: string
  rotation?: number
}

export interface CanvasState {
  objects: CanvasObject[]
  selectedObjects: string[]
  tool: 'select' | 'rectangle' | 'circle' | 'text'
  isCreating: boolean
  currentColor: string
}

export interface CreateObjectPayload {
  canvas_id?: string
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  color?: string
  rotation?: number
}
