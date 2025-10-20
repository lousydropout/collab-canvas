/**
 * Canvas Types - TypeScript interfaces for the collaborative canvas system
 *
 * This file defines the core data structures used throughout the canvas application,
 * including database entities, creation payloads, and UI state management.
 */

/**
 * Core database entity representing a canvas object
 *
 * This interface represents the complete state of an object as stored in the database.
 * It includes all metadata fields (id, timestamps, ownership) plus the visual properties.
 *
 * @interface CanvasObject
 */
export interface CanvasObject {
  /** Unique identifier for the object */
  id: string;
  /** Canvas identifier (currently 'default' for single canvas) */
  canvas_id: string;
  /** Type of shape - rectangle, ellipse, triangle, or textbox */
  type: "rectangle" | "ellipse" | "triangle" | "textbox";
  /** X position on canvas (absolute coordinates) */
  x: number;
  /** Y position on canvas (absolute coordinates) */
  y: number;
  /** Width of the object in pixels */
  width: number;
  /** Height of the object in pixels */
  height: number;
  /** Color in hex format (e.g., '#ff0000') */
  color: string;
  /** Rotation angle in degrees */
  rotation: number;
  /** Z-index for layering (higher values appear on top) */
  z_index: number;
  /** Text content (only for textbox objects) */
  text_content?: string;
  /** Font size in pixels (only for textbox objects) */
  font_size?: number;
  /** Font family name (only for textbox objects) */
  font_family?: string;
  /** Font weight (only for textbox objects) */
  font_weight?: string;
  /** Text alignment (only for textbox objects) */
  text_align?: string;
  /** Current owner of the object ('all' for available, user_id for claimed) */
  owner: string;
  /** ID of the user who created the object */
  created_by: string | null;
  /** ISO timestamp when object was created */
  created_at: string;
  /** ISO timestamp when object was last updated */
  updated_at: string;
}

/**
 * Data structure for creating or updating rectangles
 *
 * This interface contains only the essential fields needed to create a rectangle.
 * Optional fields will use defaults if not provided.
 *
 * @interface RectangleData
 */
export interface RectangleData {
  /** Optional ID (for updates) */
  id?: string;
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Width of rectangle */
  width: number;
  /** Height of rectangle */
  height: number;
  /** Optional color (defaults to current user color) */
  color?: string;
  /** Optional rotation (defaults to 0) */
  rotation?: number;
  /** Optional z-index (auto-assigned if not provided) */
  z_index?: number;
}

/**
 * Data structure for creating or updating ellipses
 *
 * This interface contains only the essential fields needed to create an ellipse.
 * Optional fields will use defaults if not provided.
 *
 * @interface EllipseData
 */
export interface EllipseData {
  /** Optional ID (for updates) */
  id?: string;
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Width of ellipse */
  width: number;
  /** Height of ellipse */
  height: number;
  /** Optional color (defaults to current user color) */
  color?: string;
  /** Optional rotation (defaults to 0) */
  rotation?: number;
  /** Optional z-index (auto-assigned if not provided) */
  z_index?: number;
}

/**
 * Data structure for creating or updating triangles
 *
 * This interface contains only the essential fields needed to create a triangle.
 * Optional fields will use defaults if not provided.
 *
 * @interface TriangleData
 */
export interface TriangleData {
  /** Optional ID (for updates) */
  id?: string;
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Width of triangle */
  width: number;
  /** Height of triangle */
  height: number;
  /** Optional color (defaults to current user color) */
  color?: string;
  /** Optional rotation (defaults to 0) */
  rotation?: number;
  /** Optional z-index (auto-assigned if not provided) */
  z_index?: number;
}

/**
 * Data structure for creating or updating textboxes
 *
 * This interface contains only the essential fields needed to create a textbox.
 * Optional fields will use defaults if not provided.
 *
 * @interface TextboxData
 */
export interface TextboxData {
  /** Optional ID (for updates) */
  id?: string;
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Width of textbox */
  width: number;
  /** Height of textbox */
  height: number;
  /** Text content */
  text_content: string;
  /** Optional color (defaults to current user color) */
  color?: string;
  /** Optional rotation (defaults to 0) */
  rotation?: number;
  /** Optional z-index (auto-assigned if not provided) */
  z_index?: number;
  /** Optional font size (defaults to 16) */
  font_size?: number;
  /** Optional font family (defaults to 'Arial') */
  font_family?: string;
  /** Optional font weight (defaults to 'normal') */
  font_weight?: string;
  /** Optional text alignment (defaults to 'left') */
  text_align?: string;
}

/**
 * UI state management for the canvas component
 *
 * This interface manages the current state of the canvas UI, including
 * selected objects, active tool, and user preferences.
 *
 * @interface CanvasState
 */
export interface CanvasState {
  /** Array of all objects currently on the canvas */
  objects: CanvasObject[];
  /** Array of IDs of currently selected objects */
  selectedObjects: string[];
  /** Currently active tool */
  tool: "select" | "rectangle" | "ellipse" | "triangle" | "text";
  /** Whether user is currently creating a new object */
  isCreating: boolean;
  /** Current color selection for new objects */
  currentColor: string;
}

/**
 * Generic payload for creating any type of canvas object
 *
 * This interface is used by the service layer to create objects.
 * It combines the type information with the common properties.
 *
 * Data flow: User Input → CreateObjectPayload → CanvasOperations → Database → CanvasObject
 *
 * @interface CreateObjectPayload
 */
export interface CreateObjectPayload {
  /** Optional canvas ID (defaults to 'default') */
  canvas_id?: string;
  /** Type of object to create */
  type: "rectangle" | "ellipse" | "triangle" | "textbox";
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Width of object */
  width: number;
  /** Height of object */
  height: number;
  /** Optional color (defaults to current user color) */
  color?: string;
  /** Optional rotation (defaults to 0) */
  rotation?: number;
  /** Optional z-index (auto-assigned if not provided) */
  z_index?: number;
}

/**
 * Interface Relationships:
 *
 * 1. CanvasObject - Complete database entity with all fields
 *    Used for: Reading from database, real-time sync, complete object state
 *
 * 2. RectangleData/EllipseData - Shape-specific creation data
 *    Used for: Creating rectangles/ellipses with minimal required fields
 *
 * 3. CreateObjectPayload - Generic creation interface
 *    Used for: Service layer operations, AI tool integration
 *
 * 4. CanvasState - UI state management
 *    Used for: Component state, user interactions, tool management
 *
 * Z-Index System:
 * - Higher z_index values appear on top
 * - Each canvas maintains unique z_index values per object
 * - New objects get z_index = max_existing + 1
 * - Z-index operations: bringToFront, sendToBack
 */
