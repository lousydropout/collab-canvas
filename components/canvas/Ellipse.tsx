'use client'

import { Ellipse as KonvaEllipse, Text, Group, Rect } from 'react-konva'
import { CanvasObject } from '@/types/canvas'

interface EllipseProps {
  object: CanvasObject
  isSelected?: boolean
  onSelect?: (id: string, event?: any) => void
  onMove?: (id: string, updates: Partial<CanvasObject>) => void
  // Ownership props (same as Rectangle)
  ownershipStatus?: 'available' | 'claimed' | 'claimed_by_me' | 'expired'
  ownerInfo?: { owner_name: string | null; expires_at: string | null } | null
  isPendingClaim?: boolean
  onClaimAttempt?: (objectId: string) => Promise<boolean>
  onOwnershipExtend?: (objectId: string) => void
}

export default function Ellipse({ 
  object, 
  isSelected = false, 
  onSelect, 
  onMove,
  ownershipStatus = 'available',
  ownerInfo,
  isPendingClaim = false,
  onClaimAttempt,
  onOwnershipExtend
}: EllipseProps) {
  // Same ownership logic as Rectangle component
  const getOwnershipStyling = () => {
    if (isPendingClaim) {
      return {
        stroke: '#fbbf24', // yellow for pending
        strokeWidth: 3,
        dash: [5, 5], // dashed border for pending
        shadowColor: '#fbbf24',
        shadowBlur: 8,
        shadowOpacity: 0.5,
      }
    }

    switch (ownershipStatus) {
      case 'claimed_by_me':
        return {
          stroke: '#10b981', // green for my claim
          strokeWidth: 2,
          shadowColor: '#10b981',
          shadowBlur: 6,
          shadowOpacity: 0.3,
        }
      case 'claimed':
        return {
          stroke: '#ef4444', // red for claimed by others
          strokeWidth: 2,
          shadowColor: '#ef4444',
          shadowBlur: 6,
          shadowOpacity: 0.3,
        }
      case 'expired':
        return {
          stroke: '#6b7280', // gray for expired
          strokeWidth: 1,
          dash: [3, 3],
          shadowOpacity: 0.1,
        }
      case 'available':
      default:
        return {
          stroke: isSelected ? object.color : undefined,
          strokeWidth: isSelected ? 2 : undefined,
          shadowColor: isSelected ? object.color : undefined,
          shadowBlur: isSelected ? 10 : undefined,
          shadowOpacity: isSelected ? 0.3 : undefined,
        }
    }
  }

  // Check if interaction is allowed
  const canInteract = ownershipStatus === 'available' || ownershipStatus === 'claimed_by_me' || ownershipStatus === 'expired'

  const handleClick = async (e: any) => {
    // Stop event from bubbling to canvas
    e.cancelBubble = true
    if (e.stopPropagation) e.stopPropagation()
    
    // Don't allow selection if object is owned by someone else
    if (!canInteract) {
      console.log(`🚫 Cannot select object ${object.id}: owned by ${ownerInfo?.owner_name}`)
      return
    }
    
    // If object is already claimed by me, select immediately
    if (ownershipStatus === 'claimed_by_me') {
      onSelect?.(object.id, e)
      return
    }
    
    // Attempt to claim object on selection and only select if claim succeeds
    if (onClaimAttempt) {
      console.log(`🏷️ Attempting to claim object ${object.id} on selection`)
      const claimSucceeded = await onClaimAttempt(object.id)
      
      if (claimSucceeded) {
        console.log(`✅ Claim succeeded, selecting object ${object.id}`)
        onSelect?.(object.id, e)
      } else {
        console.log(`❌ Claim failed, not selecting object ${object.id}`)
      }
    } else {
      // No claim attempt needed (object is available), select directly
      onSelect?.(object.id, e)
    }
  }

  const handleDragStart = (e: any) => {
    // Aggressively stop all event propagation
    e.cancelBubble = true
    if (e.stopPropagation) e.stopPropagation()
    if (e.preventDefault) e.preventDefault()
    
    // Stop the event at the Konva level too
    if (e.evt) {
      e.evt.stopPropagation()
      e.evt.preventDefault()
      e.evt.cancelBubble = true
    }
    
    // Since draggable is only true when claimed_by_me, we can assume ownership is valid
    console.log(`🏷️ Starting drag for object ${object.id} (already claimed by me)`)
    
    // Ensure ellipse is selected when starting to drag
    if (!isSelected) {
      onSelect?.(object.id, e)
    }
  }

  const handleDragEnd = (e: any) => {
    // Aggressively stop all event propagation to prevent Stage drag
    e.cancelBubble = true
    if (e.stopPropagation) e.stopPropagation()
    if (e.preventDefault) e.preventDefault()
    
    // Stop the event at the Konva level too
    if (e.evt) {
      e.evt.stopPropagation()
      e.evt.preventDefault()
      e.evt.cancelBubble = true
    }
    
    const node = e.target
    // Convert center coordinates back to top-left corner coordinates
    const newPos = {
      x: node.x() - object.width / 2,
      y: node.y() - object.height / 2,
    }
    console.log(`🔵 Ellipse moved to: (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)})`)
    onMove?.(object.id, newPos)
    
    // Extend ownership after drag
    onOwnershipExtend?.(object.id)
  }

  const ownershipStyling = getOwnershipStyling()
  const showOwnerLabel = ownershipStatus === 'claimed' && ownerInfo?.owner_name

  return (
    <Group>
      <KonvaEllipse
        id={object.id}
        x={object.x + object.width / 2}  // Center X
        y={object.y + object.height / 2} // Center Y
        radiusX={object.width / 2}        // Half width
        radiusY={object.height / 2}       // Half height
        fill={object.color}
        rotation={object.rotation}
        draggable={canInteract && !isPendingClaim && ownershipStatus === 'claimed_by_me'}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        // Apply ownership-based styling
        stroke={ownershipStyling.stroke}
        strokeWidth={ownershipStyling.strokeWidth}
        dash={ownershipStyling.dash}
        shadowBlur={ownershipStyling.shadowBlur}
        shadowColor={ownershipStyling.shadowColor}
        shadowOpacity={ownershipStyling.shadowOpacity}
        // Visual feedback for interaction state
        opacity={canInteract ? 1 : 0.7}
        listening={canInteract}
        cursor={canInteract ? 'pointer' : 'not-allowed'}
      />
      
      {/* Owner label for objects owned by others - use ellipse background */}
      {showOwnerLabel && ownerInfo?.owner_name && (
        <>
          {/* Background for text - ellipse to match object shape */}
          <KonvaEllipse
            x={object.x + Math.max(80, ownerInfo.owner_name.length * 7 + 16) / 2}
            y={object.y - 15}
            radiusX={Math.max(80, ownerInfo.owner_name.length * 7 + 16) / 2}
            radiusY={10}
            fill="rgba(239, 68, 68, 0.9)"
            listening={false}
          />
          {/* Owner name text */}
          <Text
            x={object.x + 8}
            y={object.y - 20}
            text={ownerInfo.owner_name}
            fontSize={12}
            fontFamily="Arial, sans-serif"
            fill="white"
            listening={false}
          />
        </>
      )}
    </Group>
  )
}
