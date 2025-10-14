'use client'

import { Group, Line, Text, Rect } from 'react-konva'

interface CursorProps {
  userId: string
  displayName: string
  position: {
    x: number
    y: number
  }
  color: string
}

export default function Cursor({ userId, displayName, position, color }: CursorProps) {
  // Generate cursor path (pointer shape)
  const cursorPath = [
    // Cursor pointer shape coordinates
    0, 0,          // tip
    0, 16,         // bottom left
    4, 12,         // inner left
    8, 18,         // outer bottom
    12, 14,        // inner bottom  
    18, 18,        // outer right
    8, 8,          // inner right
    12, 4,         // top right
    0, 0           // back to tip
  ]

  return (
    <Group x={position.x} y={position.y}>
      {/* Cursor pointer */}
      <Line
        points={cursorPath}
        fill={color}
        stroke="white"
        strokeWidth={1}
        closed={true}
        shadowColor="rgba(0,0,0,0.3)"
        shadowOffset={{ x: 1, y: 1 }}
        shadowBlur={2}
        listening={false} // Don't interfere with mouse events
      />
      
      {/* User name label */}
      <Group x={20} y={0}>
        {/* Label background */}
        <Rect
          x={0}
          y={0}
          width={displayName.length * 7 + 12} // Approximate width based on character count
          height={20}
          fill={color}
          cornerRadius={4}
          shadowColor="rgba(0,0,0,0.2)"
          shadowOffset={{ x: 1, y: 1 }}
          shadowBlur={2}
          listening={false}
        />
        
        {/* Label text */}
        <Text
          x={6}
          y={3}
          text={displayName}
          fontSize={12}
          fontFamily="Inter, system-ui, sans-serif"
          fill="white"
          fontStyle="500"
          listening={false}
        />
      </Group>
    </Group>
  )
}
