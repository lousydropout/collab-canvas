"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// Redirect to canvas if already authenticated
		if (user && !loading) {
			router.push("/canvas");
		}
	}, [user, loading, router]);

	// Show loading state while checking authentication
	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-sm text-muted-foreground">Loading...</p>
					<p className="mt-1 text-xs text-gray-500">
						Checking authentication status
					</p>
					<p className="mt-1 text-xs text-gray-400">
						If this takes more than 10 seconds, check the browser console for
						errors
					</p>
				</div>
			</div>
		);
	}

	// Don't render login form if user is authenticated (prevents flash)
	if (user) {
		return null;
	}

	return (
		<div className="w-full max-w-md p-6">
			<LoginForm onToggleMode={() => router.push("/register")} />
		</div>
	);
}
