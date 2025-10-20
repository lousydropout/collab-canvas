"use client";

import React, { memo } from "react";
import { Group, RegularPolygon, Rect, Text } from "react-konva";
import Konva from "konva";
import { CanvasObject } from "@/types/canvas";

interface TriangleProps {
  object: CanvasObject;
  isSelected?: boolean;
  onSelect?: (id: string, event?: any) => void;
  onMove?: (id: string, updates: Partial<CanvasObject>) => void;
  // Ownership props
  ownershipStatus?: "available" | "claimed" | "claimed_by_me" | "expired";
  ownerInfo?: { owner_name: string | null; expires_at: string | null } | null;
  isPendingClaim?: boolean;
  onClaimAttempt?: (objectId: string) => Promise<boolean>;
  onOwnershipExtend?: (objectId: string) => void;
}

const Triangle = memo(function Triangle({
  object,
  isSelected = false,
  onSelect,
  onMove,
  ownershipStatus = "available",
  ownerInfo,
  isPendingClaim = false,
  onClaimAttempt,
  onOwnershipExtend,
}: TriangleProps) {
  const handleDragStart = async (e: any) => {
    // Aggressively stop all event propagation
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();

    // Stop the event at the Konva level too
    if (e.evt) {
      e.evt.stopPropagation();
      e.evt.preventDefault();
      e.evt.cancelBubble = true;
    }

    try {
      // If object is available, claim it first
      if (ownershipStatus === "available" && onClaimAttempt) {
        console.log(`🏷️ Attempting to claim object ${object.id} before drag`);
        const claimSucceeded = await onClaimAttempt(object.id);

        if (!claimSucceeded) {
          console.log(
            `❌ Claim failed, cancelling drag for object ${object.id}`
          );
          // Cancel the drag by stopping the event
          e.target.stopDrag();
          return;
        }

        console.log(
          `✅ Claim succeeded, proceeding with drag for object ${object.id}`
        );
      }

      console.log(`🏷️ Starting drag for object ${object.id}`);

      // Ensure triangle is selected when starting to drag
      if (!isSelected) {
        onSelect?.(object.id, e);
      }
    } catch (error) {
      console.error(`❌ Error in drag start for object ${object.id}:`, error);
      // Cancel the drag on any error
      e.target.stopDrag();
    }
  };

  const handleDragEnd = (e: any) => {
    // Aggressively stop all event propagation to prevent Stage drag
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();

    // Stop the event at the Konva level too
    if (e.evt) {
      e.evt.stopPropagation();
      e.evt.preventDefault();
      e.evt.cancelBubble = true;
    }

    const node = e.target;
    const centerX = node.x();
    const centerY = node.y();

    // Convert from center coordinates back to top-left bounding box coordinates
    // Triangle is stored as a rectangle in the database, so use rectangle logic
    const newX = centerX - object.width / 2;
    const newY = centerY - object.height / 2;

    onMove?.(object.id, { x: newX, y: newY });

    // Extend ownership after drag
    onOwnershipExtend?.(object.id);
  };

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const centerX = node.x();
    const centerY = node.y();
    const radius = (node as any).radius();

    // Reset scale to 1 and update radius instead
    node.scaleX(1);
    node.scaleY(1);

    const newWidth = Math.max(5, object.width * scaleX);
    const newHeight = Math.max(5, object.height * scaleY);

    // Convert from center coordinates back to top-left bounding box coordinates
    // Triangle is stored as a rectangle in the database, so use rectangle logic
    const newX = centerX - newWidth / 2;
    const newY = centerY - newHeight / 2;

    onMove?.(object.id, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
    });
    onOwnershipExtend?.(object.id);
  };

  // Calculate triangle properties for RegularPolygon
  const getTriangleProps = () => {
    const { x, y, width, height } = object;

    // For RegularPolygon, we need to position it so the bounding box matches our stored coordinates
    // RegularPolygon draws from center, so we need to offset to match the expected bounding box
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Use the smaller dimension as radius to ensure triangle fits in bounding box
    const radius = Math.min(width, height) / 2;

    return {
      x: centerX,
      y: centerY,
      radius: radius,
      sides: 3, // Makes it a triangle
    };
  };

  // Calculate ownership-based styling
  const getOwnershipStyling = () => {
    if (isPendingClaim) {
      return {
        stroke: "#fbbf24", // yellow for pending
        strokeWidth: 3,
        dash: [5, 5], // dashed border for pending
        shadowColor: "#fbbf24",
        shadowBlur: 8,
        shadowOpacity: 0.5,
      };
    }

    switch (ownershipStatus) {
      case "claimed_by_me":
        return {
          stroke: "#10b981", // green for my claim
          strokeWidth: 2,
          shadowColor: "#10b981",
          shadowBlur: 6,
          shadowOpacity: 0.3,
        };
      case "claimed":
        return {
          stroke: "#ef4444", // red for claimed by others
          strokeWidth: 2,
          shadowColor: "#ef4444",
          shadowBlur: 6,
          shadowOpacity: 0.3,
        };
      case "expired":
        return {
          stroke: "#6b7280", // gray for expired
          strokeWidth: 1,
          dash: [3, 3],
          shadowOpacity: 0.1,
        };
      case "available":
      default:
        return {
          stroke: isSelected ? object.color : undefined,
          strokeWidth: isSelected ? 2 : undefined,
          shadowColor: isSelected ? object.color : undefined,
          shadowBlur: isSelected ? 10 : undefined,
          shadowOpacity: isSelected ? 0.3 : undefined,
        };
    }
  };

  // Check if interaction is allowed
  const canInteract =
    ownershipStatus === "available" ||
    ownershipStatus === "claimed_by_me" ||
    ownershipStatus === "expired";

  const handleClick = async (e: any) => {
    // Stop event from bubbling to canvas
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();

    // Don't allow selection if object is owned by someone else
    if (!canInteract) {
      console.log(
        `🚫 Cannot select object ${object.id}: owned by ${ownerInfo?.owner_name}`
      );
      return;
    }

    // If object is already claimed by me, select immediately
    if (ownershipStatus === "claimed_by_me") {
      onSelect?.(object.id, e);
      return;
    }

    // Attempt to claim object on selection and only select if claim succeeds
    if (onClaimAttempt) {
      console.log(`🏷️ Attempting to claim object ${object.id} on selection`);
      const claimSucceeded = await onClaimAttempt(object.id);

      if (claimSucceeded) {
        console.log(`✅ Claim succeeded, selecting object ${object.id}`);
        onSelect?.(object.id, e);
      } else {
        console.log(`❌ Claim failed, not selecting object ${object.id}`);
      }
    } else {
      // No claim attempt needed (object is available), select directly
      onSelect?.(object.id, e);
    }
  };

  const triangleProps = getTriangleProps();
  const ownershipStyling = getOwnershipStyling();

  // Show owner label for objects owned by others
  const showOwnerLabel = ownershipStatus === "claimed" && ownerInfo?.owner_name;

  return (
    <Group>
      <RegularPolygon
        id={object.id}
        x={triangleProps.x}
        y={triangleProps.y}
        radius={triangleProps.radius}
        sides={triangleProps.sides}
        fill={object.color}
        rotation={object.rotation}
        draggable={
          canInteract &&
          !isPendingClaim &&
          (ownershipStatus === "claimed_by_me" ||
            ownershipStatus === "available")
        }
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        // Apply ownership-based styling
        stroke={ownershipStyling.stroke}
        strokeWidth={ownershipStyling.strokeWidth}
        dash={ownershipStyling.dash}
        shadowBlur={ownershipStyling.shadowBlur}
        shadowColor={ownershipStyling.shadowColor}
        shadowOpacity={ownershipStyling.shadowOpacity}
        // Visual feedback for interaction state
        opacity={canInteract ? 1 : 0.7}
        // Show not-allowed cursor for objects owned by others
        listening={canInteract}
        cursor={canInteract ? "pointer" : "not-allowed"}
        getClientRect={(node: any) => {
          // Tell Konva the actual bounds of the triangle for proper transformer positioning
          const { x, y, width, height } = object;
          return {
            x: x,
            y: y,
            width: width,
            height: height,
          };
        }}
      />

      {/* Owner label for objects owned by others */}
      {showOwnerLabel && ownerInfo?.owner_name && (
        <>
          {/* Background for text */}
          <Rect
            x={object.x}
            y={object.y - 25}
            width={Math.max(80, ownerInfo.owner_name.length * 7 + 16)}
            height={20}
            fill="rgba(239, 68, 68, 0.9)"
            cornerRadius={4}
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
  );
});

export default Triangle;
