'use client'

import { Line } from 'react-konva'

interface GridProps {
  width: number
  height: number
  gridSize?: number
  stroke?: string
  strokeWidth?: number
}

export default function Grid({
  width,
  height,
  gridSize = 20,
  stroke = '#e5e7eb',
  strokeWidth = 0.5,
}: GridProps) {
  const lines = []

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
