/**
 * Z-Index Controls Component
 * 
 * Provides UI controls for manipulating object layering (z-index).
 * This component displays z-index manipulation buttons that are only enabled
 * when objects are selected, allowing users to bring objects to front or back.
 * 
 * Features:
 * - Bring to Front button - Moves selected objects to the top layer
 * - Send to Back button - Moves selected objects to the bottom layer
 * - Disabled state when no objects are selected
 * - Visual feedback with appropriate icons
 * - Integration with CanvasOperations service
 */

'use client'

import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'
import { CanvasOperations } from '@/lib/canvas/CanvasOperations'

interface ZIndexControlsProps {
  /** Array of currently selected object IDs */
  selectedObjects: string[]
  /** Canvas operations service instance */
  operations: CanvasOperations | null
  /** Whether controls should be disabled (e.g., during operations) */
  disabled?: boolean
  /** Callback when z-index operation completes */
  onOperationComplete?: () => void
  /** Temporary: Canvas operations from useCanvas hook */
  canvasOperations?: {
    bringToFront?: (id: string | string[]) => Promise<any>
  } | null
}

/**
 * Z-Index Controls Component
 * 
 * Renders buttons for z-index manipulation operations.
 * Only enabled when objects are selected and operations service is available.
 */
export default function ZIndexControls({ 
  selectedObjects, 
  operations, 
  disabled = false,
  onOperationComplete,
  canvasOperations
}: ZIndexControlsProps) {
  
  /**
   * Handle bring to front operation
   * 
   * Brings all selected objects to the front (highest z-index).
   * Processes objects sequentially to maintain proper layering.
   */
  const handleBringToFront = async () => {
    if (selectedObjects.length === 0) return
    
    try {
      console.log('🔝 Bringing objects to front:', selectedObjects)
      
      // Use CanvasOperations service if available, otherwise use temporary operations
      if (operations) {
        // Pass all selected objects at once
        await operations.bringToFront(selectedObjects)
      } else if (canvasOperations?.bringToFront) {
        // Pass all selected objects at once
        await canvasOperations.bringToFront(selectedObjects)
      } else {
        console.warn('⚠️ No z-index operations available')
        return
      }
      
      console.log('✅ All objects brought to front')
      onOperationComplete?.()
    } catch (error) {
      console.error('❌ Failed to bring objects to front:', error)
    }
  }

  // Determine if controls should be enabled
  const isEnabled = !disabled && selectedObjects.length > 0 && (operations || canvasOperations)

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Section Label */}
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        Layer
      </div>
      
      {/* Bring to Front Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`w-10 h-10 p-0 flex items-center justify-center transition-colors ${
          isEnabled
            ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 cursor-pointer'
            : 'text-gray-400 cursor-not-allowed'
        }`}
        title={isEnabled ? 'Bring to Front' : 'Select objects to bring to front'}
        onClick={handleBringToFront}
        disabled={!isEnabled}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      
      {/* Selection Count Indicator */}
      {selectedObjects.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {selectedObjects.length} selected
        </div>
      )}
    </div>
  )
}

/**
 * Usage Example:
 * 
 * ```tsx
 * <ZIndexControls
 *   selectedObjects={canvasState.selectedObjects}
 *   operations={canvasOperations}
 *   disabled={isLoading}
 *   onOperationComplete={() => {
 *     // Refresh UI or show success message
 *   }}
 * />
 * ```
 * 
 * Integration Notes:
 * - Requires CanvasOperations service instance
 * - Needs access to selectedObjects from canvas state
 * - Can be integrated into existing toolbar or used standalone
 * - Provides visual feedback for disabled/enabled states
 * - Handles multiple selected objects automatically
 */
