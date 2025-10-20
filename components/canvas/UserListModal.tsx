"use client";

import { User, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { PresenceState } from "@/types/realtime";

interface UserListModalProps {
	isOpen: boolean;
	onClose: () => void;
	onlineUsers: PresenceState[];
}

// Generate consistent colors for users based on their user_id
function getUserColor(userId: string): string {
	const colors = [
		"bg-blue-500",
		"bg-green-500",
		"bg-purple-500",
		"bg-red-500",
		"bg-yellow-500",
		"bg-pink-500",
		"bg-indigo-500",
		"bg-teal-500",
		"bg-orange-500",
		"bg-cyan-500",
	];

	// Create a simple hash from the user ID
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
	}

	return colors[Math.abs(hash) % colors.length];
}

function formatTimeAgo(timestamp: string): string {
	const now = new Date();
	const time = new Date(timestamp);
	const diffMs = now.getTime() - time.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));

	if (diffMins < 1) return "now";
	if (diffMins === 1) return "1 min ago";
	if (diffMins < 60) return `${diffMins} mins ago`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours === 1) return "1 hour ago";
	if (diffHours < 24) return `${diffHours} hours ago`;

	return time.toLocaleDateString();
}

export function UserListModal({
	isOpen,
	onClose,
	onlineUsers,
}: UserListModalProps) {
	const { user } = useAuth();

	if (!isOpen) return null;

	// Deduplicate users by user_id to prevent duplicate keys
	const uniqueUsers = onlineUsers.reduce(
		(acc, user) => {
			acc[user.user_id] = user;
			return acc;
		},
		{} as Record<string, PresenceState>,
	);

	const deduplicatedUsers = Object.values(uniqueUsers);

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
			<div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">
						Online Users ({deduplicatedUsers.length})
					</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<X className="w-5 h-5 text-gray-500" />
					</button>
				</div>

				{/* Users List */}
				<div className="p-4 max-h-96 overflow-y-auto">
					{deduplicatedUsers.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<User className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p>No users online</p>
						</div>
					) : (
						<div className="space-y-3">
							{deduplicatedUsers.map((presenceUser) => (
								<div
									key={presenceUser.user_id}
									className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
								>
									{/* User Avatar/Color */}
									<div
										className={`w-10 h-10 rounded-full ${getUserColor(presenceUser.user_id)} flex items-center justify-center text-white font-medium text-sm`}
									>
										{presenceUser.display_name.charAt(0).toUpperCase()}
									</div>

									{/* User Info */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<p className="font-medium text-gray-900 truncate">
												{presenceUser.display_name}
											</p>
											{presenceUser.user_id === user?.id && (
												<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
													You
												</span>
											)}
										</div>
										<p className="text-sm text-gray-500">
											Active {formatTimeAgo(presenceUser.last_seen)}
										</p>
										{presenceUser.selected_objects &&
											presenceUser.selected_objects.length > 0 && (
												<p className="text-xs text-gray-400">
													{presenceUser.selected_objects.length} object(s)
													selected
												</p>
											)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
