'use client'

import { Button } from '@/components/ui/button'
import { MousePointer2, Square, Circle, Type } from 'lucide-react'
import { CanvasState } from '@/types/canvas'

interface ToolbarProps {
  currentTool: CanvasState['tool']
  onToolChange: (tool: CanvasState['tool']) => void
}

export default function Toolbar({ currentTool, onToolChange }: ToolbarProps) {
  return (
    <div className="bg-white border-r border-gray-200 w-16 flex flex-col items-center py-4 space-y-2">
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
  )
}
