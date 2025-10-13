'use client'

import { useEffect, useState, useRef } from 'react'
import CanvasStage from './CanvasStage'
import Grid from './Grid'

interface CanvasProps {
  className?: string
}

export default function Canvas({ className = '' }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [currentScale, setCurrentScale] = useState(1)

  // Update canvas dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        setDimensions({
          width: clientWidth,
          height: clientHeight,
        })
      }
    }

    // Initial size
    updateDimensions()

    // Handle resize
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Virtual canvas size (larger than viewport for infinite canvas feel)
  const virtualCanvasSize = {
    width: 5000,
    height: 5000,
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full min-h-[600px] ${className}`}
    >
      <CanvasStage 
        width={dimensions.width} 
        height={dimensions.height}
        onScaleChange={setCurrentScale}
      >
        <Grid 
          width={virtualCanvasSize.width} 
          height={virtualCanvasSize.height} 
          gridSize={20}
          stroke="#f3f4f6"
          strokeWidth={0.5}
          scale={currentScale}
        />
      </CanvasStage>
    </div>
  )
}
