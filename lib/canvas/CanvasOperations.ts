/**
 * Canvas Operations Service
 *
 * This service class provides a clean abstraction layer for all canvas operations,
 * including object creation, manipulation, and z-index management. It separates
 * business logic from UI components and enables easy testing and AI integration.
 *
 * Key Features:
 * - Object CRUD operations (Create, Read, Update, Delete)
 * - Z-index layering system (bringToFront, sendToBack)
 * - Real-time synchronization via Supabase
 * - Ownership management and conflict prevention
 * - Batch operations for efficiency
 *
 * Architecture:
 * - Service layer pattern with dependency injection
 * - Database operations via Supabase client
 * - Real-time updates via RealtimeService interface
 * - Type-safe operations with full TypeScript support
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  CanvasObject,
  CreateObjectPayload,
  EllipseData,
  TriangleData,
} from "@/types/canvas";
import { User } from "@supabase/supabase-js";

/**
 * Interface for real-time synchronization service
 *
 * This interface abstracts the real-time communication layer,
 * allowing the service to broadcast changes to other clients.
 */
export interface RealtimeService {
  /** Broadcast object creation to other clients */
  broadcastObjectCreated: (
    object: CanvasObject,
    userId?: string,
    displayName?: string
  ) => Promise<void>;
  /** Broadcast object updates to other clients */
  broadcastObjectUpdated: (
    object: CanvasObject,
    userId?: string
  ) => Promise<void>;
  /** Broadcast object deletion to other clients */
  broadcastObjectDeleted: (objectId: string) => Promise<void>;
  /** Broadcast multiple object deletions to other clients */
  broadcastObjectsDeleted: (objectIds: string[]) => Promise<void>;
  /** Broadcast object duplication to other clients */
  broadcastObjectsDuplicated: (
    originalIds: string[],
    newObjects: CanvasObject[]
  ) => Promise<void>;
}

/**
 * Canvas Operations Service Class
 *
 * Provides centralized operations for canvas object management.
 * All operations are type-safe and include proper error handling.
 */
export class CanvasOperations {
  constructor(
    private supabase: SupabaseClient,
    private realtime: RealtimeService,
    private user: User,
    private canvasId: string
  ) {}

  /**
   * Get user display name for UI purposes
   *
   * @returns Promise<string> Display name or fallback to email
   */
  private async getDisplayName(): Promise<string> {
    try {
      const { data } = await this.supabase
        .from("profiles")
        .select("display_name")
        .eq("id", this.user.id)
        .single();

      return data?.display_name || this.user.email || "Anonymous";
    } catch {
      return this.user.email || "Anonymous";
    }
  }

  /**
   * Get the next available z-index for new objects
   *
   * @returns Promise<number> The next z-index value (highest existing + 1)
   */
  private async getNextZIndex(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from("canvas_objects")
        .select("z_index")
        .eq("canvas_id", this.canvasId)
        .order("z_index", { ascending: false })
        .limit(1);

      if (error) {
        console.error("❌ Error getting next z-index:", error);
        return 1; // Fallback to 1 if query fails
      }

      // If no objects exist, start with z-index 1
      if (!data || data.length === 0) {
        return 1;
      }

      // Return highest z-index + 1
      return (data[0].z_index || 0) + 1;
    } catch (error) {
      console.error("❌ Failed to get next z-index:", error);
      return 1;
    }
  }

  /**
   * Create a new rectangle on the canvas
   *
   * @param data - Rectangle creation data
   * @returns Promise<CanvasObject | null> The created rectangle or null if failed
   */
  async createRectangle(
    data: CreateObjectPayload
  ): Promise<CanvasObject | null> {
    if (!this.user) {
      console.error("❌ User not authenticated");
      return null;
    }

    try {
      console.log("📦 Creating rectangle:", data);

      // Get next z-index if not provided
      const zIndex = data.z_index || (await this.getNextZIndex());

      const objectData = {
        canvas_id: this.canvasId,
        type: "rectangle" as const,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        color: data.color || "#000000",
        rotation: data.rotation || 0,
        z_index: zIndex,
        owner: this.user.id, // Creator automatically owns the object
        created_by: this.user.id,
      };

      const { data: newObject, error } = await this.supabase
        .from("canvas_objects")
        .insert([objectData])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error creating rectangle:", error);
        return null;
      }

      console.log("✅ Rectangle created:", newObject);

      // Broadcast to other clients
      console.log("📡 About to broadcast rectangle creation:", newObject.id);
      console.log("📡 CanvasOperations user:", this.user?.id);
      await this.realtime.broadcastObjectCreated(
        newObject,
        this.user.id,
        await this.getDisplayName()
      );
      console.log("📡 Rectangle creation broadcast completed");

      return newObject;
    } catch (error) {
      console.error("❌ Failed to create rectangle:", error);
      return null;
    }
  }

  /**
   * Create a new triangle on the canvas
   *
   * @param data - Triangle creation data
   * @returns Promise<CanvasObject | null> The created triangle or null if failed
   */
  async createTriangle(data: TriangleData): Promise<CanvasObject | null> {
    if (!this.user) {
      console.error("❌ User not authenticated");
      return null;
    }

    try {
      console.log("🔺 Creating triangle:", data);

      // Get next z-index if not provided
      const zIndex = data.z_index || (await this.getNextZIndex());

      const objectData = {
        canvas_id: this.canvasId,
        type: "triangle" as const,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        color: data.color || "#000000",
        rotation: data.rotation || 0,
        z_index: zIndex,
        owner: this.user.id, // Creator automatically owns the object
        created_by: this.user.id,
      };

      const { data: newObject, error } = await this.supabase
        .from("canvas_objects")
        .insert([objectData])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error creating triangle:", error);
        return null;
      }

      console.log("✅ Triangle created:", newObject);

      // Broadcast to other clients
      console.log("📡 About to broadcast triangle creation:", newObject.id);
      console.log("📡 CanvasOperations user:", this.user?.id);
      await this.realtime.broadcastObjectCreated(
        newObject,
        this.user.id,
        await this.getDisplayName()
      );
      console.log("📡 Triangle creation broadcast completed");

      return newObject;
    } catch (error) {
      console.error("❌ Failed to create triangle:", error);
      return null;
    }
  }

  /**
   * Create a new ellipse on the canvas
   *
   * @param data - Ellipse creation data
   * @returns Promise<CanvasObject | null> The created ellipse or null if failed
   */
  async createEllipse(data: EllipseData): Promise<CanvasObject | null> {
    if (!this.user) {
      console.error("❌ User not authenticated");
      return null;
    }

    try {
      console.log("🔵 Creating ellipse:", data);

      // Get next z-index if not provided
      const zIndex = data.z_index || (await this.getNextZIndex());

      const objectData = {
        canvas_id: this.canvasId,
        type: "ellipse" as const,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        color: data.color || "#000000",
        rotation: data.rotation || 0,
        z_index: zIndex,
        owner: this.user.id, // Creator automatically owns the object
        created_by: this.user.id,
      };

      const { data: newObject, error } = await this.supabase
        .from("canvas_objects")
        .insert([objectData])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error creating ellipse:", error);
        return null;
      }

      console.log("✅ Ellipse created:", newObject);

      // Broadcast to other clients
      console.log("📡 About to broadcast ellipse creation:", newObject.id);
      console.log("📡 CanvasOperations user:", this.user?.id);
      await this.realtime.broadcastObjectCreated(
        newObject,
        this.user.id,
        await this.getDisplayName()
      );
      console.log("📡 Ellipse creation broadcast completed");

      return newObject;
    } catch (error) {
      console.error("❌ Failed to create ellipse:", error);
      return null;
    }
  }

  /**
   * Update object properties
   *
   * @param id - Object ID to update
   * @param updates - Partial object data to update
   * @returns Promise<CanvasObject | null> Updated object or null if failed
   */
  async updateObject(
    id: string,
    updates: Partial<CanvasObject>
  ): Promise<CanvasObject | null> {
    try {
      console.log(`📝 Updating object ${id}:`, updates);
      console.log(
        `📝 Updates data types:`,
        Object.entries(updates).map(
          ([key, value]) => `${key}: ${typeof value} = ${value}`
        )
      );

      const { data, error } = await this.supabase
        .from("canvas_objects")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error updating object:", error);
        console.error("❌ Error details:", JSON.stringify(error, null, 2));
        console.error("❌ Error type:", typeof error);
        console.error("❌ Error constructor:", error.constructor.name);
        console.error("❌ Error properties:", Object.getOwnPropertyNames(error));
        console.error("❌ Error message:", error.message);
        console.error("❌ Error code:", error.code);
        console.error("❌ Error hint:", error.hint);
        console.error("❌ Error details:", error.details);
        console.error(
          "❌ Updates that caused error:",
          JSON.stringify(updates, null, 2)
        );
        return null;
      }

      console.log("✅ Object updated:", data);

      // Broadcast to other clients
      console.log("📡 About to broadcast object update:", data.id);
      console.log("📡 CanvasOperations user:", this.user?.id);
      await this.realtime.broadcastObjectUpdated(data, this.user.id);
      console.log("📡 Object update broadcast completed");

      return data;
    } catch (error) {
      console.error("❌ Failed to update object:", error);
      console.error("❌ Exception details:", JSON.stringify(error, null, 2));
      return null;
    }
  }

  /**
   * Delete one or more objects
   *
   * @param objectIds - Array of object IDs to delete
   * @returns Promise<boolean> True if successful, false otherwise
   */
  async deleteObjects(objectIds: string[]): Promise<boolean> {
    if (!this.user || objectIds.length === 0) return false;

    try {
      console.log("🗑️ Deleting objects:", objectIds);

      const { error } = await this.supabase
        .from("canvas_objects")
        .delete()
        .in("id", objectIds);

      if (error) {
        console.error("❌ Error deleting objects:", error);
        return false;
      }

      console.log("✅ Objects deleted");

      // Broadcast to other clients
      if (objectIds.length === 1) {
        await this.realtime.broadcastObjectDeleted(objectIds[0]);
      } else {
        await this.realtime.broadcastObjectsDeleted(objectIds);
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to delete objects:", error);
      return false;
    }
  }

  /**
   * Duplicate selected objects with offset positioning
   *
   * @param objectIds - Array of object IDs to duplicate
   * @param existingObjects - Current objects array for reference
   * @returns Promise<CanvasObject[]> Array of duplicated objects
   */
  async duplicateObjects(
    objectIds: string[],
    existingObjects: CanvasObject[]
  ): Promise<CanvasObject[]> {
    if (!this.user || objectIds.length === 0) return [];

    try {
      console.log("📋 Duplicating objects:", objectIds);
      const objectsToDuplicate = existingObjects.filter((obj) =>
        objectIds.includes(obj.id)
      );

      // Get next z-index for all duplicated objects
      let nextZIndex = await this.getNextZIndex();

      const duplicatedObjects = objectsToDuplicate.map((obj) => ({
        canvas_id: this.canvasId,
        type: obj.type,
        x: obj.x + 20, // Offset by 20px
        y: obj.y + 20,
        width: obj.width,
        height: obj.height,
        color: obj.color,
        rotation: obj.rotation,
        z_index: nextZIndex++, // Assign sequential z-index values
        owner: this.user.id, // Duplicator automatically owns the new objects
        created_by: this.user.id,
      }));

      const { data, error } = await this.supabase
        .from("canvas_objects")
        .insert(duplicatedObjects)
        .select("*");

      if (error) {
        console.error("❌ Error duplicating objects:", error);
        return [];
      }

      console.log("✅ Objects duplicated:", data);

      // Broadcast to other clients
      await this.realtime.broadcastObjectsDuplicated(objectIds, data);

      return data;
    } catch (error) {
      console.error("❌ Failed to duplicate objects:", error);
      return [];
    }
  }

  /**
   * Move object by delta coordinates
   *
   * @param id - Object ID to move
   * @param deltaX - X-axis movement in pixels
   * @param deltaY - Y-axis movement in pixels
   * @returns Promise<CanvasObject | null> Updated object or null if failed
   */
  async moveObject(
    id: string,
    deltaX: number,
    deltaY: number
  ): Promise<CanvasObject | null> {
    const object = await this.getObject(id);
    if (!object) {
      console.error(`❌ Object ${id} not found`);
      return null;
    }

    return this.updateObject(id, {
      x: object.x + deltaX,
      y: object.y + deltaY,
    });
  }

  /**
   * Get single object by ID
   *
   * @param id - Object ID to retrieve
   * @returns Promise<CanvasObject | null> Object or null if not found
   */
  async getObject(id: string): Promise<CanvasObject | null> {
    try {
      const { data, error } = await this.supabase
        .from("canvas_objects")
        .select("*")
        .eq("id", id)
        .eq("canvas_id", this.canvasId)
        .single();

      if (error) {
        console.error("❌ Error getting object:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("❌ Failed to get object:", error);
      return null;
    }
  }

  /**
   * Get all objects on canvas ordered by z-index
   *
   * @returns Promise<CanvasObject[]> Array of all objects ordered by z-index (ascending)
   */
  async getAllObjects(): Promise<CanvasObject[]> {
    try {
      const { data, error } = await this.supabase
        .from("canvas_objects")
        .select("*")
        .eq("canvas_id", this.canvasId)
        .order("z_index", { ascending: true })
        .order("created_at", { ascending: true }); // Tiebreaker for same z-index

      if (error) {
        console.error("❌ Error loading objects:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("❌ Failed to load objects:", error);
      return [];
    }
  }

  /**
   * Create a random object with random properties
   *
   * @param canvasWidth - Canvas width for random positioning
   * @param canvasHeight - Canvas height for random positioning
   * @returns Promise<CanvasObject | null> Created random object or null if failed
   */
  async createRandomObject(
    canvasWidth: number,
    canvasHeight: number
  ): Promise<CanvasObject | null> {
    const types = ["rectangle", "ellipse", "triangle"];
    const colors = [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#ffff00",
      "#ff00ff",
      "#00ffff",
    ];

    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomX = Math.random() * (canvasWidth - 100);
    const randomY = Math.random() * (canvasHeight - 100);
    const randomWidth = 50 + Math.random() * 150;
    const randomHeight = 50 + Math.random() * 150;

    if (randomType === "rectangle") {
      return this.createRectangle({
        type: "rectangle",
        x: randomX,
        y: randomY,
        width: randomWidth,
        height: randomHeight,
        color: randomColor,
      });
    } else if (randomType === "ellipse") {
      return this.createEllipse({
        x: randomX,
        y: randomY,
        width: randomWidth,
        height: randomHeight,
        color: randomColor,
      });
    } else {
      return this.createTriangle({
        x: randomX,
        y: randomY,
        width: randomWidth,
        height: randomHeight,
        color: randomColor,
      });
    }
  }

  // ==================== Z-INDEX OPERATIONS ====================

  /**
   * Bring object(s) to the front (highest z-index)
   *
   * @param id - Object ID or array of object IDs to bring to front
   * @returns Promise<CanvasObject | null> Updated object or null if failed
   */
  async bringToFront(id: string | string[]): Promise<CanvasObject | null> {
    try {
      const ids = Array.isArray(id) ? id : [id];
      console.log(`🔝 Bringing objects to front:`, ids);

      // Get the next available z-index for the first object
      let nextZIndex = await this.getNextZIndex();

      // Update each object with sequential z-index values
      let lastUpdated: CanvasObject | null = null;
      for (let i = 0; i < ids.length; i++) {
        const objectZIndex = nextZIndex + i;
        console.log(
          `🔝 Bringing object ${ids[i]} to front with z-index ${objectZIndex}`
        );
        lastUpdated = await this.updateObject(ids[i], {
          z_index: objectZIndex,
        });
      }

      return lastUpdated;
    } catch (error) {
      console.error("❌ Failed to bring objects to front:", error);
      return null;
    }
  }

  /**
   * Send object to the back (lowest z-index)
   *
   * @param id - Object ID to send to back
   * @returns Promise<CanvasObject | null> Updated object or null if failed
   */
  async sendToBack(id: string): Promise<CanvasObject | null> {
    try {
      // Get the lowest z-index and subtract 1
      const { data, error } = await this.supabase
        .from("canvas_objects")
        .select("z_index")
        .eq("canvas_id", this.canvasId)
        .order("z_index", { ascending: true })
        .limit(1);

      if (error) {
        console.error("❌ Error getting lowest z-index:", error);
        return null;
      }

      const lowestZIndex = data && data.length > 0 ? data[0].z_index : 1;
      const newZIndex = Math.max(1, lowestZIndex - 1);

      console.log(`🔻 Sending object ${id} to back with z-index ${newZIndex}`);

      return this.updateObject(id, { z_index: newZIndex });
    } catch (error) {
      console.error("❌ Failed to send object to back:", error);
      return null;
    }
  }

  /**
   * Get z-index statistics for debugging
   *
   * @returns Promise<{min: number, max: number, count: number}> Z-index statistics
   */
  async getZIndexStats(): Promise<{ min: number; max: number; count: number }> {
    try {
      const { data, error } = await this.supabase
        .from("canvas_objects")
        .select("z_index")
        .eq("canvas_id", this.canvasId);

      if (error) {
        console.error("❌ Error getting z-index stats:", error);
        return { min: 0, max: 0, count: 0 };
      }

      if (!data || data.length === 0) {
        return { min: 0, max: 0, count: 0 };
      }

      const zIndexes = data.map((obj) => obj.z_index).filter((z) => z !== null);
      const min = Math.min(...zIndexes);
      const max = Math.max(...zIndexes);
      const count = zIndexes.length;

      return { min, max, count };
    } catch (error) {
      console.error("❌ Failed to get z-index stats:", error);
      return { min: 0, max: 0, count: 0 };
    }
  }

  /**
   * Get objects by IDs for AI operations
   *
   * @param objectIds - Array of object IDs to fetch
   * @returns Promise<CanvasObject[]> Array of objects
   */
  async getObjectsByIds(objectIds: string[]): Promise<CanvasObject[]> {
    try {
      if (objectIds.length === 0) return [];

      const { data, error } = await this.supabase
        .from("canvas_objects")
        .select("*")
        .eq("canvas_id", this.canvasId)
        .in("id", objectIds);

      if (error) {
        console.error("❌ Error fetching objects by IDs:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("❌ Failed to get objects by IDs:", error);
      return [];
    }
  }

  /**
   * Align objects based on specified criteria
   *
   * @param objectIds - Array of object IDs to align
   * @param alignType - Type of alignment (left, right, center, top, bottom, middle, distribute)
   * @param alignAxis - Axis for alignment (horizontal, vertical)
   * @returns Promise<boolean> True if successful, false otherwise
   */
  async alignObjects(
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
    if (!this.user || objectIds.length < 2) return false;

    try {
      console.log("📐 Aligning objects:", objectIds, "type:", alignType);

      // Get all objects to align
      const objects = await this.getObjectsByIds(objectIds);
      if (objects.length < 2) return false;

      // Determine axis if not provided
      if (!alignAxis) {
        if (["left", "right", "center"].includes(alignType)) {
          alignAxis = "vertical"; // left/right/center = same X coordinate = vertical line
        } else if (["top", "bottom", "middle"].includes(alignType)) {
          alignAxis = "horizontal"; // top/bottom/middle = same Y coordinate = horizontal line
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

      // Apply all updates in batch
      const updatePromises = updates.map(({ id, updates: objectUpdates }) =>
        this.updateObject(id, objectUpdates)
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter((result) => result !== null).length;

      console.log(
        `✅ Objects aligned successfully: ${successCount}/${updates.length} updated`
      );
      return successCount > 0;
    } catch (error) {
      console.error("❌ Failed to align objects:", error);
      return false;
    }
  }
}
