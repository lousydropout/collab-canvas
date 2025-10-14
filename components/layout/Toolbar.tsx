'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MousePointer2, Square, Circle, Type } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { CanvasState } from '@/types/canvas'

interface ToolbarProps {
  currentTool: CanvasState['tool']
  currentColor: string
  onToolChange: (tool: CanvasState['tool']) => void
  onColorChange: (color: string) => void
}

export default function Toolbar({ currentTool, currentColor, onToolChange, onColorChange }: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  return (
    <div className="bg-white border-r border-gray-200 w-16 flex flex-col items-center py-4">
      {/* Tools Section */}
      <div className="space-y-2">
        <Button
          variant={currentTool === 'select' ? 'default' : 'ghost'}
          size="sm"
          className={`w-10 h-10 p-0 cursor-pointer ${
            currentTool === 'select' 
              ? '!bg-blue-600 !text-white hover:!bg-blue-700' 
              : '!text-gray-700 hover:!text-gray-900 hover:!bg-gray-100'
          }`}
          title="Select Tool"
          onClick={() => onToolChange('select')}
        >
          <MousePointer2 className="h-4 w-4" />
        </Button>
        
        <Button
          variant={currentTool === 'rectangle' ? 'default' : 'ghost'}
          size="sm"
          className={`w-10 h-10 p-0 cursor-pointer ${
            currentTool === 'rectangle' 
              ? '!bg-blue-600 !text-white hover:!bg-blue-700' 
              : '!text-gray-700 hover:!text-gray-900 hover:!bg-gray-100'
          }`}
          title="Rectangle Tool"
          onClick={() => onToolChange('rectangle')}
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 text-gray-400 cursor-not-allowed"
          title="Circle Tool (Coming Soon)"
          disabled
        >
          <Circle className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 text-gray-400 cursor-not-allowed"
          title="Text Tool (Coming Soon)"
          disabled
        >
          <Type className="h-4 w-4" />
        </Button>
      </div>

      {/* Color Picker Section - Pushed to Bottom */}
      <div className="mt-auto relative" ref={pickerRef}>
        <button
          className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors cursor-pointer shadow-sm"
          style={{ backgroundColor: currentColor }}
          title="Choose Color"
          onClick={() => setShowColorPicker(!showColorPicker)}
        />
        
        {showColorPicker && (
          <div className="absolute bottom-12 left-0 z-50 p-3 bg-white rounded-lg shadow-xl border border-gray-200">
            <HexColorPicker color={currentColor} onChange={onColorChange} />
            <div className="mt-2 text-xs text-center text-gray-600 font-mono">
              {currentColor.toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
