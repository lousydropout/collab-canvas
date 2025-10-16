'use client'

import { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'
import Konva from 'konva'

interface TransformerProps {
  selectedIds: string[]
  onTransform?: (id: string, updates: any) => void
}

export default function KonvaTransformer({ selectedIds, onTransform }: TransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    // Find all selected nodes on the stage
    const stage = transformer.getStage()
    if (!stage) return

    const selectedNodes = selectedIds
      .map(id => stage.findOne(`#${id}`))
      .filter((node): node is Konva.Node => node !== null && node !== undefined)
    
    if (selectedNodes.length === 0) {
      transformer.nodes([])
      return
    }

    // Attach transformer to selected nodes
    transformer.nodes(selectedNodes)
    transformer.getLayer()?.batchDraw()

    // Handle transform end (resize/rotate)
    const handleTransformEnd = () => {
      selectedNodes.forEach(node => {
        if (!node) return
        
        const id = node.id()
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        
        // Check if this is an ellipse by looking at the node type
        const isEllipse = node.getClassName() === 'Ellipse'
        
        // For ellipses, convert center coordinates back to top-left corner
        // For rectangles, use coordinates directly (they're already top-left)
        const updates = isEllipse ? {
          x: node.x() - (node.width() * scaleX) / 2,
          y: node.y() - (node.height() * scaleY) / 2,
          width: node.width() * scaleX,
          height: node.height() * scaleY,
          rotation: node.rotation()
        } : {
          x: node.x(),
          y: node.y(),
          width: node.width() * scaleX,
          height: node.height() * scaleY,
          rotation: node.rotation()
        }
        
        // Reset scale to 1 after applying to width/height
        node.scaleX(1)
        node.scaleY(1)
        node.width(updates.width)
        node.height(updates.height)
        
        console.log(`🔄 Object ${id} transformed:`, updates)
        onTransform?.(id, updates)
      })
    }

    transformer.on('transformend', handleTransformEnd)

    return () => {
      transformer.off('transformend', handleTransformEnd)
    }
  }, [selectedIds, onTransform])

  // Only render if there are selected objects
  if (selectedIds.length === 0) return null

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={true}
      enabledAnchors={[
        'top-left', 'top-center', 'top-right',
        'middle-left', 'middle-right',
        'bottom-left', 'bottom-center', 'bottom-right'
      ]}
      boundBoxFunc={(oldBox, newBox) => {
        // Minimum size constraints
        if (newBox.width < 10 || newBox.height < 10) {
          return oldBox
        }
        return newBox
      }}
    />
  )
}
