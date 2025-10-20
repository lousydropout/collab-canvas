"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MousePointer2,
  Square,
  Circle,
  Triangle,
  Type,
  AlignHorizontalJustifyCenter,
  ChevronDown,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { CanvasState } from "@/types/canvas";
import ZIndexControls from "@/components/layout/ZIndexControls";
import { CanvasOperations } from "@/lib/canvas/CanvasOperations";

interface ToolbarProps {
  currentTool: CanvasState["tool"];
  currentColor: string;
  selectedObjects: string[];
  operations: CanvasOperations | null;
  stateUpdater: {
    updateObject: (id: string, updates: any) => Promise<any>;
  } | null;
  onToolChange: (tool: CanvasState["tool"]) => void;
  onColorChange: (color: string) => void;
}

export default function Toolbar({
  currentTool,
  currentColor,
  selectedObjects,
  operations,
  stateUpdater,
  onToolChange,
  onColorChange,
}: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showColorPicker]);

  // Alignment handlers
  const handleAlignment = async (
    alignType: "left" | "right" | "center" | "top" | "bottom" | "middle"
  ) => {
    console.log("🔧 handleAlignment called with:", alignType);
    console.log("🔧 operations:", operations);
    console.log("🔧 stateUpdater:", stateUpdater);
    console.log("🔧 selectedObjects:", selectedObjects);

    if (!operations || !stateUpdater || selectedObjects.length < 2) {
      console.log(
        "❌ Cannot align: missing operations, stateUpdater, or insufficient objects"
      );
      return;
    }

    try {
      console.log(`📐 Aligning objects ${alignType}:`, selectedObjects);

      // Get all objects to align
      const objects = await operations.getObjectsByIds(selectedObjects);
      if (objects.length < 2) {
        console.log("❌ Not enough objects found for alignment");
        return;
      }

      const updates: Array<{ id: string; updates: Partial<any> }> = [];

      // Handle horizontal alignment (left/right/center) - affects X coordinates
      if (["left", "right", "center"].includes(alignType)) {
        let targetX: number;

        if (alignType === "left") {
          targetX = Math.min(...objects.map((obj) => obj.x));
        } else if (alignType === "right") {
          targetX = Math.max(...objects.map((obj) => obj.x + obj.width));
        } else {
          // center
          const minX = Math.min(...objects.map((obj) => obj.x));
          const maxX = Math.max(...objects.map((obj) => obj.x + obj.width));
          targetX = (minX + maxX) / 2;
        }

        objects.forEach((obj) => {
          let newX = obj.x;
          if (alignType === "left") {
            newX = targetX;
          } else if (alignType === "right") {
            newX = targetX - obj.width;
          } else if (alignType === "center") {
            newX = targetX - obj.width / 2;
          }
          updates.push({ id: obj.id, updates: { x: newX } });
        });
      }
      // Handle vertical alignment (top/bottom/middle) - affects Y coordinates
      else if (["top", "bottom", "middle"].includes(alignType)) {
        let targetY: number;

        if (alignType === "top") {
          targetY = Math.min(...objects.map((obj) => obj.y));
        } else if (alignType === "bottom") {
          targetY = Math.max(...objects.map((obj) => obj.y + obj.height));
        } else {
          // middle
          const minY = Math.min(...objects.map((obj) => obj.y));
          const maxY = Math.max(...objects.map((obj) => obj.y + obj.height));
          targetY = (minY + maxY) / 2;
        }

        objects.forEach((obj) => {
          let newY = obj.y;
          if (alignType === "top") {
            newY = targetY;
          } else if (alignType === "bottom") {
            newY = targetY - obj.height;
          } else if (alignType === "middle") {
            newY = targetY - obj.height / 2;
          }
          updates.push({ id: obj.id, updates: { y: newY } });
        });
      }

      // Apply all updates using stateUpdater (immediate local updates + broadcasting)
      const updatePromises = updates.map(({ id, updates: objectUpdates }) =>
        stateUpdater.updateObject(id, objectUpdates)
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter((result) => result !== null).length;

      console.log(
        `✅ Alignment ${alignType} completed: ${successCount}/${updates.length} updated`
      );
    } catch (error) {
      console.error(`❌ Error during alignment ${alignType}:`, error);
    }
  };

  const handleHorizontalDistribution = async () => {
    console.log("🔧 handleHorizontalDistribution called");
    console.log("🔧 operations:", operations);
    console.log("🔧 stateUpdater:", stateUpdater);
    console.log("🔧 selectedObjects:", selectedObjects);

    if (!operations || !stateUpdater || selectedObjects.length < 2) {
      console.log(
        "❌ Cannot distribute: missing operations, stateUpdater, or insufficient objects"
      );
      return;
    }

    try {
      console.log(`📐 Distributing objects:`, selectedObjects);

      // Get all objects to distribute
      const objects = await operations.getObjectsByIds(selectedObjects);
      if (objects.length < 2) {
        console.log("❌ Not enough objects found for distribution");
        return;
      }

      const updates: Array<{ id: string; updates: Partial<any> }> = [];

      // Distribute horizontally while preserving leftmost and rightmost edges
      const sortedObjects = objects.sort((a, b) => a.x - b.x);

      // Find current bounds
      const leftmostEdge = Math.min(...sortedObjects.map((obj) => obj.x));
      const rightmostEdge = Math.max(
        ...sortedObjects.map((obj) => obj.x + obj.width)
      );

      // Calculate total width of all objects
      const totalObjectWidth = sortedObjects.reduce(
        (sum, obj) => sum + obj.width,
        0
      );

      // Calculate available space for distribution (excluding object widths)
      const availableSpace = rightmostEdge - leftmostEdge - totalObjectWidth;
      const spacing = availableSpace / (sortedObjects.length - 1);

      // Position objects maintaining the bounds
      let currentX = leftmostEdge;
      sortedObjects.forEach((obj) => {
        updates.push({ id: obj.id, updates: { x: currentX } });
        currentX += obj.width + spacing;
      });

      // Apply all updates using stateUpdater (immediate local updates + broadcasting)
      const updatePromises = updates.map(({ id, updates: objectUpdates }) =>
        stateUpdater.updateObject(id, objectUpdates)
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter((result) => result !== null).length;

      console.log(
        `✅ Distribution completed: ${successCount}/${updates.length} updated`
      );
    } catch (error) {
      console.error(`❌ Error during distribution:`, error);
    }
  };

  const handleVerticalDistribution = async () => {
    console.log("🔧 handleVerticalDistribution called");
    console.log("🔧 operations:", operations);
    console.log("🔧 stateUpdater:", stateUpdater);
    console.log("🔧 selectedObjects:", selectedObjects);

    if (!operations || !stateUpdater || selectedObjects.length < 2) {
      console.log(
        "❌ Cannot distribute: missing operations, stateUpdater, or insufficient objects"
      );
      return;
    }

    try {
      console.log(`📐 Distributing objects vertically:`, selectedObjects);

      // Get all objects to distribute
      const objects = await operations.getObjectsByIds(selectedObjects);
      if (objects.length < 2) {
        console.log("❌ Not enough objects found for distribution");
        return;
      }

      const updates: Array<{ id: string; updates: Partial<any> }> = [];

      // Distribute vertically while preserving topmost and bottommost edges
      const sortedObjects = objects.sort((a, b) => a.y - b.y);

      // Find current bounds
      const topmostEdge = Math.min(...sortedObjects.map((obj) => obj.y));
      const bottommostEdge = Math.max(
        ...sortedObjects.map((obj) => obj.y + obj.height)
      );

      // Calculate total height of all objects
      const totalObjectHeight = sortedObjects.reduce(
        (sum, obj) => sum + obj.height,
        0
      );

      // Calculate available space for distribution (excluding object heights)
      const availableSpace = bottommostEdge - topmostEdge - totalObjectHeight;
      const spacing = availableSpace / (sortedObjects.length - 1);

      // Position objects maintaining the bounds
      let currentY = topmostEdge;
      sortedObjects.forEach((obj) => {
        updates.push({ id: obj.id, updates: { y: currentY } });
        currentY += obj.height + spacing;
      });

      // Apply all updates using stateUpdater (immediate local updates + broadcasting)
      const updatePromises = updates.map(({ id, updates: objectUpdates }) =>
        stateUpdater.updateObject(id, objectUpdates)
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter((result) => result !== null).length;

      console.log(
        `✅ Vertical distribution completed: ${successCount}/${updates.length} updated`
      );
    } catch (error) {
      console.error(`❌ Error during vertical distribution:`, error);
    }
  };

  return (
    <div className="bg-white border-r border-gray-200 w-16 flex flex-col items-center py-4">
      {/* Tools Section */}
      <div className="space-y-2 flex flex-col items-center">
        <Button
          variant={currentTool === "select" ? "default" : "ghost"}
          size="sm"
          className={`w-10 h-10 p-0 cursor-pointer flex items-center justify-center ${
            currentTool === "select"
              ? "!bg-blue-600 !text-white hover:!bg-blue-700"
              : "!text-gray-700 hover:!text-gray-900 hover:!bg-gray-100"
          }`}
          title="Select Tool"
          onClick={() => onToolChange("select")}
        >
          <MousePointer2 className="h-4 w-4" />
        </Button>

        <Button
          variant={currentTool === "rectangle" ? "default" : "ghost"}
          size="sm"
          className={`w-10 h-10 p-0 cursor-pointer flex items-center justify-center ${
            currentTool === "rectangle"
              ? "!bg-blue-600 !text-white hover:!bg-blue-700"
              : "!text-gray-700 hover:!text-gray-900 hover:!bg-gray-100"
          }`}
          title="Rectangle Tool"
          onClick={() => onToolChange("rectangle")}
        >
          <Square className="h-4 w-4" />
        </Button>

        <Button
          variant={currentTool === "ellipse" ? "default" : "ghost"}
          size="sm"
          className={`w-10 h-10 p-0 cursor-pointer flex items-center justify-center ${
            currentTool === "ellipse"
              ? "!bg-blue-600 !text-white hover:!bg-blue-700"
              : "!text-gray-700 hover:!text-gray-900 hover:!bg-gray-100"
          }`}
          title="Ellipse Tool"
          onClick={() => onToolChange("ellipse")}
        >
          <Circle className="h-4 w-4" />
        </Button>

        <Button
          variant={currentTool === "triangle" ? "default" : "ghost"}
          size="sm"
          className={`w-10 h-10 p-0 cursor-pointer flex items-center justify-center ${
            currentTool === "triangle"
              ? "!bg-blue-600 !text-white hover:!bg-blue-700"
              : "!text-gray-700 hover:!text-gray-900 hover:!bg-gray-100"
          }`}
          title="Triangle Tool"
          onClick={() => onToolChange("triangle")}
        >
          <Triangle className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 text-gray-400 cursor-not-allowed flex items-center justify-center"
          title="Text Tool (Coming Soon)"
          disabled
        >
          <Type className="h-4 w-4" />
        </Button>
      </div>

      {/* Alignment Tools Section */}
      <div className="mt-6 space-y-2 flex flex-col items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`w-10 h-10 p-0 cursor-pointer flex items-center justify-center ${
                selectedObjects.length >= 2
                  ? "!text-gray-700 hover:!text-gray-900 hover:!bg-gray-100"
                  : "!text-gray-400 cursor-not-allowed"
              }`}
              title={
                !stateUpdater
                  ? "Alignment tools loading..."
                  : selectedObjects.length >= 2
                  ? "Align Objects"
                  : "Select at least 2 objects to align"
              }
              disabled={selectedObjects.length < 2 || !stateUpdater}
            >
              <AlignHorizontalJustifyCenter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Align Objects</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Vertical Alignment (same X coordinate) */}
            <DropdownMenuItem
              onClick={() => {
                console.log("🔧 Dropdown menu item clicked: Align Left");
                handleAlignment("left");
              }}
            >
              Align Left
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAlignment("center")}>
              Align Vertically
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAlignment("right")}>
              Align Right
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Horizontal Alignment (same Y coordinate) */}
            <DropdownMenuItem onClick={() => handleAlignment("top")}>
              Align Top
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAlignment("middle")}>
              Align Horizontally
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAlignment("bottom")}>
              Align Bottom
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Distribution */}
            <DropdownMenuItem onClick={handleHorizontalDistribution}>
              Distribute Horizontally
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleVerticalDistribution}>
              Distribute Vertically
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Z-Index Controls Section */}
      <div className="mt-6">
        <ZIndexControls
          selectedObjects={selectedObjects}
          operations={operations}
          onOperationComplete={() => {
            // Optional: Add any post-operation logic here
            console.log("Z-index operation completed");
          }}
        />
      </div>

      {/* Color Picker Section - Pushed to Bottom */}
      <div className="mt-auto relative" ref={pickerRef}>
        <button
          className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors cursor-pointer shadow-sm"
          style={{ backgroundColor: currentColor }}
          title="Choose Color"
          onClick={() => setShowColorPicker(!showColorPicker)}
        />

        {showColorPicker && (
          <div className="absolute bottom-12 left-0 z-50 p-3 bg-white rounded-lg shadow-xl border border-gray-200">
            <HexColorPicker color={currentColor} onChange={onColorChange} />
            <div className="mt-2 text-xs text-center text-gray-600 font-mono">
              {currentColor.toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
