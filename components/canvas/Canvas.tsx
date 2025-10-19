"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import CanvasStage from "@/components/canvas/CanvasStage";
import Grid from "@/components/canvas/Grid";
import Rectangle from "@/components/canvas/Rectangle";
import Ellipse from "@/components/canvas/Ellipse";
import KonvaTransformer from "@/components/canvas/Transformer";
import Cursor from "@/components/canvas/Cursor";
import CursorPositionDisplay from "@/components/canvas/CursorPositionDisplay";
import { UserListModal } from "@/components/canvas/UserListModal";
import AIChat from "@/components/ai/AIChat";
import AIToggleButton from "@/components/ai/AIToggleButton";
import { useCanvas } from "@/hooks/useCanvas";
import { useOwnership } from "@/hooks/useOwnership";
import { useAuth } from "@/hooks/useAuth";
import { CanvasState } from "@/types/canvas";

interface CanvasProps {
  className?: string;
  currentTool: CanvasState["tool"];
  currentColor: string;
  onToolChange: (tool: CanvasState["tool"]) => void;
  onSelectedObjectsChange?: (objects: string[]) => void;
  onOperationsChange?: (operations: any) => void;
  onStateUpdaterChange?: (stateUpdater: any) => void;
}

export default function Canvas({
  className = "",
  currentTool,
  currentColor,
  onToolChange,
  onSelectedObjectsChange,
  onOperationsChange,
  onStateUpdaterChange,
}: CanvasProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [currentScale, setCurrentScale] = useState(1);
  const [currentStagePosition, setCurrentStagePosition] = useState({
    x: 0,
    y: 0,
  });
  const lastLoggedDimensionsRef = useRef({ width: 0, height: 0 });
  const [isCreatingRect, setIsCreatingRect] = useState(false);
  const [creatingRect, setCreatingRect] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isCreatingEllipse, setIsCreatingEllipse] = useState(false);
  const [creatingEllipse, setCreatingEllipse] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isHoveringObject, setIsHoveringObject] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
  const [currentCursorPosition, setCurrentCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // AI Chat state
  const [isAIChatVisible, setIsAIChatVisible] = useState(false);

  // Other users' cursor positions
  const [otherCursors, setOtherCursors] = useState<
    Map<
      string,
      {
        userId: string;
        displayName: string;
        position: { x: number; y: number };
        lastSeen: number;
        color: string;
      }
    >
  >(new Map());

  // Handle stage position changes
  const handleStagePositionChange = useCallback(
    (position: { x: number; y: number }) => {
      setCurrentStagePosition(position);
    },
    []
  );
  const getUserColor = useCallback((userId: string) => {
    const colors = [
      "#ef4444",
      "#f97316",
      "#eab308",
      "#22c55e",
      "#06b6d4",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
      "#f43f5e",
      "#84cc16",
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Memoize ownership callbacks to prevent infinite re-renders
  const onOwnershipClaimed = useCallback((event: any) => {
    console.log(
      `🏷️ Ownership claimed: ${event.object_id} by ${event.owner_name}`
    );
  }, []);

  const onOwnershipReleased = useCallback((event: any) => {
    console.log(`🏷️ Ownership released: ${event.object_id}`);
  }, []);

  const onOwnershipRejected = useCallback((event: any) => {
    console.log(
      `🏷️ Ownership rejected: ${event.object_id} (claimed by ${event.current_owner_name})`
    );
  }, []);

  // Create a ref for the ownership expired callback that will be set later
  const onOwnershipExpiredRef = useRef<((event: any) => void) | null>(null);

  // Initialize ownership system first
  const ownership = useOwnership({
    canvasId: "default",
    onOwnershipClaimed,
    onOwnershipReleased,
    onOwnershipRejected,
    onOwnershipExpired: (event: any) => onOwnershipExpiredRef.current?.(event),
  });
  const handleCursorUpdates = useCallback(
    (
      updates: Array<{
        userId: string;
        displayName: string;
        position: { x: number; y: number };
        timestamp: string;
      }>
    ) => {
      // Cursor updates processed silently

      setOtherCursors((prev) => {
        const updated = new Map(prev);

        updates.forEach((update) => {
          updated.set(update.userId, {
            userId: update.userId,
            displayName: update.displayName,
            position: update.position,
            lastSeen: Date.now(),
            color: getUserColor(update.userId),
          });
        });

        return updated;
      });
    },
    [user?.id, getUserColor]
  );

  // Memoize the ownership handler to prevent useCanvas re-initialization
  const ownershipHandler = useCallback(
    (payload: any) => {
      // Handle ownership updates
      ownership.handleCanvasObjectUpdate(payload);

      // Auto-deselect objects that become owned by someone else
      const { new: newRecord, old: oldRecord } = payload;
      if (newRecord?.id && newRecord.owner !== oldRecord?.owner) {
        const objectId = newRecord.id;
        const newOwner = newRecord.owner;

        // If object is now owned by someone else (not 'all' and not current user)
        if (newOwner !== "all" && newOwner !== user?.id) {
          // We'll handle the deselection in a separate effect to avoid dependency issues
          console.log(
            `🚫 Object ${objectId} now owned by someone else - will deselect`
          );
        }
      }
    },
    [ownership, user?.id]
  );

  const {
    state,
    createRectangle,
    createEllipse,
    updateObject,
    deleteObjects,
    duplicateObjects,
    selectObjects,
    setTool,
    setColor,
    realtime,
    operations,
    addObjectToState,
  } = useCanvas(
    "default",
    ownershipHandler,
    ownership.handleNewObjectCreated,
    handleCursorUpdates
  );

  // Create state updater for AI - include operations in dependencies
  const stateUpdater = useMemo(
    () => ({
      addObject: (object: any) => {
        console.log(
          "🎨 State updater adding object to local state:",
          object.id
        );
        addObjectToState(object);
      },
      updateObject: async (id: string, updates: any) => {
        console.log("🔧 State updater updating object:", id, updates);
        if (!operations) {
          console.error("❌ Operations not available in stateUpdater");
          return null;
        }
        await updateObject(id, updates);
        // Return the updated object from the operations service
        return await operations.getObject(id);
      },
      initializeOwnership: async (
        object: any,
        userId: string,
        displayName?: string
      ) => {
        console.log("🏷️ State updater initializing ownership:", object.id);
        if (ownership.handleNewObjectCreated) {
          await ownership.handleNewObjectCreated(object, userId, displayName);
        }
      },
      claimObject: async (objectId: string) => {
        console.log("🏷️ State updater claiming object:", objectId);
        return await ownership.claimObject(objectId);
      },
    }),
    [operations, addObjectToState, updateObject, ownership]
  );

  // Memoize viewport info for AI
  const viewportInfo = useMemo(
    () => ({
      scale: currentScale,
      position: currentStagePosition,
    }),
    [currentScale, currentStagePosition]
  );

  // Notify parent component when selected objects change
  useEffect(() => {
    onSelectedObjectsChange?.(state.selectedObjects);
  }, [state.selectedObjects, onSelectedObjectsChange]);

  // Handle ownership expiry by clearing selection
  const onOwnershipExpired = useCallback(
    (event: any) => {
      console.log(`⏰ Ownership expired for object: ${event.object_id}`);
      // Clear selection for the expired object
      const currentSelection = state.selectedObjects;
      const newSelection = currentSelection.filter(
        (id: string) => id !== event.object_id
      );
      if (newSelection.length !== currentSelection.length) {
        selectObjects(newSelection);
        console.log(
          `🎯 Cleared selection for expired object: ${event.object_id}`
        );
      }
    },
    [state.selectedObjects, selectObjects]
  );

  // Set the ref so the ownership hook can call it
  useEffect(() => {
    onOwnershipExpiredRef.current = onOwnershipExpired;
  }, [onOwnershipExpired]);

  // Wrapper for updateObject that also extends ownership
  const handleObjectTransform = useCallback(
    async (id: string, updates: any) => {
      console.log(
        "🔄 handleObjectTransform called for:",
        id,
        "with updates:",
        updates
      );
      // Update the object
      await updateObject(id, updates);

      // Extend ownership after transform (resize/rotate)
      ownership.extendOwnership(id);
    },
    [updateObject, ownership]
  );

  // Sync tool and color state
  useEffect(() => {
    setTool(currentTool);
  }, [currentTool, setTool]);

  // Sync color changes from parent to internal state
  useEffect(() => {
    if (currentColor !== state.currentColor) {
      setColor(currentColor);
    }
  }, [currentColor, state.currentColor, setColor]);

  // Update canvas dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.floor(rect.width);
        const newHeight = Math.floor(rect.height);

        // Only update if dimensions actually changed (prevent feedback loops)
        setDimensions((prev) => {
          if (
            Math.abs(prev.width - newWidth) > 10 ||
            Math.abs(prev.height - newHeight) > 10
          ) {
            // Only log if we haven't logged these exact dimensions before
            if (
              lastLoggedDimensionsRef.current.width !== newWidth ||
              lastLoggedDimensionsRef.current.height !== newHeight
            ) {
              console.log(
                `📐 Canvas dimensions updated: ${newWidth}x${newHeight} (was ${prev.width}x${prev.height})`
              );
              lastLoggedDimensionsRef.current = {
                width: newWidth,
                height: newHeight,
              };
            }
            return {
              width: newWidth,
              height: newHeight,
            };
          }
          return prev;
        });
      }
    };

    // Initial size
    updateDimensions();

    // Use window resize instead of ResizeObserver to avoid feedback loops
    const handleWindowResize = () => {
      updateDimensions();
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  // Pass operations from useCanvas to parent component
  useEffect(() => {
    if (operations && onOperationsChange) {
      onOperationsChange(operations);
    }
  }, [operations, onOperationsChange]);

  // Pass stateUpdater to parent component - only when operations is available
  useEffect(() => {
    if (operations && onStateUpdaterChange) {
      onStateUpdaterChange(stateUpdater);
    }
  }, [operations, onStateUpdaterChange]);

  // Handle mouse down to start rectangle/ellipse creation
  const handleMouseDown = useCallback(
    (e: any) => {
      // Only handle clicks on the stage itself (not on shapes)
      const clickedOnEmpty = e.target === e.target.getStage();

      if (
        !clickedOnEmpty ||
        (currentTool !== "rectangle" && currentTool !== "ellipse")
      ) {
        return;
      }

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();

      if (pointerPos) {
        // Convert screen coordinates to stage coordinates
        const stagePos = {
          x: (pointerPos.x - stage.x()) / stage.scaleX(),
          y: (pointerPos.y - stage.y()) / stage.scaleY(),
        };

        if (currentTool === "rectangle") {
          console.log(
            "🚀 Starting rectangle creation at stage coords:",
            stagePos
          );
          setIsCreatingRect(true);
          setIsDragging(false); // Reset drag state
          setCreatingRect({
            startX: stagePos.x,
            startY: stagePos.y,
            endX: stagePos.x,
            endY: stagePos.y,
          });
        } else if (currentTool === "ellipse") {
          console.log(
            "🔵 Starting ellipse creation at stage coords:",
            stagePos
          );
          setIsCreatingEllipse(true);
          setIsDragging(false); // Reset drag state
          setCreatingEllipse({
            startX: stagePos.x,
            startY: stagePos.y,
            endX: stagePos.x,
            endY: stagePos.y,
          });
        }
      }
    },
    [currentTool]
  );

  // Handle canvas click for rectangle creation
  const handleCanvasClick = useCallback(
    async (e: any) => {
      // Only handle clicks on the stage itself (not on shapes)
      const clickedOnEmpty = e.target === e.target.getStage();

      if (!clickedOnEmpty) {
        return;
      }

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      const isShiftClick = e.evt?.shiftKey || false;

      if (currentTool === "select") {
        // Deselect all when clicking empty space
        selectObjects([]);

        // Release ownership of all objects when clicking empty space (unless shift is held)
        if (!isShiftClick) {
          console.log("🏷️ Releasing all ownership due to empty space click");
          ownership.releaseAllObjects();
        }
      }
    },
    [currentTool, selectObjects, ownership]
  );

  // Handle mouse move during rectangle creation and cursor updates
  const handleMouseMove = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();

      // Track cursor position for multiplayer cursors (no throttling - rely on batching)
      if (pointerPos) {
        // Convert screen coordinates to stage coordinates for consistent positioning
        const stagePos = {
          x: (pointerPos.x - stage.x()) / stage.scaleX(),
          y: (pointerPos.y - stage.y()) / stage.scaleY(),
        };

        // Update current cursor position for display
        setCurrentCursorPosition(stagePos);

        // Broadcast cursor position immediately - batching will handle the frequency
        realtime.broadcastCursorMoved(stagePos);
        // Cursor position updates processed silently
      }

      // Handle rectangle creation
      if (isCreatingRect && creatingRect) {
        if (pointerPos) {
          // Convert screen coordinates to stage coordinates
          const stagePos = {
            x: (pointerPos.x - stage.x()) / stage.scaleX(),
            y: (pointerPos.y - stage.y()) / stage.scaleY(),
          };

          setCreatingRect((prev) =>
            prev
              ? {
                  ...prev,
                  endX: stagePos.x,
                  endY: stagePos.y,
                }
              : null
          );
        }
      }

      // Handle ellipse creation
      if (isCreatingEllipse && creatingEllipse) {
        if (pointerPos) {
          // Convert screen coordinates to stage coordinates
          const stagePos = {
            x: (pointerPos.x - stage.x()) / stage.scaleX(),
            y: (pointerPos.y - stage.y()) / stage.scaleY(),
          };

          setCreatingEllipse((prev) =>
            prev
              ? {
                  ...prev,
                  endX: stagePos.x,
                  endY: stagePos.y,
                }
              : null
          );
        }
      }

      // Update cursor state for select tool
      if (currentTool === "select") {
        const target = e.target;
        const isOverObject = target !== target.getStage();
        setIsHoveringObject(isOverObject);
      }
    },
    [
      isCreatingRect,
      creatingRect,
      isCreatingEllipse,
      creatingEllipse,
      currentTool,
      realtime,
    ]
  );

  // Handle mouse up to finish rectangle/ellipse creation
  const handleMouseUp = useCallback(
    async (e: any) => {
      if (isCreatingRect && creatingRect) {
        const stage = e.target.getStage();
        const pointerPos = stage.getPointerPosition();

        if (pointerPos) {
          // Convert screen coordinates to stage coordinates
          const stagePos = {
            x: (pointerPos.x - stage.x()) / stage.scaleX(),
            y: (pointerPos.y - stage.y()) / stage.scaleY(),
          };

          // Calculate L1 distance
          const l1Distance =
            Math.abs(stagePos.x - creatingRect.startX) +
            Math.abs(stagePos.y - creatingRect.startY);

          // Calculate viewport diagonal (using stage dimensions)
          const stageWidth = stage.width();
          const stageHeight = stage.height();
          const viewportDiagonal = Math.sqrt(
            stageWidth * stageWidth + stageHeight * stageHeight
          );
          const threshold = viewportDiagonal * 0.02;

          console.log(
            `📏 L1 distance: ${l1Distance.toFixed(
              2
            )}, threshold: ${threshold.toFixed(2)}`
          );

          // Only create rectangle if distance is above threshold
          if (l1Distance >= threshold) {
            const width = Math.abs(stagePos.x - creatingRect.startX);
            const height = Math.abs(stagePos.y - creatingRect.startY);
            const x = Math.min(creatingRect.startX, stagePos.x);
            const y = Math.min(creatingRect.startY, stagePos.y);

            await createRectangle({
              type: "rectangle",
              x,
              y,
              width,
              height,
              color: state.currentColor,
            });

            console.log("✅ Rectangle created!");
          } else {
            console.log("❌ Rectangle creation cancelled - distance too small");
          }
        }

        setIsCreatingRect(false);
        setCreatingRect(null);
        setIsDragging(false);
        onToolChange("select"); // Switch back to select tool
      } else if (isCreatingEllipse && creatingEllipse) {
        const stage = e.target.getStage();
        const pointerPos = stage.getPointerPosition();

        if (pointerPos) {
          // Convert screen coordinates to stage coordinates
          const stagePos = {
            x: (pointerPos.x - stage.x()) / stage.scaleX(),
            y: (pointerPos.y - stage.y()) / stage.scaleY(),
          };

          // Calculate L1 distance
          const l1Distance =
            Math.abs(stagePos.x - creatingEllipse.startX) +
            Math.abs(stagePos.y - creatingEllipse.startY);

          // Calculate viewport diagonal (using stage dimensions)
          const stageWidth = stage.width();
          const stageHeight = stage.height();
          const viewportDiagonal = Math.sqrt(
            stageWidth * stageWidth + stageHeight * stageHeight
          );
          const threshold = viewportDiagonal * 0.02;

          console.log(
            `📏 L1 distance: ${l1Distance.toFixed(
              2
            )}, threshold: ${threshold.toFixed(2)}`
          );

          // Only create ellipse if distance is above threshold
          if (l1Distance >= threshold) {
            const width = Math.abs(stagePos.x - creatingEllipse.startX);
            const height = Math.abs(stagePos.y - creatingEllipse.startY);
            const x = Math.min(creatingEllipse.startX, stagePos.x);
            const y = Math.min(creatingEllipse.startY, stagePos.y);

            await createEllipse({
              x,
              y,
              width,
              height,
              color: state.currentColor,
            });

            console.log("✅ Ellipse created!");
          } else {
            console.log("❌ Ellipse creation cancelled - distance too small");
          }
        }

        setIsCreatingEllipse(false);
        setCreatingEllipse(null);
        setIsDragging(false);
        onToolChange("select"); // Switch back to select tool
      }
    },
    [
      isCreatingRect,
      creatingRect,
      isCreatingEllipse,
      creatingEllipse,
      createRectangle,
      createEllipse,
      onToolChange,
      state.currentColor,
    ]
  );

  // Handle object selection (with multi-select support)
  const handleObjectSelect = useCallback(
    (objectId: string, event?: any) => {
      if (currentTool === "select") {
        // Check if we can edit/select this object
        const canSelectObject = ownership.canEdit(objectId);

        if (!canSelectObject) {
          console.log(
            `🚫 Cannot select object ${objectId}: owned by someone else`
          );
          return;
        }

        const isShiftClick = event?.evt?.shiftKey || false;

        // Release ownership of all other objects unless shift is held
        if (!isShiftClick) {
          console.log(
            `🏷️ Releasing ownership of all objects except: ${objectId}`
          );
          ownership.releaseAllExcept(objectId);
        }

        if (isShiftClick) {
          // Multi-select: add/remove from selection
          const currentSelection = state.selectedObjects;
          if (currentSelection.includes(objectId)) {
            // Remove from selection
            const newSelection = currentSelection.filter(
              (id) => id !== objectId
            );
            selectObjects(newSelection);
            console.log(`🎯 Removed from selection: ${objectId}`);
          } else {
            // Add to selection
            const newSelection = [...currentSelection, objectId];
            selectObjects(newSelection);
            console.log(`🎯 Added to selection: ${objectId}`);
          }
        } else {
          // Single select: replace selection
          selectObjects([objectId]);
          console.log(`🎯 Single selected: ${objectId}`);
        }
      }
    },
    [currentTool, selectObjects, state.selectedObjects, ownership]
  );

  // Store refs for keyboard shortcuts to avoid stale closures without causing re-renders
  const keyboardShortcutsRef = useRef({
    deleteObjects,
    duplicateObjects,
    selectObjects,
    ownership,
    isCreatingRect,
    setIsCreatingRect,
    setCreatingRect,
    setIsDragging,
    onToolChange,
    isCreatingEllipse,
    setIsCreatingEllipse,
    setCreatingEllipse,
    selectedObjects: state.selectedObjects,
  });

  // Update refs when values change
  useEffect(() => {
    keyboardShortcutsRef.current = {
      deleteObjects,
      duplicateObjects,
      selectObjects,
      ownership,
      isCreatingRect,
      setIsCreatingRect,
      setCreatingRect,
      setIsDragging,
      onToolChange,
      isCreatingEllipse,
      setIsCreatingEllipse,
      setCreatingEllipse,
      selectedObjects: state.selectedObjects,
    };
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when no input is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const {
        deleteObjects,
        duplicateObjects,
        selectObjects,
        ownership,
        isCreatingRect,
        setIsCreatingRect,
        setCreatingRect,
        setIsDragging,
        onToolChange,
        isCreatingEllipse,
        setIsCreatingEllipse,
        setCreatingEllipse,
        selectedObjects,
      } = keyboardShortcutsRef.current;

      if (e.key === "Delete" || e.key === "Backspace") {
        // Delete selected objects
        if (selectedObjects.length > 0) {
          e.preventDefault();
          deleteObjects(selectedObjects);
          console.log("⌫ Deleted selected objects");
        }
      } else if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        // Duplicate selected objects (Ctrl/Cmd + D)
        if (selectedObjects.length > 0) {
          e.preventDefault();
          duplicateObjects(selectedObjects);
          console.log("📋 Duplicated selected objects");
        }
      } else if (e.key === "Escape") {
        e.preventDefault();

        // Cancel rectangle creation if in progress
        if (isCreatingRect) {
          setIsCreatingRect(false);
          setCreatingRect(null);
          setIsDragging(false);
          onToolChange("select");
          console.log("🚫 Cancelled rectangle creation");
        } else if (isCreatingEllipse) {
          setIsCreatingEllipse(false);
          setCreatingEllipse(null);
          setIsDragging(false);
          onToolChange("select");
          console.log("🚫 Cancelled ellipse creation");
        } else {
          // Deselect all and release ownership
          selectObjects([]);
          ownership.releaseAllObjects();
          console.log("🚫 Deselected all objects and released ownership");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // Empty deps - handler uses refs to access current values

  // Cleanup stale cursors (remove cursors that haven't been seen for 10 seconds - more lenient for batching)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setOtherCursors((prev) => {
        const updated = new Map(prev);
        let hasChanges = false;

        for (const [userId, cursor] of updated.entries()) {
          if (now - cursor.lastSeen > 10000) {
            // 10 seconds timeout - more lenient for batching
            updated.delete(userId);
            hasChanges = true;
          }
        }

        return hasChanges ? new Map(updated) : prev;
      });
    }, 3000); // Check every 3 seconds - optimized for 60fps batching

    return () => clearInterval(cleanupInterval);
  }, []);

  // Virtual canvas size (larger than viewport for infinite canvas feel)
  const virtualCanvasSize = {
    width: 5000,
    height: 5000,
  };

  // Calculate rectangle dimensions for preview during creation
  const previewRect = creatingRect
    ? {
        x: Math.min(creatingRect.startX, creatingRect.endX),
        y: Math.min(creatingRect.startY, creatingRect.endY),
        width: Math.abs(creatingRect.endX - creatingRect.startX),
        height: Math.abs(creatingRect.endY - creatingRect.startY),
      }
    : null;

  // Calculate ellipse dimensions for preview during creation
  const previewEllipse = creatingEllipse
    ? {
        x: Math.min(creatingEllipse.startX, creatingEllipse.endX),
        y: Math.min(creatingEllipse.startY, creatingEllipse.endY),
        width: Math.abs(creatingEllipse.endX - creatingEllipse.startX),
        height: Math.abs(creatingEllipse.endY - creatingEllipse.startY),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full max-w-full max-h-full overflow-hidden relative ${className}`}
      style={{ minHeight: "600px" }}
    >
      {/* Realtime Status Indicator */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-lg">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              realtime.connectionStatus === "connected" && ownership.isConnected
                ? "bg-green-500"
                : realtime.connectionStatus === "connecting" ||
                  realtime.connectionStatus === "reconnecting"
                ? "bg-yellow-500 animate-pulse"
                : realtime.connectionStatus === "error"
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
          />
          <span
            className={`${
              realtime.connectionStatus === "connected" && ownership.isConnected
                ? "text-green-700"
                : realtime.connectionStatus === "connecting" ||
                  realtime.connectionStatus === "reconnecting"
                ? "text-yellow-700"
                : realtime.connectionStatus === "error"
                ? "text-red-700"
                : "text-gray-700"
            }`}
          >
            {realtime.connectionStatus === "connected" && ownership.isConnected
              ? "Connected"
              : realtime.connectionStatus === "connecting"
              ? "Connecting..."
              : realtime.connectionStatus === "reconnecting"
              ? "Reconnecting..."
              : realtime.connectionStatus === "error"
              ? "Connection Error"
              : "Disconnected"}
          </span>
          {realtime.onlineUsers.length > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => setIsUserListModalOpen(true)}
                className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                {realtime.onlineUsers.length} online
              </button>
            </>
          )}
          {ownership.pendingClaims.size > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-yellow-600">
                {ownership.pendingClaims.size} claiming
              </span>
            </>
          )}
        </div>
        {(realtime.error || !ownership.isConnected) && (
          <div className="text-xs text-red-600 mt-1">
            {realtime.error || "Ownership system disconnected"}
          </div>
        )}
      </div>
      <CanvasStage
        width={dimensions.width}
        height={dimensions.height}
        onScaleChange={setCurrentScale}
        onPositionChange={handleStagePositionChange}
        onStageClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsHoveringObject(false);
          setCurrentCursorPosition(null);
        }}
        cursor={
          currentTool === "rectangle"
            ? "crosshair"
            : currentTool === "ellipse"
            ? "crosshair"
            : currentTool === "select" && isHoveringObject
            ? "pointer"
            : "default"
        }
        draggable={!isCreatingRect && !isCreatingEllipse}
      >
        <Grid
          width={dimensions.width}
          height={dimensions.height}
          gridSize={20}
          stroke="#d1d5db"
          strokeWidth={0.5}
          stageX={currentStagePosition.x}
          stageY={currentStagePosition.y}
          stageScale={currentScale}
        />

        {/* Render existing objects */}
        {state.objects.map((object) => {
          const isSelected = state.selectedObjects.includes(object.id);
          const ownershipStatus = ownership.getOwnershipStatus(object.id);
          const ownerInfo = ownership.getOwnerInfo(object.id);
          const isPendingClaim = ownership.pendingClaims.has(object.id);

          // Handle different object types
          if (object.type === "rectangle") {
            return (
              <Rectangle
                key={object.id}
                object={object}
                isSelected={isSelected}
                onSelect={handleObjectSelect}
                onMove={updateObject}
                ownershipStatus={ownershipStatus}
                ownerInfo={ownerInfo}
                isPendingClaim={isPendingClaim}
                onClaimAttempt={ownership.claimObject}
                onOwnershipExtend={ownership.extendOwnership}
              />
            );
          } else if (object.type === "ellipse") {
            return (
              <Ellipse
                key={object.id}
                object={object}
                isSelected={isSelected}
                onSelect={handleObjectSelect}
                onMove={updateObject}
                ownershipStatus={ownershipStatus}
                ownerInfo={ownerInfo}
                isPendingClaim={isPendingClaim}
                onClaimAttempt={ownership.claimObject}
                onOwnershipExtend={ownership.extendOwnership}
              />
            );
          } else {
            console.warn(`⚠️ Unknown object type: ${object.type}`);
            return null;
          }
        })}

        {/* Transformer for selected objects */}
        <KonvaTransformer
          selectedIds={state.selectedObjects}
          onTransform={handleObjectTransform}
        />

        {/* Other users' cursors */}
        {Array.from(otherCursors.values()).map((cursor) => (
          <Cursor
            key={cursor.userId}
            displayName={cursor.displayName}
            position={cursor.position}
            color={cursor.color}
          />
        ))}

        {/* Preview rectangle during creation */}
        {previewRect && previewRect.width > 0 && previewRect.height > 0 && (
          <Rectangle
            object={{
              id: "preview",
              canvas_id: "default",
              type: "rectangle",
              x: previewRect.x,
              y: previewRect.y,
              width: previewRect.width,
              height: previewRect.height,
              color: state.currentColor,
              rotation: 0,
              z_index: 999999, // High z-index for preview objects
              owner: "all",
              created_by: null,
              created_at: "",
              updated_at: "",
            }}
            isSelected={false}
          />
        )}

        {/* Preview ellipse during creation */}
        {previewEllipse &&
          previewEllipse.width > 0 &&
          previewEllipse.height > 0 && (
            <Ellipse
              object={{
                id: "preview-ellipse",
                canvas_id: "default",
                type: "ellipse",
                x: previewEllipse.x,
                y: previewEllipse.y,
                width: previewEllipse.width,
                height: previewEllipse.height,
                color: state.currentColor,
                rotation: 0,
                z_index: 999999, // High z-index for preview objects
                owner: "all",
                created_by: null,
                created_at: "",
                updated_at: "",
              }}
              isSelected={false}
              ownershipStatus="available"
            />
          )}
      </CanvasStage>

      {/* User List Modal */}
      <UserListModal
        isOpen={isUserListModalOpen}
        onClose={() => setIsUserListModalOpen(false)}
        onlineUsers={realtime.onlineUsers}
      />

      {/* Cursor Position Display */}
      <CursorPositionDisplay position={currentCursorPosition} />

      {/* AI Chat */}
      {operations && (
        <AIChat
          operations={operations}
          canvasSize={dimensions}
          isVisible={isAIChatVisible}
          onVisibilityChange={setIsAIChatVisible}
          stateUpdater={stateUpdater}
          currentColor={currentColor}
          viewportInfo={viewportInfo}
          selectedObjects={state.selectedObjects}
        />
      )}

      {/* AI Toggle Button */}
      <AIToggleButton
        isVisible={isAIChatVisible}
        onToggle={() => setIsAIChatVisible(!isAIChatVisible)}
        isReady={!!operations}
      />
    </div>
  );
}
