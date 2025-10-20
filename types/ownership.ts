export interface OwnershipState {
	[objectId: string]: {
		owner_id: string | null;
		owner_name: string | null;
		claimed_at: string | null;
		expires_at: string | null;
		is_claimed_by_me: boolean;
	};
}

export interface OwnershipEvents {
	ownership_claimed: {
		object_id: string;
		owner_id: string;
		owner_name: string;
		claimed_at: string;
		expires_at: string;
	};
	ownership_released: {
		object_id: string;
		former_owner_id: string;
		released_at: string;
	};
	ownership_expired: {
		object_id: string;
		former_owner_id: string;
		expired_at: string;
	};
	ownership_rejected: {
		object_id: string;
		requesting_user_id: string;
		current_owner_id: string;
		current_owner_name: string;
	};
}

export type OwnershipStatus =
	| "available"
	| "claimed"
	| "claimed_by_me"
	| "expired";

// Configuration
export const OWNERSHIP_CONFIG = {
	CLAIM_DURATION_MS: 300000, // 5 minutes
	AUTO_RELEASE_ON_BLUR: true,
	VISUAL_CLAIM_TIMEOUT_MS: 500, // Show claiming state for 500ms
} as const;
