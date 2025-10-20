/**
 * Server Actions for AI Intent Detection
 *
 * This module provides server-side functions for AI-powered object creation.
 * Uses Vercel AI SDK with OpenAI for simple intent detection via text parsing.
 *
 * Features:
 * - Server-side AI processing
 * - Simple text-based responses (no tools needed)
 * - Error handling and validation
 * - Detailed logging
 */

"use server";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Ensure API key is properly formatted
if (process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY.trim();
}

export interface AICommand {
  command: "create" | "modify" | "layout" | null;
  objectType?:
    | "rectangle"
    | "ellipse"
    | "triangle"
    | "square"
    | "circle"
    | "textbox"
    | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  color?: string | null;
  // Textbox-specific fields
  text_content?: string | null;
  font_size?: number | null;
  font_family?: string | null;
  font_weight?: string | null;
  text_align?: string | null;
  // Modify command attributes
  deltaX?: number | null;
  deltaY?: number | null;
  newX?: number | null;
  newY?: number | null;
  scaleBy?: number | null;
  newWidth?: number | null;
  newHeight?: number | null;
  // Layout command attributes
  layoutType?: "row" | "column" | "grid" | "space" | "align" | null;
  layoutDirection?: "horizontal" | "vertical" | null;
  gridRows?: number | null;
  gridColumns?: number | null;
  spacing?: number | null;
  alignType?: "left" | "right" | "center" | "top" | "bottom" | "middle" | null;
  // Batch support
  args?: Array<{
    objectType:
      | "rectangle"
      | "ellipse"
      | "triangle"
      | "square"
      | "circle"
      | "textbox";
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    color?: string;
    text_content?: string;
    font_size?: number;
    font_family?: string;
    font_weight?: string;
    text_align?: string;
  }>;
  // Pattern support
  pattern?: {
    type: "grid" | "line" | "circle" | "random";
    count?: number;
    rows?: number;
    columns?: number;
    spacing?: { x: number; y: number };
    startPosition?: { x: number; y: number };
    width?: number;
    height?: number;
    color?: string;
    text_content?: string;
    font_size?: number;
    font_family?: string;
    font_weight?: string;
    text_align?: string;
  };
}

export interface IntentDetectionResult {
  commandData: AICommand | null;
  message: string;
  success: boolean;
  error?: string;
}

export interface AIContext {
  selectedObjectsCount: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportTopLeft: { x: number; y: number };
}

/**
 * Detect object creation intent from user message
 *
 * @param message - User's natural language command
 * @param context - Additional context about user's viewport and selection
 * @returns Promise<IntentDetectionResult> - Detection result with object type
 */
export async function detectObjectIntent(
  message: string,
  context: AIContext
): Promise<IntentDetectionResult> {
  try {
    console.log("🤖 Server Action - Processing message:", message);

    // JSON prompt asking AI to respond with structured command data
    const prompt = `You are an assistant that converts natural language drawing commands into structured JSON for a Figma-like canvas.

**Instructions:**
- Respond with ONLY valid JSON; no markdown, commentary, or code blocks.
- Always return JSON matching the AICommand interface.
- Infer reasonable defaults if fields are missing: center objects, default sizes, omit color field for random colors.
- Do not mix conflicting fields: deltaX with newX, deltaY with newY, scaleBy with newWidth/newHeight.

**Selection Rules:**
1. **Modify existing objects** – use "modify" template.
2. **Create single object** – use top-level fields.
3. **Create 2–10 objects** or **>10 objects with user-specified positions** – use "args" array, AI spreads objects in viewport.
4. **Create >10 objects or pattern-based layout** (grid, line, circle, random) – use "pattern" object, do not enumerate all objects.

**Context:**
{
  "selectedObjectsCount": ${context.selectedObjectsCount},
  "viewport": {
    "width": ${context.viewportWidth},
    "height": ${context.viewportHeight},
    "topLeft": { "x": ${context.viewportTopLeft.x}, "y": ${
      context.viewportTopLeft.y
    } },
    "center": { "x": ${
      context.viewportTopLeft.x + context.viewportWidth * 0.5
    }, "y": ${context.viewportTopLeft.y + context.viewportHeight * 0.5} },
    "visibleRange": {
      "xMin": ${context.viewportTopLeft.x + context.viewportWidth * 0.1},
      "xMax": ${context.viewportTopLeft.x + context.viewportWidth * 0.9},
      "yMin": ${context.viewportTopLeft.y + context.viewportHeight * 0.1},
      "yMax": ${context.viewportTopLeft.y + context.viewportHeight * 0.9}
    }
  },
  "defaults": {
    "sizes": {
      "small": { "width": ${Math.round(
        context.viewportWidth * 0.05
      )}, "height": ${Math.round(context.viewportHeight * 0.05)} },
      "medium": { "width": ${Math.round(
        context.viewportWidth * 0.1
      )}, "height": ${Math.round(context.viewportHeight * 0.1)} },
      "large": { "width": ${Math.round(
        context.viewportWidth * 0.25
      )}, "height": ${Math.round(context.viewportHeight * 0.2)} }
    }
  }
}

**POSITIONING GUIDANCE (within visible range):**
- Always place objects within the visible viewport area
- "left" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.1}
- "right" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.9}
- "top" = y: ${context.viewportTopLeft.y + context.viewportHeight * 0.1}
- "bottom" = y: ${context.viewportTopLeft.y + context.viewportHeight * 0.9}
- "center" = x: ${
      context.viewportTopLeft.x + context.viewportWidth * 0.5
    }, y: ${context.viewportTopLeft.y + context.viewportHeight * 0.5}
- For patterns: center the pattern in the visible viewport
- For random patterns: place objects within visibleRange bounds

**OBJECT TYPE GUIDANCE:**
- "square" = rectangle with equal width and height
- "circle" = ellipse with equal width and height  
- "rectangle" = rectangle (any aspect ratio)
- "ellipse" = ellipse (any aspect ratio)
- "triangle" = triangle shape
- "textbox" = text container with content, font size, font family, font weight, and text alignment

**COORDINATE SYSTEM:**
- Y-axis increases downward
- Positive deltaY moves objects DOWN, negative deltaY moves objects UP
- Positive deltaX moves objects RIGHT, negative deltaX moves objects LEFT

**FIELD USAGE:**
- deltaX/deltaY: relative movement
- newX/newY: absolute positioning
- scaleBy: proportional size change (font size for textboxes, width/height for other objects)
- newWidth/newHeight: absolute size
- Do not mix deltaX with newX, deltaY with newY, scaleBy with newWidth/newHeight

**Templates:**

CREATE SINGLE OBJECT:
{
  "command": "create",
  "objectType": "rectangle" | "ellipse" | "triangle" | "square" | "circle" | "textbox",
  "x": number,
  "y": number,
  "width": number,
  "height": number,
  "color": "#hexcolor",
  "text_content": "string",     // required for textbox
  "font_size": number,          // optional for textbox (default: 16)
  "font_family": "string",      // optional for textbox (default: "Arial")
  "font_weight": "string",      // optional for textbox (default: "normal")
  "text_align": "string"        // optional for textbox (default: "left")
}

CREATE SMALL REPEATED OBJECTS (2–10) OR LARGE WITH USER-POSITIONS:
{
  "command": "create",
  "args": [
    {
      "objectType": "rectangle" | "ellipse" | "triangle" | "square" | "circle" | "textbox",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "color": "#hexcolor",
      "text_content": "string",     // required for textbox
      "font_size": number,          // optional for textbox
      "font_family": "string",      // optional for textbox
      "font_weight": "string",       // optional for textbox
      "text_align": "string"        // optional for textbox
    }
  ]
}

CREATE PATTERN (>10 OR GRID/LINE/CIRCLE/RANDOM):
{
  "command": "create",
  "objectType": "rectangle" | "ellipse" | "triangle" | "square" | "circle" | "textbox",
  "pattern": {
    "type": "grid" | "line" | "circle" | "random",
    "count": number,             // required for line/circle/random
    "rows": number,              // required for grid
    "columns": number,            // required for grid
    "spacing": { "x": number, "y": number },  // optional
    "startPosition": { "x": number, "y": number }, // optional
    "width": number,             // optional, default if missing
    "height": number,            // optional, default if missing
    "color": "#hexcolor",        // optional, omit this field for random colors
    "text_content": "string",    // required for textbox patterns
    "font_size": number,         // optional for textbox patterns
    "font_family": "string",     // optional for textbox patterns
    "font_weight": "string",     // optional for textbox patterns
    "text_align": "string"       // optional for textbox patterns
  }
}

MODIFY OBJECT:
{
  "command": "modify",
  "deltaX": number,  // default: 0
  "deltaY": number,  // default: 0
  "newX": number | null,
  "newY": number | null,
  "scaleBy": number, // default: 0
  "newWidth": number | null,
  "newHeight": number | null,
  "color": "#hexcolor" | null
}

LAYOUT OBJECTS:
{
  "command": "layout",
  "layoutType": "row" | "column" | "grid" | "space" | "align",
  "layoutDirection": "horizontal" | "vertical" | null,  // optional, inferred from layoutType
  "gridRows": number | null,  // required for grid layout
  "gridColumns": number | null,  // required for grid layout
  "spacing": number | null,  // optional spacing for space layout
  "alignType": "left" | "right" | "center" | "top" | "bottom" | "middle" | null  // required for align layout
}

**Alignment Axis Mapping:**
- "left", "right", "center" -> vertical alignment (same X coordinate, vertical line)
- "top", "bottom", "middle" -> horizontal alignment (same Y coordinate, horizontal line)

**Examples:**
- "create a rectangle" -> single object template (no color field = random color)
- "create a blue square" -> single object template with color: "#0000ff"
- "add 3 blue circles" -> args template with color: "#0000ff"
- "create a red triangle" -> single object template with color: "#ff0000"
- "create a textbox with 'Hello World'" -> single object template with text_content: "Hello World"
- "create a large textbox with 'Title'" -> single object template with text_content: "Title", font_size: 24
- "make 5 triangles in a line" -> args template (no color field = random colors)
- "create a 10x10 grid of rectangles" -> pattern template (no color field = random colors)
- "create a line of 5 circles" -> pattern template (no color field = random colors)
- "create random dots" -> pattern template (no color field = random colors)
- "create a 3x3 grid of textboxes with 'Label'" -> pattern template with text_content: "Label"
- "move right" -> modify template
- "make bigger" -> modify template
- "make fontsize 2x as large" -> modify template with scaleBy: 2 (for textboxes)
- "change to red" -> modify template
- "change text to 'Hello'" -> modify template with text_content: "Hello" (for textboxes)
- "make text bold" -> modify template with font_weight: "bold" (for textboxes)
- "arrange selected in a row" -> layout template (row)
- "arrange selected in a column" -> layout template (column)
- "create a 2x3 grid with selected" -> layout template (grid)
- "space selected objects evenly" -> layout template (space)
- "align selected to left" -> layout template (align) with alignType: "left"
- "align selected to right" -> layout template (align) with alignType: "right"
- "align selected to center" -> layout template (align) with alignType: "center"
- "align selected to top" -> layout template (align) with alignType: "top"
- "align selected to bottom" -> layout template (align) with alignType: "bottom"
- "align selected to middle" -> layout template (align) with alignType: "middle"

**IMPORTANT:**
- Use "args" for 2–10 repeated objects with automatic spreading.
- Use "pattern" for >10 objects or pattern layouts.
- Defaults: center, default sizes, omit color field for random colors.
- Respond ONLY with JSON, no markdown or commentary.

**User command:** "${message}"`;

    console.log("📝 Server Action - Prompt:", prompt);

    // Generate simple text response (no tools needed)
    console.log("🚀 Server Action - Starting generateText with OpenAI...");
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: prompt,
      temperature: 0.1,
    });

    console.log(
      "🔍 Server Action - Full LLM response:",
      JSON.stringify(result, null, 2)
    );
    console.log("🔍 Server Action - Text response:", result.text);

    // Parse the JSON response
    const responseText = result.text.trim();
    console.log("🔍 Server Action - Response text:", responseText);

    try {
      // Remove markdown code blocks if present
      let jsonText = responseText;
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const commandData = JSON.parse(jsonText) as AICommand;
      console.log("🔍 Server Action - Parsed command data:", commandData);

      return {
        commandData,
        message: result.text,
        success: true,
      };
    } catch (error) {
      console.log("🔍 Server Action - Failed to parse JSON response:", error);
      return {
        commandData: null,
        message: "Could not understand command",
        success: false,
        error: "Invalid JSON response",
      };
    }
  } catch (error) {
    console.error("❌ Server Action - Error occurred:", error);
    console.error(
      "❌ Server Action - Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    let errorMessage = "Sorry, I encountered an error processing your request.";

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage =
          "OpenAI API key not configured. Please check your environment variables.";
      } else if (error.message.includes("rate limit")) {
        errorMessage = "Rate limit exceeded. Please try again in a moment.";
      } else if (error.message.includes("quota")) {
        errorMessage =
          "OpenAI quota exceeded. Please check your account limits.";
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    }

    return {
      commandData: null,
      message: errorMessage,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
