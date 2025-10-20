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
  Type,
  ChevronDown,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { CanvasOperations } from "@/lib/canvas/CanvasOperations";

interface TextFormattingToolbarProps {
  selectedObjects: string[];
  operations: CanvasOperations | null;
  stateUpdater: {
    updateObject: (id: string, updates: any) => Promise<any>;
  } | null;
}

export default function TextFormattingToolbar({
  selectedObjects,
  operations,
  stateUpdater,
}: TextFormattingToolbarProps) {
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);

  // Font size options
  const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

  // Font family options
  const fontFamilies = [
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Helvetica", value: "Helvetica, sans-serif" },
    { name: "Times New Roman", value: "Times New Roman, serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Courier New", value: "Courier New, monospace" },
    { name: "Verdana", value: "Verdana, sans-serif" },
    { name: "Comic Sans MS", value: "Comic Sans MS, cursive" },
    { name: "Impact", value: "Impact, sans-serif" },
  ];

  // Text alignment options
  const textAlignments = [
    { name: "Left", value: "left", icon: AlignLeft },
    { name: "Center", value: "center", icon: AlignCenter },
    { name: "Right", value: "right", icon: AlignRight },
    { name: "Justify", value: "justify", icon: AlignJustify },
  ];

  // Check if any selected objects are textboxes
  const hasTextboxes = async () => {
    if (!operations || selectedObjects.length === 0) return false;

    try {
      const objects = await operations.getObjectsByIds(selectedObjects);
      return objects.some((obj) => obj.type === "textbox");
    } catch (error) {
      console.error("Error checking for textboxes:", error);
      return false;
    }
  };

  // Update text formatting for selected textboxes
  const updateTextFormatting = async (updates: Partial<any>) => {
    if (!operations || !stateUpdater || selectedObjects.length === 0) {
      console.log(
        "❌ Cannot update text formatting: missing operations, stateUpdater, or no selected objects"
      );
      return;
    }

    try {
      console.log(`📝 Updating text formatting:`, updates);

      // Get all selected objects
      const objects = await operations.getObjectsByIds(selectedObjects);

      // Filter to only textboxes
      const textboxes = objects.filter((obj) => obj.type === "textbox");

      if (textboxes.length === 0) {
        console.log("❌ No textboxes found in selected objects");
        return;
      }

      // Apply updates to all textboxes
      const updatePromises = textboxes.map((textbox) =>
        stateUpdater.updateObject(textbox.id, updates)
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter((result) => result !== null).length;

      console.log(
        `✅ Text formatting updated: ${successCount}/${textboxes.length} textboxes updated`
      );
    } catch (error) {
      console.error(`❌ Error updating text formatting:`, error);
    }
  };

  // Font size handlers
  const handleFontSizeChange = async (fontSize: number) => {
    await updateTextFormatting({ font_size: fontSize });
    setShowFontSizeMenu(false);
  };

  // Font family handlers
  const handleFontFamilyChange = async (fontFamily: string) => {
    await updateTextFormatting({ font_family: fontFamily });
    setShowFontFamilyMenu(false);
  };

  // Font weight handlers
  const handleFontWeightChange = async (fontWeight: string) => {
    await updateTextFormatting({ font_weight: fontWeight });
  };

  // Text alignment handlers
  const handleTextAlignChange = async (textAlign: string) => {
    await updateTextFormatting({ text_align: textAlign });
  };

  return (
    <div className="bg-white border-r border-gray-200 w-16 flex flex-col items-center py-4">
      {/* Text Formatting Tools Section */}
      <div className="space-y-2 flex flex-col items-center">
        {/* Font Size Dropdown */}
        <DropdownMenu
          open={showFontSizeMenu}
          onOpenChange={setShowFontSizeMenu}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 cursor-pointer flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              title="Font Size"
            >
              <span className="text-xs font-bold">A</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuLabel>Font Size</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {fontSizes.map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className="text-center"
              >
                {size}px
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Family Dropdown */}
        <DropdownMenu
          open={showFontFamilyMenu}
          onOpenChange={setShowFontFamilyMenu}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 cursor-pointer flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              title="Font Family"
            >
              <Type className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Font Family</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {fontFamilies.map((font) => (
              <DropdownMenuItem
                key={font.value}
                onClick={() => handleFontFamilyChange(font.value)}
              >
                <span style={{ fontFamily: font.value }}>{font.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Weight Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 cursor-pointer flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          title="Bold"
          onClick={() => handleFontWeightChange("bold")}
        >
          <Bold className="h-4 w-4" />
        </Button>

        {/* Text Alignment Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 cursor-pointer flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              title="Text Alignment"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Text Alignment</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {textAlignments.map((alignment) => {
              const IconComponent = alignment.icon;
              return (
                <DropdownMenuItem
                  key={alignment.value}
                  onClick={() => handleTextAlignChange(alignment.value)}
                  className="flex items-center space-x-2"
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{alignment.name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}



