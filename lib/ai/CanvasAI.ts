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
import { detectObjectIntent, AICommand } from './serverActions'

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
  initializeOwnership: (object: CanvasObject, userId: string, displayName?: string) => Promise<void>
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
   * @returns Promise<AIResponse> - AI's response and operation result
   */
  async processMessage(message: string): Promise<AIResponse> {
    try {
      console.log('🤖 Processing AI message:', message)

      // Call the server action for intent detection
      const result = await detectObjectIntent(message)
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
        return {
          message: 'Modify commands are not yet supported',
          success: false,
          error: 'Modify commands not implemented'
        }
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
  } {
    const center = this.getViewportCenter()
    const width = commandData.width ?? DEFAULT_SIZE.width
    const height = commandData.height ?? DEFAULT_SIZE.height
    
    return {
      command: commandData.command || 'create',
      objectType: commandData.objectType || 'rectangle',
      x: commandData.x ?? (center.x - width / 2),
      y: commandData.y ?? (center.y - height / 2),
      width,
      height,
      color: commandData.color ?? this.currentColor
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