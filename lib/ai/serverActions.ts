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

'use server'

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export interface AICommand {
  command: 'create' | 'modify' | null
  objectType?: 'rectangle' | 'ellipse' | null
  x?: number | null
  y?: number | null
  width?: number | null
  height?: number | null
  color?: string | null
  // Modify command attributes
  deltaX?: number | null
  deltaY?: number | null
  newX?: number | null
  newY?: number | null
  scaleBy?: number | null
  newWidth?: number | null
  newHeight?: number | null
  // Batch support
  args?: Array<{
    objectType: 'rectangle' | 'ellipse'
    x?: number
    y?: number
    width?: number
    height?: number
    color?: string
  }>
  // Pattern support
  pattern?: {
    type: 'grid' | 'line' | 'circle' | 'random'
    count?: number
    rows?: number
    columns?: number
    spacing?: { x: number; y: number }
    startPosition?: { x: number; y: number }
    width?: number
    height?: number
    color?: string
  }
}

export interface IntentDetectionResult {
  commandData: AICommand | null
  message: string
  success: boolean
  error?: string
}

export interface AIContext {
  selectedObjectsCount: number
  viewportWidth: number
  viewportHeight: number
  viewportTopLeft: { x: number; y: number }
}

/**
 * Detect object creation intent from user message
 * 
 * @param message - User's natural language command
 * @param context - Additional context about user's viewport and selection
 * @returns Promise<IntentDetectionResult> - Detection result with object type
 */
export async function detectObjectIntent(message: string, context: AIContext): Promise<IntentDetectionResult> {
  try {
    console.log('🤖 Server Action - Processing message:', message)

    // JSON prompt asking AI to respond with structured command data
    const prompt = `You are an assistant that converts natural language drawing commands into structured JSON for a Figma-like canvas.

**Instructions:**
- Respond with ONLY valid JSON; no markdown, commentary, or code blocks.
- Always return JSON matching the AICommand interface.
- Infer reasonable defaults if fields are missing: center objects, default sizes, random colors.
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
    "topLeft": { "x": ${context.viewportTopLeft.x}, "y": ${context.viewportTopLeft.y} },
    "center": { "x": ${context.viewportTopLeft.x + context.viewportWidth * 0.5}, "y": ${context.viewportTopLeft.y + context.viewportHeight * 0.5} },
    "visibleRange": {
      "xMin": ${context.viewportTopLeft.x + context.viewportWidth * 0.1},
      "xMax": ${context.viewportTopLeft.x + context.viewportWidth * 0.9},
      "yMin": ${context.viewportTopLeft.y + context.viewportHeight * 0.1},
      "yMax": ${context.viewportTopLeft.y + context.viewportHeight * 0.9}
    }
  },
  "defaults": {
    "sizes": {
      "small": { "width": ${Math.round(context.viewportWidth * 0.05)}, "height": ${Math.round(context.viewportHeight * 0.05)} },
      "medium": { "width": ${Math.round(context.viewportWidth * 0.1)}, "height": ${Math.round(context.viewportHeight * 0.1)} },
      "large": { "width": ${Math.round(context.viewportWidth * 0.25)}, "height": ${Math.round(context.viewportHeight * 0.2)} }
    }
  }
}

**POSITIONING GUIDANCE (within visible range):**
- "left" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.1}
- "right" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.9}
- "top" = y: ${context.viewportTopLeft.y + context.viewportHeight * 0.1}
- "bottom" = y: ${context.viewportTopLeft.y + context.viewportHeight * 0.9}
- "center" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.5}, y: ${context.viewportTopLeft.y + context.viewportHeight * 0.5}

**OBJECT TYPE GUIDANCE:**
- "square" = rectangle with equal width and height
- "circle" = ellipse with equal width and height  
- "rectangle" = rectangle (any aspect ratio)
- "ellipse" = ellipse (any aspect ratio)

**COORDINATE SYSTEM:**
- Y-axis increases downward
- Positive deltaY moves objects DOWN, negative deltaY moves objects UP
- Positive deltaX moves objects RIGHT, negative deltaX moves objects LEFT

**FIELD USAGE:**
- deltaX/deltaY: relative movement
- newX/newY: absolute positioning
- scaleBy: proportional size change
- newWidth/newHeight: absolute size
- Do not mix deltaX with newX, deltaY with newY, scaleBy with newWidth/newHeight

**Templates:**

CREATE SINGLE OBJECT:
{
  "command": "create",
  "objectType": "rectangle" | "ellipse",
  "x": number,
  "y": number,
  "width": number,
  "height": number,
  "color": "#hexcolor"
}

CREATE SMALL REPEATED OBJECTS (2–10) OR LARGE WITH USER-POSITIONS:
{
  "command": "create",
  "args": [
    {
      "objectType": "rectangle" | "ellipse",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "color": "#hexcolor"
    }
  ]
}

CREATE PATTERN (>10 OR GRID/LINE/CIRCLE/RANDOM):
{
  "command": "create",
  "objectType": "rectangle" | "ellipse",
  "pattern": {
    "type": "grid" | "line" | "circle" | "random",
    "count": number,             // required for line/circle/random
    "rows": number,              // required for grid
    "columns": number,           // required for grid
    "spacing": { "x": number, "y": number },  // optional
    "startPosition": { "x": number, "y": number }, // optional
    "width": number,             // optional, default if missing
    "height": number,            // optional, default if missing
    "color": "#hexcolor"         // optional, random if missing
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

**Examples:**
- "create a rectangle" -> single object template
- "add 3 blue circles" -> args template  
- "create a 10x10 grid of rectangles" -> pattern template (grid)
- "create a line of 5 circles" -> pattern template (line)
- "create random dots" -> pattern template (random)
- "move right" -> modify template
- "make bigger" -> modify template
- "change to red" -> modify template

**IMPORTANT:**
- Use "args" for 2–10 repeated objects with automatic spreading.
- Use "pattern" for >10 objects or pattern layouts.
- Defaults: center, default sizes, random colors.
- Respond ONLY with JSON, no markdown or commentary.

**User command:** "${message}"`

    console.log('📝 Server Action - Prompt:', prompt)

    // Generate simple text response (no tools needed)
    console.log('🚀 Server Action - Starting generateText with OpenAI...')
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: prompt,
      temperature: 0.1
    })

    console.log('🔍 Server Action - Full LLM response:', JSON.stringify(result, null, 2))
    console.log('🔍 Server Action - Text response:', result.text)

    // Parse the JSON response
    const responseText = result.text.trim()
    console.log('🔍 Server Action - Response text:', responseText)
    
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const commandData = JSON.parse(jsonText) as AICommand
      console.log('🔍 Server Action - Parsed command data:', commandData)

    return {
        commandData,
      message: result.text,
      success: true
      }
    } catch (error) {
      console.log('🔍 Server Action - Failed to parse JSON response:', error)
      return {
        commandData: null,
        message: 'Could not understand command',
        success: false,
        error: 'Invalid JSON response'
      }
    }
  } catch (error) {
    console.error('❌ Server Action - Error occurred:', error)
    console.error('❌ Server Action - Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    let errorMessage = 'Sorry, I encountered an error processing your request.'
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API key not configured. Please check your environment variables.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.'
      } else if (error.message.includes('quota')) {
        errorMessage = 'OpenAI quota exceeded. Please check your account limits.'
      } else {
        errorMessage = `Error: ${error.message}`
      }
    }

    return {
      commandData: null,
      message: errorMessage,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}