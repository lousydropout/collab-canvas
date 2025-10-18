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
import { detectObjectIntent } from './serverActions'

// Default values for object creation
const DEFAULT_SIZE = { width: 200, height: 150 }
const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']

export interface AIResponse {
  message: string
  success: boolean
  error?: string
  objectType?: number // -1: none, 0: rectangle, 1: ellipse
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

  constructor(operations: CanvasOperations, canvasSize: CanvasSize, stateUpdater?: CanvasStateUpdater) {
    this.operations = operations
    this.canvasSize = canvasSize
    this.stateUpdater = stateUpdater
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

      if (!result.success) {
        console.log('❌ Server action failed:', result.error)
        return {
          message: result.error || 'An error occurred',
          success: false,
          error: result.error,
          objectType: -1
        }
      }

      if (result.objectType === -1) {
        console.log('ℹ️ No object creation intent detected')
        return {
          message: 'I didn\'t detect any object creation request. Try saying "create a rectangle" or "add an ellipse".',
          success: true,
          objectType: -1
        }
      }

      // Create object with default values
      const objectTypeName = result.objectType === 0 ? 'rectangle' : 'ellipse'
      console.log(`🎨 Creating ${objectTypeName} with objectType: ${result.objectType}`)
      
      const createdObject = await this.createObjectWithDefaults(objectTypeName as 'rectangle' | 'ellipse')
      console.log('🎨 Created object result:', createdObject)
      
      if (createdObject) {
        console.log(`✅ Successfully created ${objectTypeName}:`, createdObject.id)
        return {
          message: `Successfully created a ${objectTypeName} with default settings!`,
          success: true,
          objectType: result.objectType
        }
      } else {
        console.log(`❌ Failed to create ${objectTypeName}`)
        return {
          message: `Failed to create ${objectTypeName}`,
          success: false,
          error: 'Object creation failed',
          objectType: result.objectType
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
        error: error instanceof Error ? error.message : 'Unknown error',
        objectType: -1
      }
    }
  }

  /**
   * Create object with default values
   */
  private async createObjectWithDefaults(objectType: 'rectangle' | 'ellipse') {
    try {
      console.log(`🎨 createObjectWithDefaults called for: ${objectType}`)
      console.log(`🎨 Canvas size:`, this.canvasSize)
      console.log(`🎨 Operations instance:`, !!this.operations)
      
      // Calculate center position
      const x = (this.canvasSize.width - DEFAULT_SIZE.width) / 2
      const y = (this.canvasSize.height - DEFAULT_SIZE.height) / 2
      
      // Pick random color
      const color = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
      
      console.log(`🎨 Creating ${objectType} with defaults:`, {
        x, y, width: DEFAULT_SIZE.width, height: DEFAULT_SIZE.height, color
      })

          if (objectType === 'rectangle') {
            const result = await this.operations.createRectangle({
              type: 'rectangle',
              x,
              y,
              width: DEFAULT_SIZE.width,
              height: DEFAULT_SIZE.height,
              color,
              rotation: 0
            })
            console.log(`🎨 createRectangle result:`, result)
            
            // Add to local state if state updater is available
            if (result && this.stateUpdater) {
              console.log(`🎨 Adding rectangle to local state:`, result.id)
              await this.stateUpdater.initializeOwnership(result, this.operations['user'].id, this.operations['user'].email)
              this.stateUpdater.addObject(result)
            }
            
            return result
          } else if (objectType === 'ellipse') {
            const result = await this.operations.createEllipse({
              x,
              y,
              width: DEFAULT_SIZE.width,
              height: DEFAULT_SIZE.height,
              color,
              rotation: 0
            })
            console.log(`🎨 createEllipse result:`, result)
            
            // Add to local state if state updater is available
            if (result && this.stateUpdater) {
              console.log(`🎨 Adding ellipse to local state:`, result.id)
              await this.stateUpdater.initializeOwnership(result, this.operations['user'].id, this.operations['user'].email)
              this.stateUpdater.addObject(result)
            }
            
            return result
          }
      
      console.log(`🎨 Unknown object type: ${objectType}`)
      return null
    } catch (error) {
      console.error('❌ Failed to create object with defaults:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return null
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
 * @returns CanvasAI instance
 */
export function createCanvasAI(operations: CanvasOperations, canvasSize: CanvasSize, stateUpdater?: CanvasStateUpdater): CanvasAI {
  return new CanvasAI(operations, canvasSize, stateUpdater)
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