"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer } from "react-konva";
import Konva from "konva";

interface CanvasStageProps {
  width: number;
  height: number;
  children?: React.ReactNode;
  onScaleChange?: (scale: number) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onStageClick?: (e: any) => void;
  onMouseDown?: (e: any) => void;
  onMouseMove?: (e: any) => void;
  onMouseUp?: (e: any) => void;
  onMouseLeave?: (e: any) => void;
  cursor?: string;
  draggable?: boolean;
}

export default function CanvasStage({
  width,
  height,
  children,
  onScaleChange,
  onPositionChange,
  onStageClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  cursor = "grab",
  draggable = true,
}: CanvasStageProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Reset viewport to standard view (100% zoom, centered)
  const resetViewport = useCallback(() => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
    onScaleChange?.(1);
    onPositionChange?.({ x: 0, y: 0 });
    console.log("🔄 Reset viewport to standard view");
  }, [onScaleChange, onPositionChange]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Zoom sensitivity
    const scaleBy = 1.05;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    // Clamp zoom between 0.1x and 5x
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    // Log zoom changes
    console.log(
      `🔍 Zoom: ${(clampedScale * 100).toFixed(1)}% (${oldScale.toFixed(
        3
      )} → ${clampedScale.toFixed(3)})`
    );

    setStageScale(clampedScale);
    onScaleChange?.(clampedScale);

    // Adjust position to zoom towards mouse cursor
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setStagePos(newPos);
    onPositionChange?.(newPos);
  }, []);

  // Handle stage drag (pan) - only when dragging the stage itself, not objects
  const handleDragStart = useCallback((e: any) => {
    // Only start panning if we're dragging the stage itself (not a child object)
    if (e.target === e.target.getStage()) {
      setIsDragging(true);
      console.log("🖱️ Started panning");
    } else {
      // Cancel the stage drag if we're dragging a child object
      e.target.getStage().stopDrag();
    }
  }, []);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    // Only handle pan end if we were actually panning the stage
    if (e.target === e.target.getStage()) {
      setIsDragging(false);
      const newPos = {
        x: e.target.x(),
        y: e.target.y(),
      };
      setStagePos(newPos);
      onPositionChange?.(newPos);
      console.log(
        `📍 Pan position: (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)})`
      );
    }
  }, []);

  // Prevent context menu on right click
  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const stageNode = stageRef.current?.container();
    if (stageNode) {
      stageNode.addEventListener("contextmenu", handleContextMenu);
      return () => {
        stageNode.removeEventListener("contextmenu", handleContextMenu);
      };
    }
  }, []);

  return (
    <div className="border border-gray-300 bg-gray-50 overflow-hidden relative">
      {/* Visible Canvas Dimensions Indicator */}
      <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded text-sm font-mono">
        {Math.round(width / stageScale)}×{Math.round(height / stageScale)}px
      </div>

      {/* Reset Viewport Button */}
      <button
        onClick={resetViewport}
        className="absolute top-12 left-4 z-10 bg-blue-600/70 hover:bg-blue-600/80 text-white px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer"
        title="Reset to standard viewport (100% zoom, centered)"
      >
        Reset View
      </button>

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        onWheel={handleWheel}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onStageClick}
        onTap={onStageClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{
          cursor: isDragging ? "grabbing" : cursor,
          display: "block",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        <Layer
          listening={true}
          // Enable caching for better performance with many objects
          cache={true}
          // Only redraw when necessary
          hitGraphEnabled={true}
        >
          {children}
        </Layer>
      </Stage>
    </div>
  );
}
