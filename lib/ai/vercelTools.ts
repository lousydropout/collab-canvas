/**
 * Simplified AI Object Creation Tool
 * 
 * This module provides a single tool for creating objects based on user intent.
 * Takes 0 for rectangle, 1 for ellipse, or -1 for no creation.
 */

import { tool } from 'ai'
import {z} from 'zod'
/**
 * Create object tool
 * 
 * Analyzes user message and returns a number indicating what to create:
 * - 0: Create rectangle
 * - 1: Create ellipse  
 * - -1: No creation
 */
export const createObjectTool = tool({
  description: 'Create an object.',
  inputSchema: z.object({
    typeOfObject: z.number().describe('0 for rectangle, 1 for ellipse, -1 for no creation')
  }),
  execute: async ({typeOfObject}: {typeOfObject: number}) => {
    console.log('🔍 Object creation tool called with:', typeOfObject)
    return typeOfObject
  }
})

/**
 * Tool description for AI system prompt
 */
export const CANVAS_TOOLS_DESCRIPTION = `
Available Canvas Tool:

1. create_object - Create an object based on user intent

The tool will analyze the user's message and return:
- 0 if they want to create a rectangle
- 1 if they want to create an ellipse  
- -1 if no object creation intent is detected
`