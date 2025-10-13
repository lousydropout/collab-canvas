'use client'

import { Line } from 'react-konva'

interface GridProps {
  width: number
  height: number
  gridSize?: number
  stroke?: string
  strokeWidth?: number
  scale?: number
}

export default function Grid({ 
  width, 
  height, 
  gridSize = 20, 
  stroke = '#e5e7eb', 
  strokeWidth = 0.5,
  scale = 1
}: GridProps) {
  const lines = []
  
  // Log visible grid size for debugging
  // Note: The grid lines themselves don't change size, but appear larger/smaller due to canvas scale
  if (Math.abs(scale - 1) > 0.001) {
    console.log(`📐 Grid appears as: ${(gridSize * scale).toFixed(1)}px spacing at ${(scale * 100).toFixed(0)}% zoom`)
  }

  // Vertical lines
  for (let i = 0; i <= width / gridSize; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i * gridSize, 0, i * gridSize, height]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        listening={false}
      />
    )
  }

  // Horizontal lines
  for (let i = 0; i <= height / gridSize; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * gridSize, width, i * gridSize]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        listening={false}
      />
    )
  }

  return <>{lines}</>
}
