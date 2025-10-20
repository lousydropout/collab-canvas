/**
 * Simplified Canvas AI Service
 *
 * This service provides simple intent detection for object creation.
 * Detects if user wants to create rectangle or ellipse and creates with defaults.
 *
 * Features:
 * - Intent detection via server action
 * - Default object creation
 * - Error handling and user feedback
 */

import { CanvasOperations } from "@/lib/canvas/CanvasOperations";
import { CanvasSize } from "@/lib/canvas/coordinateUtils";
import { CanvasObject } from "@/types/canvas";
import {
  detectObjectIntent,
  AICommand,
  AIContext,
} from "@/lib/ai/serverActions";

// Default values for object creation
const DEFAULT_SIZE = { width: 200, height: 150 };

// Array of vibrant colors for random selection
const RANDOM_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Lavender
  "#85C1E9", // Sky Blue
  "#F8C471", // Orange
  "#82E0AA", // Light Green
  "#F1948A", // Pink
  "#85C1E9", // Light Blue
  "#D7BDE2", // Light Purple
  "#F9E79F", // Light Yellow
  "#A9DFBF", // Light Mint
  "#FADBD8", // Light Pink
  "#D5DBDB", // Light Gray
  "#FCF3CF", // Cream
];

/**
 * Generate a random color from the predefined color palette
 */
function getRandomColor(): string {
  return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
}

/**
 * Check if a color string is a valid hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export interface AIResponse {
  message: string;
  success: boolean;
  error?: string;
  commandData?: AICommand;
}

export interface CanvasStateUpdater {
  addObject: (object: CanvasObject) => void;
  updateObject: (
    id: string,
    updates: Partial<CanvasObject>
  ) => Promise<CanvasObject | null>;
  initializeOwnership: (
    object: CanvasObject,
    userId: string,
    displayName?: string
  ) => Promise<void>;
  claimObject: (objectId: string) => Promise<boolean>;
  selectObjects: (objectIds: string[]) => void;
}

/**
 * Simplified Canvas AI Service Class
 *
 * Handles simple intent detection and default object creation.
 */
export class CanvasAI {
  private operations: CanvasOperations;
  private canvasSize: CanvasSize;
  private stateUpdater?: CanvasStateUpdater;
  private currentColor: string = "#000000";
  private viewportInfo: { scale: number; position: { x: number; y: number } } =
    { scale: 1, position: { x: 0, y: 0 } };

  constructor(
    operations: CanvasOperations,
    canvasSize: CanvasSize,
    stateUpdater?: CanvasStateUpdater,
    currentColor?: string,
    viewportInfo?: { scale: number; position: { x: number; y: number } }
  ) {
    this.operations = operations;
    this.canvasSize = canvasSize;
    this.stateUpdater = stateUpdater;
    if (currentColor) this.currentColor = currentColor;
    if (viewportInfo) this.viewportInfo = viewportInfo;
  }

  /**
   * Update the current color
   */
  updateCurrentColor(color: string): void {
    if (this.currentColor !== color) {
      this.currentColor = color;
      console.log("🎨 CanvasAI updated current color:", color);
    }
  }

  /**
   * Update viewport information
   */
  updateViewportInfo(info: {
    scale: number;
    position: { x: number; y: number };
  }): void {
    // Only update if the values have actually changed
    if (
      this.viewportInfo.scale !== info.scale ||
      this.viewportInfo.position.x !== info.position.x ||
      this.viewportInfo.position.y !== info.position.y
    ) {
      this.viewportInfo = info;
      console.log("📐 CanvasAI updated viewport info:", info);
    }
  }

  /**
   * Calculate the center of the visible viewport in canvas coordinates
   */
  private getViewportCenter(): { x: number; y: number } {
    const centerX =
      (this.canvasSize.width / 2 - this.viewportInfo.position.x) /
      this.viewportInfo.scale;
    const centerY =
      (this.canvasSize.height / 2 - this.viewportInfo.position.y) /
      this.viewportInfo.scale;
    return { x: centerX, y: centerY };
  }

  /**
   * Process a user message and create object if intent detected
   *
   * @param message - User's natural language command
   * @param selectedObjects - Array of currently selected object IDs
   * @returns Promise<AIResponse> - AI's response and operation result
   */
  async processMessage(
    message: string,
    selectedObjects: string[] = []
  ): Promise<AIResponse> {
    try {
      console.log("🤖 Processing AI message:", message);

      // Create context for the AI
      const context: AIContext = {
        selectedObjectsCount: selectedObjects.length,
        viewportWidth: this.canvasSize.width / this.viewportInfo.scale,
        viewportHeight: this.canvasSize.height / this.viewportInfo.scale,
        viewportTopLeft: {
          x: -this.viewportInfo.position.x / this.viewportInfo.scale,
          y: -this.viewportInfo.position.y / this.viewportInfo.scale,
        },
      };

      console.log("📊 AI Context:", context);

      // Call the server action for intent detection
      const result = await detectObjectIntent(message, context);
      console.log("✅ AI intent detection result:", result);

      if (!result.success || !result.commandData) {
        console.log("❌ Server action failed:", result.error);
        return {
          message: result.error || "Could not understand command",
          success: false,
          error: result.error,
        };
      }

      const commandData = result.commandData;

      if (commandData.command === "create") {
        return await this.handleCreateCommand(commandData);
      } else if (commandData.command === "modify") {
        return await this.handleModifyCommand(commandData, selectedObjects);
      } else if (commandData.command === "layout") {
        return await this.handleLayoutCommand(commandData, selectedObjects);
      } else {
        return {
          message:
            'No command detected. Try "create a rectangle", "add an ellipse", or "arrange selected in a row"',
          success: true,
        };
      }
    } catch (error) {
      console.error("❌ AI message processing failed:", error);

      let errorMessage =
        "Sorry, I encountered an error processing your request.";

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
        message: errorMessage,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Apply default values to command data
   */
  private applyDefaults(commandData: AICommand): {
    command: "create" | "modify" | "layout";
    objectType:
      | "rectangle"
      | "ellipse"
      | "triangle"
      | "square"
      | "circle"
      | "textbox";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    deltaX: null;
    deltaY: null;
    newX: null;
    newY: null;
    scaleBy: null;
    newWidth: null;
    newHeight: null;
    // Textbox-specific fields
    text_content: string;
    font_size: number;
    font_family: string;
    font_weight: string;
    text_align: string;
  } {
    const center = this.getViewportCenter();

    // Use AI-provided values or smart defaults based on object type
    let width = commandData.width ?? DEFAULT_SIZE.width;
    let height = commandData.height ?? DEFAULT_SIZE.height;

    // If AI provided specific values, use them; otherwise apply viewport-relative defaults
    if (commandData.width === null && commandData.height === null) {
      if (commandData.objectType === "ellipse") {
        // Default ellipse/circle should be square, 10% of viewport width
        const size = Math.round(this.canvasSize.width * 0.1);
        width = size;
        height = size;
      } else if (commandData.objectType === "triangle") {
        // Default triangle, 10% of viewport dimensions
        width = Math.round(this.canvasSize.width * 0.1);
        height = Math.round(this.canvasSize.height * 0.1);
      } else if (commandData.objectType === "textbox") {
        // Default textbox, larger for text content
        width = Math.round(this.canvasSize.width * 0.2);
        height = Math.round(this.canvasSize.height * 0.1);
      } else {
        // Default rectangle, 10% of viewport dimensions
        width = Math.round(this.canvasSize.width * 0.1);
        height = Math.round(this.canvasSize.height * 0.1);
      }
    }

    // Convert from center coordinates to top-left coordinates
    const x =
      commandData.x !== null && commandData.x !== undefined
        ? commandData.x - width / 2
        : center.x - width / 2;
    const y =
      commandData.y !== null && commandData.y !== undefined
        ? commandData.y - height / 2
        : center.y - height / 2;

    return {
      command: commandData.command || "create",
      objectType: commandData.objectType || "rectangle",
      x,
      y,
      width,
      height,
      color:
        commandData.color && isValidHexColor(commandData.color)
          ? commandData.color
          : getRandomColor(),
      deltaX: null,
      deltaY: null,
      newX: null,
      newY: null,
      scaleBy: null,
      newWidth: null,
      newHeight: null,
      // Textbox-specific fields
      text_content: commandData.text_content || "Text",
      font_size: commandData.font_size || 16,
      font_family: commandData.font_family || "Arial",
      font_weight: commandData.font_weight || "normal",
      text_align: commandData.text_align || "left",
    };
  }

  /**
   * Handle create command with applied defaults
   */
  private async handleCreateCommand(
    commandData: AICommand
  ): Promise<AIResponse> {
    console.log("🎨 Creating objects with command data:", commandData);

    // Handle batch creation with args array
    if (commandData.args && commandData.args.length > 0) {
      return await this.handleBatchCreation(commandData.args);
    }

    // Handle pattern creation
    if (commandData.pattern) {
      return await this.handlePatternCreation(commandData);
    }

    // Handle single object creation
    const params = this.applyDefaults(commandData);
    console.log("🎨 Creating single object with params:", params);

    // Map common object type aliases to supported types
    const normalizedObjectType =
      params.objectType === "square"
        ? "rectangle"
        : params.objectType === "circle"
        ? "ellipse"
        : params.objectType;

    if (normalizedObjectType === "rectangle") {
      const result = await this.operations.createRectangle({
        type: "rectangle",
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        color: params.color,
        rotation: 0,
      });
      console.log("🎨 createRectangle result:", result);

      // Initialize ownership and add to local state if state updater is available
      if (result && this.stateUpdater) {
        console.log("🎨 Initializing ownership for rectangle:", result.id);
        await this.stateUpdater.initializeOwnership(
          result,
          this.operations["user"].id,
          this.operations["user"].email
        );
        // Add to local state immediately (CanvasOperations.createRectangle already broadcasts)
        this.stateUpdater.addObject(result);
      }

      return {
        message: `Successfully created a rectangle at (${Math.round(
          params.x
        )}, ${Math.round(params.y)}) with size ${params.width}x${
          params.height
        }`,
        success: true,
        commandData: params,
      };
    } else if (normalizedObjectType === "ellipse") {
      const result = await this.operations.createEllipse({
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        color: params.color,
        rotation: 0,
      });
      console.log("🎨 createEllipse result:", result);

      // Initialize ownership and add to local state if state updater is available
      if (result && this.stateUpdater) {
        console.log("🎨 Initializing ownership for ellipse:", result.id);
        await this.stateUpdater.initializeOwnership(
          result,
          this.operations["user"].id,
          this.operations["user"].email
        );
        // Add to local state immediately (CanvasOperations.createEllipse already broadcasts)
        this.stateUpdater.addObject(result);
      }

      return {
        message: `Successfully created an ellipse at (${Math.round(
          params.x
        )}, ${Math.round(params.y)}) with size ${params.width}x${
          params.height
        }`,
        success: true,
        commandData: params,
      };
    } else if (normalizedObjectType === "triangle") {
      const result = await this.operations.createTriangle({
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        color: params.color,
        rotation: 0,
      });

      // Initialize ownership and add to local state if state updater is available
      if (result && this.stateUpdater) {
        await this.stateUpdater.initializeOwnership(
          result,
          this.operations["user"].id,
          this.operations["user"].email
        );
        // Add to local state immediately (CanvasOperations.createTriangle already broadcasts)
        this.stateUpdater.addObject(result);
      }

      return {
        message: `Successfully created a triangle at (${Math.round(
          params.x
        )}, ${Math.round(params.y)}) with size ${params.width}x${
          params.height
        }`,
        success: true,
        commandData: params,
      };
    } else if (normalizedObjectType === "textbox") {
      const result = await this.operations.createTextbox({
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
        color: params.color,
        rotation: 0,
        text_content: params.text_content,
        font_size: params.font_size,
        font_family: params.font_family,
        font_weight: params.font_weight,
        text_align: params.text_align,
      });

      // Initialize ownership and add to local state if state updater is available
      if (result && this.stateUpdater) {
        await this.stateUpdater.initializeOwnership(
          result,
          this.operations["user"].id,
          this.operations["user"].email
        );
        // Add to local state immediately (CanvasOperations.createTextbox already broadcasts)
        this.stateUpdater.addObject(result);
      }

      return {
        message: `Successfully created a textbox at (${Math.round(
          params.x
        )}, ${Math.round(params.y)}) with text "${params.text_content}"`,
        success: true,
        commandData: params,
      };
    } else {
      return {
        message: "Unknown object type",
        success: false,
        error: "Invalid object type",
      };
    }
  }

  /**
   * Handle batch creation with args array
   */
  private async handleBatchCreation(
    args: Array<{
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
    }>
  ): Promise<AIResponse> {
    console.log("🎨 Creating batch of objects:", args.length);

    const results = [];
    const errors = [];
    const createdObjectIds: string[] = []; // Collect all created IDs

    for (const arg of args) {
      try {
        const params = this.applyDefaults({
          command: "create",
          objectType: arg.objectType,
          x: arg.x ?? null,
          y: arg.y ?? null,
          width: arg.width ?? null,
          height: arg.height ?? null,
          color:
            arg.color && isValidHexColor(arg.color)
              ? arg.color
              : getRandomColor(), // Use random color if no valid color provided
        });

        // Map common object type aliases to supported types
        const normalizedObjectType =
          params.objectType === "square"
            ? "rectangle"
            : params.objectType === "circle"
            ? "ellipse"
            : params.objectType;

        let result;
        if (normalizedObjectType === "rectangle") {
          result = await this.operations.createRectangle({
            type: "rectangle",
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height,
            color: params.color,
            rotation: 0,
          });
        } else if (normalizedObjectType === "ellipse") {
          result = await this.operations.createEllipse({
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height,
            color: params.color,
            rotation: 0,
          });
        } else if (normalizedObjectType === "triangle") {
          result = await this.operations.createTriangle({
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height,
            color: params.color,
            rotation: 0,
          });
        } else if (normalizedObjectType === "textbox") {
          result = await this.operations.createTextbox({
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height,
            color: params.color,
            rotation: 0,
            text_content: params.text_content,
            font_size: params.font_size,
            font_family: params.font_family,
            font_weight: params.font_weight,
            text_align: params.text_align,
          });
        }

        if (result && this.stateUpdater) {
          await this.stateUpdater.initializeOwnership(
            result,
            this.operations["user"].id,
            this.operations["user"].email
          );
          this.stateUpdater.addObject(result);
          createdObjectIds.push(result.id); // Collect ID
        }

        results.push(result);
      } catch (error) {
        console.error("❌ Error creating object in batch:", error);
        errors.push(error);
      }
    }

    // Select all created objects at once
    if (createdObjectIds.length > 0 && this.stateUpdater) {
      this.stateUpdater.selectObjects(createdObjectIds);
    }

    const successCount = results.filter((r) => r !== null).length;

    return {
      message: `Successfully created ${successCount} objects${
        errors.length > 0 ? ` (${errors.length} failed)` : ""
      }`,
      success: successCount > 0,
      commandData: { command: "create", args },
    };
  }

  /**
   * Handle pattern creation
   */
  private async handlePatternCreation(
    commandData: AICommand
  ): Promise<AIResponse> {
    console.log("🎨 Creating pattern:", commandData.pattern);

    if (!commandData.pattern) {
      return {
        message: "No pattern specified",
        success: false,
        error: "Missing pattern data",
      };
    }

    const pattern = commandData.pattern;
    const objectType = commandData.objectType || "rectangle";

    // Map common object type aliases to supported types
    const normalizedObjectType =
      objectType === "square"
        ? "rectangle"
        : objectType === "circle"
        ? "ellipse"
        : objectType;

    // For now, we'll create a simple implementation
    // In a full implementation, you'd want to generate objects based on the pattern type
    const results = [];

    try {
      // Simple grid pattern implementation
      if (pattern.type === "grid" && pattern.rows && pattern.columns) {
        const startPos = pattern.startPosition || { x: 100, y: 100 };

        // Calculate object dimensions first
        const width = pattern.width || Math.round(this.canvasSize.width * 0.05);
        const height =
          pattern.height || Math.round(this.canvasSize.height * 0.05);
        // Use pattern color if provided, otherwise each object will get a random color

        // Calculate spacing based on object size to prevent overlaps
        const padding = 10; // 10px padding between objects
        const minSpacingX = width + padding;
        const minSpacingY = height + padding;

        // Use AI-provided spacing if it's large enough, otherwise use minimum safe spacing
        const spacing = {
          x: pattern.spacing
            ? Math.max(pattern.spacing.x, minSpacingX)
            : minSpacingX,
          y: pattern.spacing
            ? Math.max(pattern.spacing.y, minSpacingY)
            : minSpacingY,
        };

        const createdObjectIds: string[] = []; // Collect all created IDs

        for (let row = 0; row < pattern.rows; row++) {
          for (let col = 0; col < pattern.columns; col++) {
            const x = startPos.x + col * spacing.x;
            const y = startPos.y + row * spacing.y;

            // Generate a new random color for each object when pattern color is invalid
            const objectColor =
              pattern.color && isValidHexColor(pattern.color)
                ? pattern.color
                : getRandomColor();

            let result;
            if (normalizedObjectType === "rectangle") {
              result = await this.operations.createRectangle({
                type: "rectangle",
                x,
                y,
                width,
                height,
                color: objectColor,
                rotation: 0,
              });
            } else if (normalizedObjectType === "ellipse") {
              result = await this.operations.createEllipse({
                x,
                y,
                width,
                height,
                color: objectColor,
                rotation: 0,
              });
            } else if (normalizedObjectType === "triangle") {
              result = await this.operations.createTriangle({
                x,
                y,
                width,
                height,
                color: objectColor,
                rotation: 0,
              });
            } else if (normalizedObjectType === "textbox") {
              result = await this.operations.createTextbox({
                x,
                y,
                width,
                height,
                color: objectColor,
                rotation: 0,
                text_content: pattern.text_content || "Text",
                font_size: pattern.font_size || 16,
                font_family: pattern.font_family || "Arial",
                font_weight: pattern.font_weight || "normal",
                text_align: pattern.text_align || "left",
              });
            }

            if (result && this.stateUpdater) {
              await this.stateUpdater.initializeOwnership(
                result,
                this.operations["user"].id,
                this.operations["user"].email
              );
              this.stateUpdater.addObject(result);
              createdObjectIds.push(result.id); // Collect ID
            }

            results.push(result);
          }
        }

        // Select all created objects at once
        if (createdObjectIds.length > 0 && this.stateUpdater) {
          this.stateUpdater.selectObjects(createdObjectIds);
        }
      } else {
        // For other pattern types, create a simple implementation
        const count = pattern.count || 10;
        const width = pattern.width || Math.round(this.canvasSize.width * 0.05);
        const height =
          pattern.height || Math.round(this.canvasSize.height * 0.05);
        // Use pattern color if provided, otherwise each object will get a random color

        for (let i = 0; i < count; i++) {
          const x = Math.random() * (this.canvasSize.width - width);
          const y = Math.random() * (this.canvasSize.height - height);

          // Generate a new random color for each object when pattern color is invalid
          const objectColor =
            pattern.color && isValidHexColor(pattern.color)
              ? pattern.color
              : getRandomColor();

          let result;
          if (objectType === "rectangle") {
            result = await this.operations.createRectangle({
              type: "rectangle",
              x,
              y,
              width,
              height,
              color: objectColor,
              rotation: 0,
            });
          } else if (objectType === "ellipse") {
            result = await this.operations.createEllipse({
              x,
              y,
              width,
              height,
              color: objectColor,
              rotation: 0,
            });
          } else if (objectType === "triangle") {
            result = await this.operations.createTriangle({
              x,
              y,
              width,
              height,
              color: objectColor,
              rotation: 0,
            });
          } else if (objectType === "textbox") {
            result = await this.operations.createTextbox({
              x,
              y,
              width,
              height,
              color: objectColor,
              rotation: 0,
              text_content: pattern.text_content || "Text",
              font_size: pattern.font_size || 16,
              font_family: pattern.font_family || "Arial",
              font_weight: pattern.font_weight || "normal",
              text_align: pattern.text_align || "left",
            });
          }

          if (result && this.stateUpdater) {
            await this.stateUpdater.initializeOwnership(
              result,
              this.operations["user"].id,
              this.operations["user"].email
            );
            this.stateUpdater.addObject(result);
          }

          results.push(result);
        }
      }

      const successCount = results.filter((r) => r !== null).length;

      return {
        message: `Successfully created ${successCount} objects in ${pattern.type} pattern`,
        success: successCount > 0,
        commandData,
      };
    } catch (error) {
      console.error("❌ Error creating pattern:", error);
      return {
        message: "Failed to create pattern",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle modify command for selected objects
   */
  private async handleModifyCommand(
    commandData: AICommand,
    selectedObjects: string[]
  ): Promise<AIResponse> {
    if (selectedObjects.length === 0) {
      return {
        message:
          "No objects selected. Please select objects first before modifying them.",
        success: false,
        error: "No objects selected",
      };
    }

    console.log(
      "🔧 Modifying objects:",
      selectedObjects,
      "with command:",
      commandData
    );

    try {
      const results = [];

      for (const objectId of selectedObjects) {
        // Get current object properties
        const currentObject = await this.operations.getObject(objectId);
        if (!currentObject) {
          console.error(`❌ Object ${objectId} not found`);
          continue;
        }

        // Check if object is already owned by current user, otherwise claim it
        if (this.stateUpdater) {
          // If object is already owned by current user, no need to claim
          if (currentObject.owner === this.operations["user"].id) {
            console.log(
              `✅ Object ${objectId} already owned by current user - proceeding with modification`
            );
          } else {
            console.log(
              `🏷️ Attempting to claim object ${objectId} for AI modification`
            );
            const claimSucceeded = await this.stateUpdater.claimObject(
              objectId
            );
            if (!claimSucceeded) {
              console.error(
                `❌ Failed to claim object ${objectId} - skipping modification`
              );
              continue;
            }
            console.log(`✅ Successfully claimed object ${objectId}`);
          }
        }

        const modifications: Partial<CanvasObject> = {};

        // Apply delta position changes (relative movement)
        if (
          commandData.deltaX !== null &&
          commandData.deltaX !== undefined &&
          commandData.deltaX !== 0
        ) {
          modifications.x = currentObject.x + commandData.deltaX;
        }
        if (
          commandData.deltaY !== null &&
          commandData.deltaY !== undefined &&
          commandData.deltaY !== 0
        ) {
          modifications.y = currentObject.y + commandData.deltaY;
        }

        // Apply absolute position changes (override deltas if both present)
        if (commandData.newX !== null && commandData.newX !== undefined) {
          modifications.x = commandData.newX;
        }
        if (commandData.newY !== null && commandData.newY !== undefined) {
          modifications.y = commandData.newY;
        }

        // Apply scaling (proportional size changes)
        if (
          commandData.scaleBy !== null &&
          commandData.scaleBy !== undefined &&
          commandData.scaleBy !== 0
        ) {
          if (currentObject.type === "textbox") {
            // For textboxes, scaleBy applies to font size, not object dimensions
            const currentFontSize = currentObject.font_size || 16;
            modifications.font_size = Math.round(
              currentFontSize * commandData.scaleBy
            );
            console.log(
              `🔧 Scaling textbox font size ${objectId}: ${currentFontSize} * ${commandData.scaleBy} = ${modifications.font_size}`
            );
          } else {
            // For other objects, scaleBy applies to width and height
            modifications.width = currentObject.width * commandData.scaleBy;
            modifications.height = currentObject.height * commandData.scaleBy;
            console.log(
              `🔧 Scaling object ${objectId}: ${currentObject.width}x${currentObject.height} * ${commandData.scaleBy} = ${modifications.width}x${modifications.height}`
            );
          }
        }

        // Apply color change
        if (commandData.color !== null && commandData.color !== undefined) {
          modifications.color = commandData.color;
        }

        // Apply textbox-specific modifications
        if (currentObject.type === "textbox") {
          if (
            commandData.text_content !== null &&
            commandData.text_content !== undefined
          ) {
            modifications.text_content = commandData.text_content;
          }
          if (
            commandData.font_size !== null &&
            commandData.font_size !== undefined
          ) {
            modifications.font_size = commandData.font_size;
          }
          if (
            commandData.font_family !== null &&
            commandData.font_family !== undefined
          ) {
            modifications.font_family = commandData.font_family;
          }
          if (
            commandData.font_weight !== null &&
            commandData.font_weight !== undefined
          ) {
            modifications.font_weight = commandData.font_weight;
          }
          if (
            commandData.text_align !== null &&
            commandData.text_align !== undefined
          ) {
            modifications.text_align = commandData.text_align;
          }
        }

        // Apply specific size changes (override scaling if both present)
        if (
          commandData.newWidth !== null &&
          commandData.newWidth !== undefined
        ) {
          modifications.width = commandData.newWidth;
        }
        if (
          commandData.newHeight !== null &&
          commandData.newHeight !== undefined
        ) {
          modifications.height = commandData.newHeight;
        }

        console.log(
          `🔍 Debug scaling for ${objectId}: scaleBy=${commandData.scaleBy}, currentObject width=${currentObject.width}, height=${currentObject.height}`
        );
        console.log(
          `🔍 All commandData values:`,
          JSON.stringify(commandData, null, 2)
        );

        // Only apply modifications if there are any
        if (Object.keys(modifications).length > 0) {
          console.log(
            `🔧 Applying modifications to ${objectId}:`,
            modifications
          );

          // Use stateUpdater's updateObject method which includes optimistic updates
          const result = this.stateUpdater
            ? await this.stateUpdater.updateObject(objectId, modifications)
            : await this.operations.updateObject(objectId, modifications);

          console.log(`🔧 Update result for ${objectId}:`, result);
          if (result) {
            results.push(result);
          }
        } else {
          console.log(`🔧 No modifications to apply for ${objectId}`);
        }
      }

      if (results.length > 0) {
        return {
          message: `Successfully modified ${results.length} object(s)`,
          success: true,
          commandData: commandData,
        };
      } else {
        return {
          message: "No modifications were applied",
          success: true,
          commandData: commandData,
        };
      }
    } catch (error) {
      console.error("❌ Modify command failed:", error);
      return {
        message: "Failed to modify objects",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle layout command for selected objects
   */
  private async handleLayoutCommand(
    commandData: AICommand,
    selectedObjects: string[]
  ): Promise<AIResponse> {
    if (selectedObjects.length < 2) {
      return {
        message:
          "At least 2 objects must be selected to perform layout operations.",
        success: false,
        error: "Insufficient objects selected",
      };
    }

    console.log(
      "📐 Processing layout command:",
      commandData,
      "for objects:",
      selectedObjects
    );

    try {
      if (!commandData.layoutType) {
        return {
          message: "Layout type not specified",
          success: false,
          error: "Missing layout type",
        };
      }

      let success = false;
      let message = "";

      switch (commandData.layoutType) {
        case "row":
          success = await this.handleAlignmentWithStateUpdater(
            selectedObjects,
            "distribute",
            "horizontal"
          );
          message = success
            ? `Successfully arranged ${selectedObjects.length} object(s) in a row`
            : "Failed to arrange objects in a row";
          break;

        case "column":
          success = await this.handleAlignmentWithStateUpdater(
            selectedObjects,
            "distribute",
            "vertical"
          );
          message = success
            ? `Successfully arranged ${selectedObjects.length} object(s) in a column`
            : "Failed to arrange objects in a column";
          break;

        case "space":
          // Use distribute with the specified direction or default to horizontal
          const direction = commandData.layoutDirection || "horizontal";
          success = await this.handleAlignmentWithStateUpdater(
            selectedObjects,
            "distribute",
            direction
          );
          message = success
            ? `Successfully spaced ${selectedObjects.length} object(s) evenly`
            : "Failed to space objects evenly";
          break;

        case "align":
          if (!commandData.alignType) {
            return {
              message: "Alignment type not specified",
              success: false,
              error: "Missing alignment type",
            };
          }
          success = await this.handleAlignmentWithStateUpdater(
            selectedObjects,
            commandData.alignType,
            commandData.layoutDirection || undefined
          );
          message = success
            ? `Successfully aligned ${selectedObjects.length} object(s) ${commandData.alignType}`
            : `Failed to align objects ${commandData.alignType}`;
          break;

        case "grid":
          // For grid layout, we'll need to implement custom logic
          // For now, fall back to a simple row arrangement
          success = await this.handleAlignmentWithStateUpdater(
            selectedObjects,
            "distribute",
            "horizontal"
          );
          message = success
            ? `Successfully arranged ${selectedObjects.length} object(s) in a grid pattern`
            : "Failed to arrange objects in a grid";
          break;

        default:
          return {
            message: "Unknown layout type",
            success: false,
            error: "Invalid layout type",
          };
      }

      return {
        message,
        success,
        commandData: commandData,
      };
    } catch (error) {
      console.error("❌ Layout command failed:", error);
      return {
        message: "Failed to perform layout operation",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle alignment using stateUpdater for immediate local updates and broadcasting
   */
  private async handleAlignmentWithStateUpdater(
    objectIds: string[],
    alignType:
      | "left"
      | "right"
      | "center"
      | "top"
      | "bottom"
      | "middle"
      | "distribute",
    alignAxis?: "horizontal" | "vertical"
  ): Promise<boolean> {
    if (!this.stateUpdater || objectIds.length < 2) return false;

    try {
      console.log(
        "📐 AI Alignment with stateUpdater:",
        objectIds,
        "type:",
        alignType
      );

      // Get all objects to align
      const objects = await this.operations.getObjectsByIds(objectIds);
      if (objects.length < 2) return false;

      // Determine axis if not provided
      if (!alignAxis) {
        if (["left", "right", "center"].includes(alignType)) {
          alignAxis = "horizontal";
        } else if (["top", "bottom", "middle"].includes(alignType)) {
          alignAxis = "vertical";
        } else {
          alignAxis = "horizontal"; // default for distribute
        }
      }

      const updates: Array<{ id: string; updates: Partial<CanvasObject> }> = [];

      if (alignType === "distribute") {
        // Distribute objects evenly
        if (alignAxis === "horizontal") {
          const sortedObjects = objects.sort((a, b) => a.x - b.x);
          const minX = Math.min(...sortedObjects.map((obj) => obj.x));
          const maxX = Math.max(
            ...sortedObjects.map((obj) => obj.x + obj.width)
          );
          const totalWidth = maxX - minX;
          const spacing = totalWidth / (sortedObjects.length - 1);

          sortedObjects.forEach((obj, index) => {
            const newX = minX + spacing * index - obj.width / 2;
            updates.push({ id: obj.id, updates: { x: newX } });
          });
        } else {
          const sortedObjects = objects.sort((a, b) => a.y - b.y);
          const minY = Math.min(...sortedObjects.map((obj) => obj.y));
          const maxY = Math.max(
            ...sortedObjects.map((obj) => obj.y + obj.height)
          );
          const totalHeight = maxY - minY;
          const spacing = totalHeight / (sortedObjects.length - 1);

          sortedObjects.forEach((obj, index) => {
            const newY = minY + spacing * index - obj.height / 2;
            updates.push({ id: obj.id, updates: { y: newY } });
          });
        }
      } else {
        // Align to edges or center
        if (alignAxis === "horizontal") {
          let targetX: number;

          if (alignType === "left") {
            targetX = Math.min(...objects.map((obj) => obj.x));
          } else if (alignType === "right") {
            targetX = Math.max(...objects.map((obj) => obj.x + obj.width));
          } else {
            // center
            const minX = Math.min(...objects.map((obj) => obj.x));
            const maxX = Math.max(...objects.map((obj) => obj.x + obj.width));
            targetX = (minX + maxX) / 2;
          }

          objects.forEach((obj) => {
            let newX = obj.x;
            if (alignType === "left") {
              newX = targetX;
            } else if (alignType === "right") {
              newX = targetX - obj.width;
            } else if (alignType === "center") {
              newX = targetX - obj.width / 2;
            }
            updates.push({ id: obj.id, updates: { x: newX } });
          });
        } else {
          let targetY: number;

          if (alignType === "top") {
            targetY = Math.min(...objects.map((obj) => obj.y));
          } else if (alignType === "bottom") {
            targetY = Math.max(...objects.map((obj) => obj.y + obj.height));
          } else {
            // middle
            const minY = Math.min(...objects.map((obj) => obj.y));
            const maxY = Math.max(...objects.map((obj) => obj.y + obj.height));
            targetY = (minY + maxY) / 2;
          }

          objects.forEach((obj) => {
            let newY = obj.y;
            if (alignType === "top") {
              newY = targetY;
            } else if (alignType === "bottom") {
              newY = targetY - obj.height;
            } else if (alignType === "middle") {
              newY = targetY - obj.height / 2;
            }
            updates.push({ id: obj.id, updates: { y: newY } });
          });
        }
      }

      // Apply all updates using stateUpdater (immediate local updates + broadcasting)
      const updatePromises = updates.map(({ id, updates: objectUpdates }) =>
        this.stateUpdater!.updateObject(id, objectUpdates)
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter((result) => result !== null).length;

      console.log(
        `✅ AI Alignment completed: ${successCount}/${updates.length} updated`
      );
      return successCount > 0;
    } catch (error) {
      console.error("❌ AI Alignment failed:", error);
      return false;
    }
  }

  /**
   * Check if the AI service is properly initialized
   */
  isReady(): boolean {
    return !!this.operations && !!this.canvasSize;
  }

  /**
   * Get the canvas size for context
   */
  getCanvasSize(): CanvasSize {
    return this.canvasSize;
  }

  /**
   * Update canvas size (called when canvas is resized)
   */
  updateCanvasSize(newSize: CanvasSize): void {
    this.canvasSize = newSize;
    console.log("📐 CanvasAI updated canvas size:", newSize);
  }
}

/**
 * Factory function to create CanvasAI instance
 *
 * @param operations - CanvasOperations service instance
 * @param canvasSize - Current canvas dimensions
 * @param stateUpdater - Optional state updater for local state management
 * @param currentColor - Optional current color for object creation
 * @param viewportInfo - Optional viewport information for positioning
 * @returns CanvasAI instance
 */
export function createCanvasAI(
  operations: CanvasOperations,
  canvasSize: CanvasSize,
  stateUpdater?: CanvasStateUpdater,
  currentColor?: string,
  viewportInfo?: { scale: number; position: { x: number; y: number } }
): CanvasAI {
  return new CanvasAI(
    operations,
    canvasSize,
    stateUpdater,
    currentColor,
    viewportInfo
  );
}

/**
 * Example usage:
 *
 * ```typescript
 * const ai = createCanvasAI(operations, { width: 800, height: 600 })
 *
 * const response = await ai.processMessage("Create a rectangle")
 * if (response.success) {
 *   console.log('AI response:', response.message)
 *   console.log('Object type:', response.objectType)
 * } else {
 *   console.error('AI error:', response.error)
 * }
 * ```
 */
