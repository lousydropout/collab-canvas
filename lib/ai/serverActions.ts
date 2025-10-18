/**
 * Server Actions for AI Intent Detection
 * 
 * This module provides server-side functions for AI-powered object creation.
 * Uses Vercel AI SDK with OpenAI for intent detection.
 * 
 * Features:
 * - Server-side AI processing
 * - Type-safe function calls
 * - Error handling and validation
 * - Detailed logging
 */

'use server'

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createObjectTool } from './vercelTools'

export interface IntentDetectionResult {
  objectType: number // -1: none, 0: rectangle, 1: ellipse
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

    // Create the system prompt with detailed instructions
    const systemPrompt = `You are an object creation detector. Analyze the user's message and determine if they want to:
1. Create a rectangle
2. Create an ellipse
3. Neither (unrelated request)

Use the createObjectTool to determine the object type:
- Return 0 for rectangle
- Return 1 for ellipse
- Return -1 for no creation

User message: "${message}"

Analyze this message and use the createObjectTool.`

    console.log('📝 Server Action - System prompt:', systemPrompt)

    // Generate intent detection response
    console.log('🚀 Server Action - Starting generateText with OpenAI...')
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: systemPrompt,
      tools: { createObjectTool },
      temperature: 0.1
    })

    console.log('🔍 Server Action - Full LLM response:', JSON.stringify(result, null, 2))
    console.log('🔍 Server Action - Tool calls:', result.toolCalls)
    console.log('🔍 Server Action - Tool calls length:', result.toolCalls?.length || 0)
    console.log('🔍 Server Action - Text response:', result.text)
    console.log('🔍 Server Action - Tool results:', result.toolResults)

    // Extract the detected object type from tool calls
    let detectedType = -1
    if (result.toolCalls && result.toolCalls.length > 0) {
      const toolCall = result.toolCalls[0]
      console.log('🔍 Server Action - First tool call:', JSON.stringify(toolCall, null, 2))
      console.log('🔍 Server Action - Tool call structure:', {
        toolName: toolCall.toolName,
        args: toolCall.args,
        hasArgs: !!toolCall.args,
        argsKeys: toolCall.args ? Object.keys(toolCall.args) : 'no args'
      })
      
      if (toolCall.toolName === 'createObjectTool') {
        // The AI SDK uses 'input' property, not 'args'
        const input = (toolCall as any).input || {}
        detectedType = input.typeOfObject !== undefined ? input.typeOfObject : -1
        console.log('🔍 Server Action - Extracted typeOfObject from input:', detectedType)
      }
    }

    console.log('✅ Server Action - Final detected type:', detectedType)

    return {
      objectType: detectedType,
      message: result.text,
      success: true
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
      objectType: -1,
      message: errorMessage,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
