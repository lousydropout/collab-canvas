/**
 * Textbox Editor Component
 *
 * A floating panel for editing textbox content and formatting.
 * Similar to AIChat but focused on textbox editing.
 *
 * Features:
 * - Text content editing
 * - Font size control
 * - Font family selection
 * - Font weight control
 * - Text alignment options
 * - Color picker
 * - Real-time updates
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Type,
  X,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CanvasObject } from "@/types/canvas";

interface TextboxEditorProps {
  /** The textbox object being edited */
  textbox: CanvasObject | null;
  /** Whether the editor is collapsed */
  isCollapsed: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange: (collapsed: boolean) => void;
  /** Callback when textbox is updated */
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void;
}

export default function TextboxEditor({
  textbox,
  isCollapsed,
  onCollapsedChange,
  onUpdate,
}: TextboxEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textContent, setTextContent] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontWeight, setFontWeight] = useState("normal");
  const [textAlign, setTextAlign] = useState("left");
  const [color, setColor] = useState("#000000");

  // Update local state when textbox changes
  useEffect(() => {
    if (textbox) {
      setTextContent(textbox.text_content || "");
      setFontSize(textbox.font_size || 16);
      setFontFamily(textbox.font_family || "Arial");
      setFontWeight(textbox.font_weight || "normal");
      setTextAlign(textbox.text_align || "left");
      setColor(textbox.color || "#000000");
    }
  }, [textbox]);

  // Focus textarea when editor becomes visible (not collapsed)
  useEffect(() => {
    if (!isCollapsed && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isCollapsed]);

  /**
   * Handle text content changes
   */
  const handleTextChange = (value: string) => {
    setTextContent(value);
    if (textbox) {
      onUpdate(textbox.id, { text_content: value });
    }
  };

  /**
   * Handle font size changes
   */
  const handleFontSizeChange = (value: string) => {
    const size = Math.max(8, Math.min(200, parseInt(value) || 16));
    setFontSize(size);
    if (textbox) {
      onUpdate(textbox.id, { font_size: size });
    }
  };

  /**
   * Handle font family changes
   */
  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    if (textbox) {
      onUpdate(textbox.id, { font_family: family });
    }
  };

  /**
   * Handle font weight changes
   */
  const handleFontWeightChange = (weight: string) => {
    setFontWeight(weight);
    if (textbox) {
      onUpdate(textbox.id, { font_weight: weight });
    }
  };

  /**
   * Handle text alignment changes
   */
  const handleTextAlignChange = (align: string) => {
    setTextAlign(align);
    if (textbox) {
      onUpdate(textbox.id, { text_align: align });
    }
  };

  /**
   * Handle color changes
   */
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (textbox) {
      onUpdate(textbox.id, { color: newColor });
    }
  };

  /**
   * Toggle collapsed state
   */
  const handleToggleCollapsed = () => {
    onCollapsedChange(!isCollapsed);
  };

  if (!textbox) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="bg-white shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <Type className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Edit Textbox</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapsed}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content - only show when not collapsed */}
        {!isCollapsed && (
          <div className="p-4 space-y-4">
            {/* Text Content */}
            <div className="space-y-2">
              <Label htmlFor="text-content" className="text-sm font-medium">
                Text Content
              </Label>
              <textarea
                ref={textareaRef}
                id="text-content"
                value={textContent}
                onChange={(e) => handleTextChange(e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your text here..."
              />
            </div>

            {/* Formatting Controls */}
            <div className="grid grid-cols-2 gap-4">
              {/* Font Size */}
              <div className="space-y-2">
                <Label htmlFor="font-size" className="text-sm font-medium">
                  Font Size
                </Label>
                <Input
                  id="font-size"
                  type="number"
                  min="8"
                  max="200"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Font Family</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-sm"
                    >
                      {fontFamily}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {[
                      "Arial",
                      "Helvetica",
                      "Times New Roman",
                      "Georgia",
                      "Courier New",
                      "Verdana",
                    ].map((family) => (
                      <DropdownMenuItem
                        key={family}
                        onClick={() => handleFontFamilyChange(family)}
                        className="text-sm"
                      >
                        {family}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Font Weight and Alignment */}
            <div className="grid grid-cols-2 gap-4">
              {/* Font Weight */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Font Weight</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-sm"
                    >
                      <Bold className="h-4 w-4 mr-2" />
                      {fontWeight === "normal"
                        ? "Normal"
                        : fontWeight === "bold"
                        ? "Bold"
                        : fontWeight}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => handleFontWeightChange("normal")}
                    >
                      Normal
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleFontWeightChange("bold")}
                    >
                      Bold
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleFontWeightChange("lighter")}
                    >
                      Lighter
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleFontWeightChange("bolder")}
                    >
                      Bolder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Text Alignment */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Alignment</Label>
                <div className="flex space-x-1">
                  <Button
                    variant={textAlign === "left" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTextAlignChange("left")}
                    className="flex-1"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={textAlign === "center" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTextAlignChange("center")}
                    className="flex-1"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={textAlign === "right" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTextAlignChange("right")}
                    className="flex-1"
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label htmlFor="text-color" className="text-sm font-medium">
                Text Color
              </Label>
              <div className="flex items-center space-x-2">
                <input
                  id="text-color"
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="flex-1 text-sm font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
