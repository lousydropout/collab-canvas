export interface RealtimeEvents {
	// Object CRUD events
	object_created: {
		object: CanvasObject;
		user_id: string;
		creatorDisplayName?: string;
	};
	object_updated: {
		object: CanvasObject;
		user_id: string;
		ownerDisplayName?: string | null;
	};
	object_deleted: {
		object_id: string;
		user_id: string;
	};

	// Batch operations
	objects_created: {
		objects: CanvasObject[];
		user_id: string;
		creatorDisplayName?: string;
	};
	objects_deleted: {
		object_ids: string[];
		user_id: string;
	};

	objects_duplicated: {
		original_ids: string[];
		new_objects: CanvasObject[];
		user_id: string;
		creatorDisplayName?: string;
	};

	// Cursor events
	cursor_moved: {
		user_id: string;
		display_name: string;
		position: {
			x: number;
			y: number;
		};
		timestamp: string;
	};

	// Ownership events
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

	ownership_rejected: {
		object_id: string;
		requesting_user_id: string;
		current_owner_id: string;
		current_owner_name: string;
	};
}

export interface PresenceState {
	user_id: string;
	display_name: string;
	cursor_position?: {
		x: number;
		y: number;
	};
	selected_objects?: string[];
	last_seen: string;
}

export type ConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "reconnecting"
	| "error";

export interface RealtimeState {
	isConnected: boolean;
	connectionStatus: ConnectionStatus;
	onlineUsers: PresenceState[];
	error: string | null;
}

// Re-export CanvasObject to avoid circular imports
import type { CanvasObject } from "@/types/canvas";
export type { CanvasObject };
