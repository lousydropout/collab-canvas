'use client'

import { Button } from '@/components/ui/button'
import { MousePointer2, Square, Circle, Type } from 'lucide-react'

export default function Toolbar() {
  return (
    <div className="bg-white border-r border-gray-200 w-16 flex flex-col items-center py-4 space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-10 h-10 p-0"
        title="Select Tool"
      >
        <MousePointer2 className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-10 h-10 p-0"
        title="Rectangle Tool"
        disabled
      >
        <Square className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-10 h-10 p-0"
        title="Circle Tool"
        disabled
      >
        <Circle className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-10 h-10 p-0"
        title="Text Tool"
        disabled
      >
        <Type className="h-4 w-4" />
      </Button>
    </div>
  )
}
