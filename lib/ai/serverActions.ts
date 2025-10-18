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
  objectType: 'rectangle' | 'ellipse' | null
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  color: string | null
  // Modify command attributes
  deltaX: number | null
  deltaY: number | null
  newX: number | null
  newY: number | null
  scaleBy: number | null
  newWidth: number | null
  newHeight: number | null
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
    const prompt = `Analyze this message and respond with ONLY valid JSON. Make your best guess for any field you cannot determine from the user's message - avoid using null when you can make a reasonable assumption.

CONTEXT:
- Selected objects: ${context.selectedObjectsCount}
- Viewport size: ${context.viewportWidth} x ${context.viewportHeight} pixels
- Viewport top-left position: (${context.viewportTopLeft.x}, ${context.viewportTopLeft.y})

VISIBLE COORDINATE RANGES (middle quartile for better visibility):
- X-range: [${context.viewportTopLeft.x + context.viewportWidth * 0.25}, ${context.viewportTopLeft.x + context.viewportWidth * 0.75}]
- Y-range: [${context.viewportTopLeft.y + context.viewportHeight * 0.25}, ${context.viewportTopLeft.y + context.viewportHeight * 0.75}]
- Center: (${context.viewportTopLeft.x + context.viewportWidth * 0.5}, ${context.viewportTopLeft.y + context.viewportHeight * 0.5})
- Coordinate system: X increases left-to-right, Y increases top-to-bottom
- Objects must be placed within these ranges to be clearly visible

POSITIONING GUIDANCE (within middle quartile):
- "left" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.25}
- "right" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.75}
- "top" = y: ${context.viewportTopLeft.y + context.viewportHeight * 0.25}
- "bottom" = y: ${context.viewportTopLeft.y + context.viewportHeight * 0.75}
- "center" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.5}, y: ${context.viewportTopLeft.y + context.viewportHeight * 0.5}
- "top-left" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.25}, y: ${context.viewportTopLeft.y + context.viewportHeight * 0.25}
- "top-right" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.75}, y: ${context.viewportTopLeft.y + context.viewportHeight * 0.25}
- "bottom-left" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.25}, y: ${context.viewportTopLeft.y + context.viewportHeight * 0.75}
- "bottom-right" = x: ${context.viewportTopLeft.x + context.viewportWidth * 0.75}, y: ${context.viewportTopLeft.y + context.viewportHeight * 0.75}

VIEWPORT CENTER CALCULATION:
- Viewport center = top-left + (width/2, height/2)
- Center x: ${context.viewportTopLeft.x + context.viewportWidth * 0.5}
- Center y: ${context.viewportTopLeft.y + context.viewportHeight * 0.5}

SIZE GUIDANCE:
- Default rectangle: width: ${Math.round(context.viewportWidth * 0.1)}, height: ${Math.round(context.viewportHeight * 0.1)}
- Default ellipse: width: ${Math.round(context.viewportWidth * 0.1)}, height: ${Math.round(context.viewportWidth * 0.1)} (square for circles)
- Default circle: width: ${Math.round(context.viewportWidth * 0.1)}, height: ${Math.round(context.viewportWidth * 0.1)} (always square)
- Default square: width: ${Math.round(context.viewportWidth * 0.1)}, height: ${Math.round(context.viewportWidth * 0.1)} (always square)
- Small objects: width: ${Math.round(context.viewportWidth * 0.05)}, height: ${Math.round(context.viewportHeight * 0.05)}
- Large objects: width: ${Math.round(context.viewportWidth * 0.25)}, height: ${Math.round(context.viewportHeight * 0.2)}

OBJECT TYPE GUIDANCE:
- "square" = rectangle with equal width and height
- "circle" = ellipse with equal width and height  
- "rectangle" = rectangle (can be any aspect ratio)
- "ellipse" = ellipse (can be any aspect ratio)

MODIFY COMMAND GUIDANCE:
- "move right" = deltaX: 30, deltaY: 0
- "move left" = deltaX: -30, deltaY: 0
- "move up" = deltaX: 0, deltaY: -30
- "move down" = deltaX: 0, deltaY: 30
- "move to top" = newY: ${context.viewportTopLeft.y + context.viewportHeight * 0.25}
- "move to center" = newX: ${context.viewportTopLeft.x + context.viewportWidth * 0.5}, newY: ${context.viewportTopLeft.y + context.viewportHeight * 0.5}
- "make bigger" = scaleBy: 0.2 (20% larger)
- "make smaller" = scaleBy: -0.2 (20% smaller)
- "resize to 100x50" = newWidth: 100, newHeight: 50
- "change color to red" = color: "#ff0000"
- Default modify values: deltaX: 0, deltaY: 0, newX: null, newY: null, scaleBy: 0, color: null, newWidth: null, newHeight: null

COORDINATE SYSTEM IMPORTANT:
- Y-axis increases downward (computer graphics standard)
- Positive deltaY moves objects DOWN, negative deltaY moves objects UP
- Positive deltaX moves objects RIGHT, negative deltaX moves objects LEFT

FIELD USAGE RULES:
- Use deltaX/deltaY for relative movement (how much to move from current position)
- Use newX/newY for absolute positioning (move to specific coordinates)
- Use scaleBy for proportional size changes (multiply current size by factor)
- Use newWidth/newHeight for specific size changes (set exact dimensions)
- DO NOT use both deltaX and newX, or both deltaY and newY, or both scaleBy and newWidth/newHeight

COLOR GUIDANCE:
- Common colors: #ff0000 (red), #00ff00 (green), #0000ff (blue), #ffff00 (yellow), #ff00ff (magenta), #00ffff (cyan), #800080 (violet/purple), #ffa500 (orange), #008000 (dark green), #ffc0cb (pink)
- Default color: #000000 (black)

{
  "command": "create" | "modify" | null,
  "objectType": "rectangle" | "ellipse" | null,
  "x": number | null,
  "y": number | null,
  "width": number | null,
  "height": number | null,
  "color": "#hexcolor" | null,
  "deltaX": number | null,
  "deltaY": number | null,
  "newX": number | null,
  "newY": number | null,
  "scaleBy": number | null,
  "newWidth": number | null,
  "newHeight": number | null
}

Examples:
- "create a rectangle" -> {"command": "create", "objectType": "rectangle", "x": ${context.viewportTopLeft.x + context.viewportWidth * 0.5}, "y": ${context.viewportTopLeft.y + context.viewportHeight * 0.5}, "width": ${Math.round(context.viewportWidth * 0.1)}, "height": ${Math.round(context.viewportHeight * 0.1)}, "color": "#000000", "deltaX": null, "deltaY": null, "newX": null, "newY": null, "scaleBy": null, "newWidth": null, "newHeight": null}
- "add blue ellipse at 100,200" -> {"command": "create", "objectType": "ellipse", "x": 100, "y": 200, "width": ${Math.round(context.viewportWidth * 0.1)}, "height": ${Math.round(context.viewportWidth * 0.1)}, "color": "#0000ff", "deltaX": null, "deltaY": null, "newX": null, "newY": null, "scaleBy": null, "newWidth": null, "newHeight": null}
- "create rectangle in center" -> {"command": "create", "objectType": "rectangle", "x": ${context.viewportTopLeft.x + context.viewportWidth * 0.5}, "y": ${context.viewportTopLeft.y + context.viewportHeight * 0.5}, "width": ${Math.round(context.viewportWidth * 0.1)}, "height": ${Math.round(context.viewportHeight * 0.1)}, "color": "#000000", "deltaX": null, "deltaY": null, "newX": null, "newY": null, "scaleBy": null, "newWidth": null, "newHeight": null}
- "add circle on the left" -> {"command": "create", "objectType": "ellipse", "x": ${context.viewportTopLeft.x + context.viewportWidth * 0.1}, "y": ${context.viewportTopLeft.y + context.viewportHeight * 0.5}, "width": ${Math.round(context.viewportWidth * 0.1)}, "height": ${Math.round(context.viewportWidth * 0.1)}, "color": "#000000", "deltaX": null, "deltaY": null, "newX": null, "newY": null, "scaleBy": null, "newWidth": null, "newHeight": null}
- "yellow circle to the right" -> {"command": "create", "objectType": "ellipse", "x": ${context.viewportTopLeft.x + context.viewportWidth * 0.9}, "y": ${context.viewportTopLeft.y + context.viewportHeight * 0.5}, "width": ${Math.round(context.viewportWidth * 0.1)}, "height": ${Math.round(context.viewportWidth * 0.1)}, "color": "#ffff00", "deltaX": null, "deltaY": null, "newX": null, "newY": null, "scaleBy": null, "newWidth": null, "newHeight": null}
- "violet square" -> {"command": "create", "objectType": "rectangle", "x": ${context.viewportTopLeft.x + context.viewportWidth * 0.5}, "y": ${context.viewportTopLeft.y + context.viewportHeight * 0.5}, "width": ${Math.round(context.viewportWidth * 0.1)}, "height": ${Math.round(context.viewportWidth * 0.1)}, "color": "#800080", "deltaX": null, "deltaY": null, "newX": null, "newY": null, "scaleBy": null, "newWidth": null, "newHeight": null}
- "move right" -> {"command": "modify", "color": null, "deltaX": 30, "deltaY": 0, "newX": null, "newY": null, "scaleBy": 0, "newWidth": null, "newHeight": null}
- "make bigger" -> {"command": "modify", "color": null, "deltaX": 0, "deltaY": 0, "newX": null, "newY": null, "scaleBy": 0.2, "newWidth": null, "newHeight": null}
- "change to red" -> {"command": "modify", "color": "#ff0000", "deltaX": 0, "deltaY": 0, "newX": null, "newY": null, "scaleBy": 0, "newWidth": null, "newHeight": null}
- "move to top" -> {"command": "modify", "color": null, "deltaX": null, "deltaY": null, "newX": null, "newY": ${context.viewportTopLeft.y + context.viewportHeight * 0.25}, "scaleBy": 0, "newWidth": null, "newHeight": null}

IMPORTANT: 
- Make intelligent guesses instead of using null when possible
- If no position specified, use center of viewport
- If no size specified, use appropriate defaults based on object type
- If no color specified, use black (#000000)
- For modify commands: use deltaX: 0, deltaY: 0, newX: null, newY: null, scaleBy: 0, color: null, newWidth: null, newHeight: null as defaults
- For modify commands: DO NOT include objectType, x, y, width, height fields (only for create commands)
- DO NOT use conflicting fields: deltaX with newX, deltaY with newY, scaleBy with newWidth/newHeight
- Respond with ONLY the JSON object, no markdown formatting, no code blocks, no additional text.

Message: "${message}"`

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