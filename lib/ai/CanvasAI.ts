/**
 * Simplified Canvas AI Service
 * 
 * This service provides simple intent detection for object creation.
 * Detects if user wants to create rectangle or ellipse and creates with defaults.
 * 
 * Features:
 * - Intent detection via server action
 * - Default object creation
 * - Error handling and user feedback
 */

import { CanvasOperations } from '@/lib/canvas/CanvasOperations'
import { CanvasSize } from '@/lib/canvas/coordinateUtils'
import { CanvasObject } from '@/types/canvas'
import { detectObjectIntent, AICommand, AIContext } from './serverActions'

// Default values for object creation
const DEFAULT_SIZE = { width: 200, height: 150 }
const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']

export interface AIResponse {
  message: string
  success: boolean
  error?: string
  commandData?: AICommand
}

export interface CanvasStateUpdater {
  addObject: (object: CanvasObject) => void
  updateObject: (id: string, updates: Partial<CanvasObject>) => Promise<CanvasObject | null>
  initializeOwnership: (object: CanvasObject, userId: string, displayName?: string) => Promise<void>
  claimObject: (objectId: string) => Promise<boolean>
}

/**
 * Simplified Canvas AI Service Class
 * 
 * Handles simple intent detection and default object creation.
 */
export class CanvasAI {
  private operations: CanvasOperations
  private canvasSize: CanvasSize
  private stateUpdater?: CanvasStateUpdater
  private currentColor: string = '#000000'
  private viewportInfo: { scale: number; position: { x: number; y: number } } = { scale: 1, position: { x: 0, y: 0 } }

  constructor(
    operations: CanvasOperations,
    canvasSize: CanvasSize,
    stateUpdater?: CanvasStateUpdater,
    currentColor?: string,
    viewportInfo?: { scale: number; position: { x: number; y: number } }
  ) {
    this.operations = operations
    this.canvasSize = canvasSize
    this.stateUpdater = stateUpdater
    if (currentColor) this.currentColor = currentColor
    if (viewportInfo) this.viewportInfo = viewportInfo
  }

  /**
   * Update the current color
   */
  updateCurrentColor(color: string): void {
    if (this.currentColor !== color) {
      this.currentColor = color
      console.log('🎨 CanvasAI updated current color:', color)
    }
  }

  /**
   * Update viewport information
   */
  updateViewportInfo(info: { scale: number; position: { x: number; y: number } }): void {
    // Only update if the values have actually changed
    if (this.viewportInfo.scale !== info.scale || 
        this.viewportInfo.position.x !== info.position.x || 
        this.viewportInfo.position.y !== info.position.y) {
      this.viewportInfo = info
      console.log('📐 CanvasAI updated viewport info:', info)
    }
  }

  /**
   * Calculate the center of the visible viewport in canvas coordinates
   */
  private getViewportCenter(): { x: number; y: number } {
    const centerX = (this.canvasSize.width / 2 - this.viewportInfo.position.x) / this.viewportInfo.scale
    const centerY = (this.canvasSize.height / 2 - this.viewportInfo.position.y) / this.viewportInfo.scale
    return { x: centerX, y: centerY }
  }

  /**
   * Process a user message and create object if intent detected
   * 
   * @param message - User's natural language command
   * @param selectedObjects - Array of currently selected object IDs
   * @returns Promise<AIResponse> - AI's response and operation result
   */
  async processMessage(message: string, selectedObjects: string[] = []): Promise<AIResponse> {
    try {
      console.log('🤖 Processing AI message:', message)

      // Create context for the AI
      const context: AIContext = {
        selectedObjectsCount: selectedObjects.length,
        viewportWidth: this.canvasSize.width / this.viewportInfo.scale,
        viewportHeight: this.canvasSize.height / this.viewportInfo.scale,
        viewportTopLeft: {
          x: -this.viewportInfo.position.x / this.viewportInfo.scale,
          y: -this.viewportInfo.position.y / this.viewportInfo.scale
        }
      }

      console.log('📊 AI Context:', context)

      // Call the server action for intent detection
      const result = await detectObjectIntent(message, context)
      console.log('✅ AI intent detection result:', result)

      if (!result.success || !result.commandData) {
        console.log('❌ Server action failed:', result.error)
        return {
          message: result.error || 'Could not understand command',
          success: false,
          error: result.error
        }
      }

      const commandData = result.commandData

      if (commandData.command === 'create') {
        return await this.handleCreateCommand(commandData)
      } else if (commandData.command === 'modify') {
        return await this.handleModifyCommand(commandData, selectedObjects)
      } else {
        return {
          message: 'No command detected. Try "create a rectangle" or "add an ellipse"',
          success: true
        }
      }
    } catch (error) {
      console.error('❌ AI message processing failed:', error)
      
      let errorMessage = 'Sorry, I encountered an error processing your request.'
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'OpenAI API key not configured. Please check your environment variables.'
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.'
        } else if (error.message.includes('quota')) {
          errorMessage = 'OpenAI quota exceeded. Please check your account limits.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }

      return {
        message: errorMessage,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Apply default values to command data
   */
  private applyDefaults(commandData: AICommand): {
    command: 'create' | 'modify'
    objectType: 'rectangle' | 'ellipse'
    x: number
    y: number
    width: number
    height: number
    color: string
    deltaX: null
    deltaY: null
    newX: null
    newY: null
    scaleBy: null
    newWidth: null
    newHeight: null
  } {
    const center = this.getViewportCenter()
    
    // Use AI-provided values or smart defaults based on object type
    let width = commandData.width ?? DEFAULT_SIZE.width
    let height = commandData.height ?? DEFAULT_SIZE.height
    
    // If AI provided specific values, use them; otherwise apply viewport-relative defaults
    if (commandData.width === null && commandData.height === null) {
      if (commandData.objectType === 'ellipse') {
        // Default ellipse/circle should be square, 10% of viewport width
        const size = Math.round(this.canvasSize.width * 0.1)
        width = size
        height = size
      } else {
        // Default rectangle, 10% of viewport dimensions
        width = Math.round(this.canvasSize.width * 0.1)
        height = Math.round(this.canvasSize.height * 0.1)
      }
    }
    
    // Convert from center coordinates to top-left coordinates
    const x = commandData.x !== null ? commandData.x - width / 2 : center.x - width / 2
    const y = commandData.y !== null ? commandData.y - height / 2 : center.y - height / 2
    
    return {
      command: commandData.command || 'create',
      objectType: commandData.objectType || 'rectangle',
      x,
      y,
      width,
      height,
      color: commandData.color ?? this.currentColor,
      deltaX: null,
      deltaY: null,
      newX: null,
      newY: null,
      scaleBy: null,
      newWidth: null,
      newHeight: null
    }
  }

  /**
   * Handle create command with applied defaults
   */
  private async handleCreateCommand(commandData: AICommand): Promise<AIResponse> {
    const params = this.applyDefaults(commandData)
    console.log('🎨 Creating object with params:', params)
    
    if (params.objectType === 'rectangle') {
      const result = await this.operations.createRectangle({
        type: 'rectangle',
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        color: params.color,
        rotation: 0
      })
      console.log('🎨 createRectangle result:', result)
      
      // Add to local state if state updater is available
      if (result && this.stateUpdater) {
        console.log('🎨 Adding rectangle to local state:', result.id)
        await this.stateUpdater.initializeOwnership(result, this.operations['user'].id, this.operations['user'].email)
        this.stateUpdater.addObject(result)
      }
      
      return {
        message: `Successfully created a rectangle at (${Math.round(params.x)}, ${Math.round(params.y)}) with size ${params.width}x${params.height}`,
        success: true,
        commandData: params
      }
    } else if (params.objectType === 'ellipse') {
      const result = await this.operations.createEllipse({
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        color: params.color,
        rotation: 0
      })
      console.log('🎨 createEllipse result:', result)
      
      // Add to local state if state updater is available
      if (result && this.stateUpdater) {
        console.log('🎨 Adding ellipse to local state:', result.id)
        await this.stateUpdater.initializeOwnership(result, this.operations['user'].id, this.operations['user'].email)
        this.stateUpdater.addObject(result)
      }
      
      return {
        message: `Successfully created an ellipse at (${Math.round(params.x)}, ${Math.round(params.y)}) with size ${params.width}x${params.height}`,
        success: true,
        commandData: params
      }
    } else {
      return {
        message: 'Unknown object type',
        success: false,
        error: 'Invalid object type'
      }
    }
  }

  /**
   * Handle modify command for selected objects
   */
  private async handleModifyCommand(commandData: AICommand, selectedObjects: string[]): Promise<AIResponse> {
    if (selectedObjects.length === 0) {
      return {
        message: 'No objects selected. Please select objects first before modifying them.',
        success: false,
        error: 'No objects selected'
      }
    }

    console.log('🔧 Modifying objects:', selectedObjects, 'with command:', commandData)

    try {
      const results = []
      
      for (const objectId of selectedObjects) {
        // Get current object properties
        const currentObject = await this.operations.getObject(objectId)
        if (!currentObject) {
          console.error(`❌ Object ${objectId} not found`)
          continue
        }

        // Check if object is already owned by current user, otherwise claim it
        if (this.stateUpdater) {
          // If object is already owned by current user, no need to claim
          if (currentObject.owner === this.operations['user'].id) {
            console.log(`✅ Object ${objectId} already owned by current user - proceeding with modification`)
          } else {
            console.log(`🏷️ Attempting to claim object ${objectId} for AI modification`)
            const claimSucceeded = await this.stateUpdater.claimObject(objectId)
            if (!claimSucceeded) {
              console.error(`❌ Failed to claim object ${objectId} - skipping modification`)
              continue
            }
            console.log(`✅ Successfully claimed object ${objectId}`)
          }
        }

        const modifications: Partial<CanvasObject> = {}
        
        // Apply delta position changes (relative movement)
        if (commandData.deltaX !== null && commandData.deltaX !== 0) {
          modifications.x = currentObject.x + commandData.deltaX
        }
        if (commandData.deltaY !== null && commandData.deltaY !== 0) {
          modifications.y = currentObject.y + commandData.deltaY
        }
        
        // Apply absolute position changes (override deltas if both present)
        if (commandData.newX !== null) {
          modifications.x = commandData.newX
        }
        if (commandData.newY !== null) {
          modifications.y = commandData.newY
        }
        
        // Apply scaling (proportional size changes)
        if (commandData.scaleBy !== null && commandData.scaleBy !== 0) {
          modifications.width = currentObject.width * (1 + commandData.scaleBy)
          modifications.height = currentObject.height * (1 + commandData.scaleBy)
        }
        
        // Apply color change
        if (commandData.color !== null) {
          modifications.color = commandData.color
        }
        
        // Apply specific size changes (override scaling if both present)
        if (commandData.newWidth !== null) {
          modifications.width = commandData.newWidth
        }
        if (commandData.newHeight !== null) {
          modifications.height = commandData.newHeight
        }
        
        // Only apply modifications if there are any
        if (Object.keys(modifications).length > 0) {
          console.log(`🔧 Applying modifications to ${objectId}:`, modifications)
          
          // Use stateUpdater's updateObject method which includes optimistic updates
          const result = this.stateUpdater 
            ? await this.stateUpdater.updateObject(objectId, modifications)
            : await this.operations.updateObject(objectId, modifications)
            
          console.log(`🔧 Update result for ${objectId}:`, result)
          if (result) {
            results.push(result)
          }
        } else {
          console.log(`🔧 No modifications to apply for ${objectId}`)
        }
      }
      
      if (results.length > 0) {
        return {
          message: `Successfully modified ${results.length} object(s)`,
          success: true,
          commandData: commandData
        }
      } else {
        return {
          message: 'No modifications were applied',
          success: true,
          commandData: commandData
        }
      }
    } catch (error) {
      console.error('❌ Modify command failed:', error)
      return {
        message: 'Failed to modify objects',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check if the AI service is properly initialized
   */
  isReady(): boolean {
    return !!this.operations && !!this.canvasSize
  }

  /**
   * Get the canvas size for context
   */
  getCanvasSize(): CanvasSize {
    return this.canvasSize
  }

  /**
   * Update canvas size (called when canvas is resized)
   */
  updateCanvasSize(newSize: CanvasSize): void {
    this.canvasSize = newSize
    console.log('📐 CanvasAI updated canvas size:', newSize)
  }
}

/**
 * Factory function to create CanvasAI instance
 * 
 * @param operations - CanvasOperations service instance
 * @param canvasSize - Current canvas dimensions
 * @param stateUpdater - Optional state updater for local state management
 * @param currentColor - Optional current color for object creation
 * @param viewportInfo - Optional viewport information for positioning
 * @returns CanvasAI instance
 */
export function createCanvasAI(
  operations: CanvasOperations, 
  canvasSize: CanvasSize, 
  stateUpdater?: CanvasStateUpdater,
  currentColor?: string,
  viewportInfo?: { scale: number; position: { x: number; y: number } }
): CanvasAI {
  return new CanvasAI(operations, canvasSize, stateUpdater, currentColor, viewportInfo)
}

/**
 * Example usage:
 * 
 * ```typescript
 * const ai = createCanvasAI(operations, { width: 800, height: 600 })
 * 
 * const response = await ai.processMessage("Create a rectangle")
 * if (response.success) {
 *   console.log('AI response:', response.message)
 *   console.log('Object type:', response.objectType)
 * } else {
 *   console.error('AI error:', response.error)
 * }
 * ```
 */