"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  OwnershipState,
  OwnershipEvents,
  OWNERSHIP_CONFIG,
  OwnershipStatus,
} from "@/types/ownership";

interface UseOwnershipProps {
  canvasId: string;
  onOwnershipClaimed?: (event: OwnershipEvents["ownership_claimed"]) => void;
  onOwnershipReleased?: (event: OwnershipEvents["ownership_released"]) => void;
  onOwnershipRejected?: (event: OwnershipEvents["ownership_rejected"]) => void;
  onOwnershipExpired?: (event: OwnershipEvents["ownership_expired"]) => void;
}

export function useOwnership({
  canvasId,
  onOwnershipClaimed,
  onOwnershipReleased,
  onOwnershipRejected,
  onOwnershipExpired,
}: UseOwnershipProps) {
  const { user, profile } = useAuth();
  const [ownershipState, setOwnershipState] = useState<OwnershipState>({});

  // Track pending claims to show loading states
  const pendingClaimsRef = useRef<Set<string>>(new Set());
  const [pendingClaims, setPendingClaims] = useState<Set<string>>(new Set());

  // Cleanup timers
  const cleanupTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Pending claim timeout timers (10-second timeout to prevent stuck claims)
  const pendingClaimTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(
    new Map()
  );

  // Prevent multiple initializations
  const initializedRef = useRef(false);

  // Helper function to clean up pending claims
  const cleanupPendingClaim = useCallback(
    (objectId: string, reason: string = "timeout") => {
      console.log(`🧹 Cleaning up pending claim for ${objectId} (${reason})`);

      // Remove from pending claims
      pendingClaimsRef.current.delete(objectId);
      setPendingClaims(new Set(pendingClaimsRef.current));

      // Clear timeout timer
      const timeoutId = pendingClaimTimeoutsRef.current.get(objectId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        pendingClaimTimeoutsRef.current.delete(objectId);
      }
    },
    []
  );

  // Get ownership status for an object
  const getOwnershipStatus = useCallback(
    (objectId: string): OwnershipStatus => {
      const ownership = ownershipState[objectId];
      if (!ownership || !ownership.owner_id) return "available";

      if (ownership.is_claimed_by_me) return "claimed_by_me";

      // Check if expired
      if (ownership.expires_at && new Date(ownership.expires_at) < new Date()) {
        return "expired";
      }

      return "claimed";
    },
    [ownershipState]
  );

  // Check if current user can edit an object
  const canEdit = useCallback(
    (objectId: string): boolean => {
      const status = getOwnershipStatus(objectId);
      return (
        status === "available" ||
        status === "claimed_by_me" ||
        status === "expired"
      );
    },
    [getOwnershipStatus]
  );

  // Check if an object is claimed by someone else
  const isClaimedByOther = useCallback(
    (objectId: string): boolean => {
      const status = getOwnershipStatus(objectId);
      return status === "claimed";
    },
    [getOwnershipStatus]
  );

  // Get owner info for an object
  const getOwnerInfo = useCallback(
    (objectId: string) => {
      return ownershipState[objectId] || null;
    },
    [ownershipState]
  );

  // Initialize ownership state from existing canvas objects
  useEffect(() => {
    if (!user || initializedRef.current) return;

    initializedRef.current = true;
    const initializeOwnership = async () => {
      console.log("🏷️ Initializing ownership state from existing objects");
      const { data: objects, error } = await supabase
        .from("canvas_objects")
        .select("id, owner");

      if (error) {
        console.error("❌ Error loading canvas objects for ownership:", error);
        return;
      }

      const initialState: OwnershipState = {};

      // Get all unique owner IDs that aren't 'all'
      const ownerIds = [
        ...new Set(
          objects?.map((obj) => obj.owner).filter((owner) => owner !== "all")
        ),
      ];

      // Fetch owner names if there are any claims
      let ownerProfiles: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", ownerIds);

        profiles?.forEach((profile) => {
          ownerProfiles[profile.id] = profile.display_name;
        });
      }

      objects?.forEach((obj) => {
        if (obj.owner !== "all") {
          const isMyObject = obj.owner === user.id;
          initialState[obj.id] = {
            owner_id: obj.owner,
            owner_name: isMyObject
              ? profile?.display_name || "You"
              : ownerProfiles[obj.owner] || "Unknown User",
            claimed_at: new Date().toISOString(), // Approximate
            expires_at: new Date(
              Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS
            ).toISOString(),
            is_claimed_by_me: isMyObject,
          };
        }
      });

      console.log(
        `🏷️ Initialized ownership state for ${
          Object.keys(initialState).length
        } objects`
      );
      setOwnershipState(initialState);
    };

    initializeOwnership();
  }, [user, profile]);

  // Claim an object (simple owner field approach)
  const claimObject = useCallback(
    async (objectId: string): Promise<boolean> => {
      if (!user || !profile) {
        console.warn("Cannot claim object: user not authenticated");
        return false;
      }

      // Check if already claimed by me
      if (getOwnershipStatus(objectId) === "claimed_by_me") {
        console.log(`🏷️ Object ${objectId} already claimed by me`);
        return true;
      }

      // Add to pending claims (for visual feedback)
      pendingClaimsRef.current.add(objectId);
      setPendingClaims(new Set(pendingClaimsRef.current));

      // Set up 10-second timeout to prevent stuck claims
      const timeoutId = setTimeout(() => {
        console.warn(
          `⏰ Claim timeout for object ${objectId} - cleaning up pending state`
        );
        cleanupPendingClaim(objectId, "timeout");
      }, 10000); // 10 seconds

      pendingClaimTimeoutsRef.current.set(objectId, timeoutId);

      try {
        console.log(`🏷️ Attempting to claim object: ${objectId}`);
        console.log(
          `🔍 Current user: ${user.id}, profile: ${profile.display_name}`
        );

        // First, check the current state of the object
        const { data: currentObj, error: fetchError } = await supabase
          .from("canvas_objects")
          .select("owner, created_by")
          .eq("id", objectId)
          .single();

        if (fetchError) {
          console.error("❌ Error fetching object for claim:", fetchError);
          return false;
        }

        console.log(
          `🔍 Object ${objectId} current state: owner=${currentObj.owner}, created_by=${currentObj.created_by}`
        );

        // Atomically claim object if available (owner = 'all')
        const { data, error } = await supabase
          .from("canvas_objects")
          .update({
            owner: user.id,
          })
          .eq("id", objectId)
          .eq("owner", "all") // Only claim if currently available
          .select("*")
          .single();

        if (error) {
          // If no rows affected, object is already claimed
          if (error.code === "PGRST116") {
            console.log(`❌ Object already claimed by someone else`);

            // Get current owner info
            const { data: currentObj } = await supabase
              .from("canvas_objects")
              .select("owner")
              .eq("id", objectId)
              .single();

            // Find owner name from profiles
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", currentObj?.owner)
              .single();

            onOwnershipRejected?.({
              object_id: objectId,
              requesting_user_id: user.id,
              current_owner_id: currentObj?.owner || "unknown",
              current_owner_name: ownerProfile?.display_name || "Unknown User",
            });

            cleanupPendingClaim(objectId, "object already claimed");
            return false;
          }

          console.error("❌ Error claiming object:", error);
          cleanupPendingClaim(objectId, "database error");
          return false;
        }

        console.log(`✅ Successfully claimed object: ${objectId}`);

        const claimedAt = new Date().toISOString();
        const expiresAt = new Date(
          Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS
        ).toISOString();

        // Update local state
        setOwnershipState((prev) => ({
          ...prev,
          [objectId]: {
            owner_id: user.id,
            owner_name: profile.display_name,
            claimed_at: claimedAt,
            expires_at: expiresAt,
            is_claimed_by_me: true,
          },
        }));

        // Set up auto-release timer
        const timeoutId = setTimeout(() => {
          console.log(`⏰ Auto-releasing expired claim: ${objectId}`);
          releaseObject(objectId, true); // true indicates this is an expiry
        }, OWNERSHIP_CONFIG.CLAIM_DURATION_MS);

        cleanupTimersRef.current.set(objectId, timeoutId);

        // Broadcast the claim event
        onOwnershipClaimed?.({
          object_id: objectId,
          owner_id: user.id,
          owner_name: profile.display_name,
          claimed_at: claimedAt,
          expires_at: expiresAt,
        });

        return true;
      } catch (error) {
        console.error("❌ Failed to claim object:", error);
        cleanupPendingClaim(objectId, "unexpected error");
        return false;
      } finally {
        // Clean up successful claims (timeout was cleared by cleanupPendingClaim)
        cleanupPendingClaim(objectId, "claim completed");
      }
    },
    [
      user,
      profile,
      getOwnershipStatus,
      onOwnershipClaimed,
      onOwnershipRejected,
      cleanupPendingClaim,
    ]
  );

  // Release an object (simple owner field approach)
  const releaseObject = useCallback(
    async (objectId: string, isExpired: boolean = false): Promise<boolean> => {
      if (!user) {
        console.warn("Cannot release object: user not authenticated");
        return false;
      }

      try {
        console.log(`🏷️ Releasing object: ${objectId}`);
        console.log(`🔍 Current user: ${user.id}`);

        // First, check what the current owner is
        const { data: currentObject, error: fetchError } = await supabase
          .from("canvas_objects")
          .select("owner, created_by")
          .eq("id", objectId)
          .single();

        if (fetchError) {
          console.error("❌ Error fetching object for release:", fetchError);
          return false;
        }

        console.log(
          `🔍 Current object state: owner=${currentObject.owner}, created_by=${currentObject.created_by}, user.id=${user.id}`
        );

        // Check if we actually own this object
        if (currentObject.owner !== user.id) {
          console.warn(
            `⚠️ Cannot release object ${objectId}: not owned by current user (owner: ${currentObject.owner})`
          );
          return false;
        }

        // Set owner back to 'all' - we know we own it from the check above
        console.log(
          `🔄 Updating database: setting owner to 'all' for object ${objectId}`
        );
        const { data, error } = await supabase
          .from("canvas_objects")
          .update({
            owner: "all",
          })
          .eq("id", objectId)
          .select();

        if (error) {
          console.error("❌ Error releasing object:", error);
          return false;
        }

        if (!data || data.length === 0) {
          console.warn(
            `⚠️ No rows updated for object ${objectId}. This should not happen.`
          );
          return false;
        }

        console.log(
          `✅ Database update successful for object ${objectId}:`,
          data[0]
        );
        console.log(
          `📡 Ownership change should now be broadcasted to other users`
        );

        // Remove from local state completely
        setOwnershipState((prev) => {
          const { [objectId]: removed, ...rest } = prev;
          return rest;
        });

        // Clear cleanup timer
        const timerId = cleanupTimersRef.current.get(objectId);
        if (timerId) {
          clearTimeout(timerId);
          cleanupTimersRef.current.delete(objectId);
        }

        // Broadcast the appropriate event based on release type
        if (isExpired) {
          onOwnershipExpired?.({
            object_id: objectId,
            former_owner_id: user.id,
            expired_at: new Date().toISOString(),
          });
        } else {
          onOwnershipReleased?.({
            object_id: objectId,
            former_owner_id: user.id,
            released_at: new Date().toISOString(),
          });
        }

        console.log(`✅ Successfully released object: ${objectId}`);
        return true;
      } catch (error) {
        console.error("❌ Failed to release object:", error);
        return false;
      }
    },
    [user, onOwnershipReleased]
  );

  // Extend ownership on activity (drag, resize, etc.)
  const extendOwnership = useCallback(
    (objectId: string) => {
      const ownership = ownershipState[objectId];
      if (!ownership?.is_claimed_by_me || !user || !profile) return;

      // Clear existing timer
      const existingTimer = cleanupTimersRef.current.get(objectId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const newClaimedAt = new Date().toISOString();
      const newExpiresAt = new Date(
        Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS
      ).toISOString();

      // Set new timer
      const newTimer = setTimeout(() => {
        console.log(`⏰ Auto-releasing expired claim: ${objectId}`);
        releaseObject(objectId, true);
      }, OWNERSHIP_CONFIG.CLAIM_DURATION_MS);

      cleanupTimersRef.current.set(objectId, newTimer);

      // Update local state
      setOwnershipState((prev) => ({
        ...prev,
        [objectId]: {
          ...prev[objectId],
          claimed_at: newClaimedAt,
          expires_at: newExpiresAt,
        },
      }));

      // Broadcast renewal to other users
      onOwnershipClaimed?.({
        object_id: objectId,
        owner_id: user.id,
        owner_name: profile.display_name,
        claimed_at: newClaimedAt,
        expires_at: newExpiresAt,
      });

      console.log(`🔄 Extended ownership for object ${objectId}`);
    },
    [ownershipState, releaseObject, user, profile, onOwnershipClaimed]
  );

  // Release all objects claimed by this user
  const releaseAllObjects = useCallback(async () => {
    const myObjects = Object.keys(ownershipState).filter(
      (objectId) => ownershipState[objectId]?.is_claimed_by_me
    );

    await Promise.all(myObjects.map((objectId) => releaseObject(objectId)));
  }, [ownershipState, releaseObject]);

  // Release all objects except the specified one
  const releaseAllExcept = useCallback(
    async (excludeObjectId?: string) => {
      const myObjects = Object.keys(ownershipState).filter(
        (objectId) =>
          ownershipState[objectId]?.is_claimed_by_me &&
          objectId !== excludeObjectId
      );

      await Promise.all(myObjects.map((objectId) => releaseObject(objectId)));
    },
    [ownershipState, releaseObject]
  );

  // Handle newly created objects from realtime broadcasts
  const handleNewObjectCreated = useCallback(
    async (object: any, creatorUserId: string, creatorDisplayName?: string) => {
      console.log(
        `🏷️ Handling new object created: ${object.id}, owner: ${object.owner}, creator: ${creatorUserId}`
      );

      // Only process if object has an owner that's not 'all'
      if (object.owner && object.owner !== "all") {
        // Determine if this is our own object
        const isMyObject = object.owner === user?.id;

        // Use provided display name or fetch it
        let ownerName = creatorDisplayName || "Unknown User";
        if (!creatorDisplayName && !isMyObject) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", object.owner)
              .single();

            ownerName = profile?.display_name || "Unknown User";
          } catch (error) {
            console.warn("Failed to fetch creator display name:", error);
          }
        } else if (isMyObject) {
          // For our own objects, use our profile name
          ownerName = profile?.display_name || "You";
        }

        // Update ownership state
        setOwnershipState((prev) => ({
          ...prev,
          [object.id]: {
            owner_id: object.owner,
            owner_name: ownerName,
            claimed_at: new Date().toISOString(),
            expires_at: new Date(
              Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS
            ).toISOString(),
            is_claimed_by_me: isMyObject,
          },
        }));

        // Set up auto-release timer for our own objects
        if (isMyObject) {
          const timeoutId = setTimeout(() => {
            console.log(`⏰ Auto-releasing expired claim: ${object.id}`);
            releaseObject(object.id, true); // true indicates this is an expiry
          }, OWNERSHIP_CONFIG.CLAIM_DURATION_MS);

          cleanupTimersRef.current.set(object.id, timeoutId);
        }

        console.log(
          `🏷️ Added ownership state for new object ${object.id} owned by ${ownerName} (isMyObject: ${isMyObject})`
        );
      }
    },
    [user, profile, releaseObject]
  );

  // Handle ownership changes from canvas_objects realtime updates
  const handleCanvasObjectUpdate = useCallback(
    (payload: any) => {
      const { new: newRecord, old: oldRecord } = payload;

      if (!newRecord?.id) return;

      const objectId = newRecord.id;
      const newOwner = newRecord.owner;
      const oldOwner = oldRecord?.owner;

      // Only process ownership changes (when owner field changes)
      if (newOwner !== oldOwner) {
        // Skip processing if this is a rapid change from undefined to a user ID
        // This prevents infinite loops during object creation
        // Only skip if the object was just created (has created_by field)
        if (
          oldOwner === undefined &&
          newOwner &&
          newOwner !== "all" &&
          newRecord.created_by === newOwner
        ) {
          console.log(
            "⚠️ Skipping rapid ownership change from undefined to user - likely object creation:",
            objectId,
            `${oldOwner} → ${newOwner}`
          );
          return;
        }

        console.log(
          "📥 Ownership change via realtime:",
          objectId,
          `${oldOwner} → ${newOwner}`
        );

        if (newOwner === "all") {
          // Object was released - remove from state completely
          setOwnershipState((prev) => {
            const { [objectId]: removed, ...rest } = prev;
            return rest;
          });
        } else if (newOwner === user?.id && user) {
          // Object was claimed by me (or I created it)
          setOwnershipState((prev) => ({
            ...prev,
            [objectId]: {
              owner_id: user.id,
              owner_name: profile?.display_name || "Me",
              claimed_at: new Date().toISOString(),
              expires_at: new Date(
                Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS
              ).toISOString(),
              is_claimed_by_me: true,
            },
          }));
        } else {
          // Object was claimed by someone else - need to get their name
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", newOwner)
            .single()
            .then(({ data: ownerProfile }) => {
              setOwnershipState((prev) => ({
                ...prev,
                [objectId]: {
                  owner_id: newOwner,
                  owner_name: ownerProfile?.display_name || "Unknown User",
                  claimed_at: new Date().toISOString(),
                  expires_at: new Date(
                    Date.now() + OWNERSHIP_CONFIG.CLAIM_DURATION_MS
                  ).toISOString(),
                  is_claimed_by_me: false,
                },
              }));
            });
        }
      }
    },
    [user, profile]
  );

  // We don't need a separate subscription - we'll hook into the existing canvas_objects updates

  // Auto-release only on window unload (keep for cleanup)
  useEffect(() => {
    const handleUnload = () => {
      console.log("🏷️ Window unload detected, releasing all objects");
      releaseAllObjects();
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [releaseAllObjects]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      cleanupTimersRef.current.clear();

      // Clear pending claim timeouts
      pendingClaimTimeoutsRef.current.forEach((timerId) =>
        clearTimeout(timerId)
      );
      pendingClaimTimeoutsRef.current.clear();
    };
  }, []);

  return {
    // State
    ownershipState,
    pendingClaims,
    isConnected: true, // Always connected since we use direct database operations

    // Actions
    claimObject,
    releaseObject,
    releaseAllObjects,
    releaseAllExcept,
    extendOwnership,

    // Utilities
    canEdit,
    isClaimedByOther,
    getOwnershipStatus,
    getOwnerInfo,

    // Handlers for integration
    handleCanvasObjectUpdate,
    handleNewObjectCreated,
  };
}
