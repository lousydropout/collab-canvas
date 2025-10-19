/**
 * Utility Functions
 * 
 * This module provides common utility functions used throughout the application.
 * Currently contains TailwindCSS class merging functionality for consistent styling.
 * 
 * Features:
 * - CSS class merging with clsx and tailwind-merge
 * - Prevents TailwindCSS class conflicts
 * - Type-safe class value handling
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
