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
}

export interface IntentDetectionResult {
  commandData: AICommand | null
  message: string
  success: boolean
  error?: string
}

/**
 * Detect object creation intent from user message
 * 
 * @param message - User's natural language command
 * @returns Promise<IntentDetectionResult> - Detection result with object type
 */
export async function detectObjectIntent(message: string): Promise<IntentDetectionResult> {
  try {
    console.log('🤖 Server Action - Processing message:', message)

    // JSON prompt asking AI to respond with structured command data
    const prompt = `Analyze this message and respond with ONLY valid JSON. Use null for any field you cannot determine from the user's message:

{
  "command": "create" | "modify" | null,
  "objectType": "rectangle" | "ellipse" | null,
  "x": number | null,
  "y": number | null,
  "width": number | null,
  "height": number | null,
  "color": "#hexcolor" | null
}

Examples:
- "create a rectangle" -> {"command": "create", "objectType": "rectangle", "x": null, "y": null, "width": null, "height": null, "color": null}
- "add blue ellipse at 100,200" -> {"command": "create", "objectType": "ellipse", "x": 100, "y": 200, "width": null, "height": null, "color": "#0000ff"}

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
      const commandData = JSON.parse(responseText) as AICommand
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