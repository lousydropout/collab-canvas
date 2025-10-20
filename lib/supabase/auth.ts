import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export interface AuthResult {
	user: User | null;
	error: AuthError | null;
}

export interface Profile {
	id: string;
	display_name: string;
	created_at: string;
	updated_at: string;
}

export class AuthService {
	// Sign up new user
	static async signUp(
		email: string,
		password: string,
		displayName: string,
	): Promise<AuthResult> {
		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						display_name: displayName,
					},
				},
			});

			return {
				user: data.user,
				error,
			};
		} catch (error) {
			return {
				user: null,
				error: error as AuthError,
			};
		}
	}

	// Sign in existing user
	static async signIn(email: string, password: string): Promise<AuthResult> {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			return {
				user: data.user,
				error,
			};
		} catch (error) {
			return {
				user: null,
				error: error as AuthError,
			};
		}
	}

	// Sign out current user
	static async signOut(): Promise<{ error: AuthError | null }> {
		const { error } = await supabase.auth.signOut();
		return { error };
	}

	// Get current user
	static async getCurrentUser(): Promise<User | null> {
		try {
			console.log("🔍 AuthService.getCurrentUser: Starting...");

			// Add timeout to prevent hanging
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("getCurrentUser timeout after 5 seconds")),
					5000,
				),
			);

			const authPromise = (async () => {
				// First check if we have a session
				const { data: sessionData, error: sessionError } =
					await supabase.auth.getSession();
				console.log(
					"🔍 AuthService.getCurrentUser: Session check:",
					sessionData.session ? "Has session" : "No session",
					sessionError ? `Error: ${sessionError.message}` : "",
				);

				if (sessionError) {
					console.error(
						"❌ AuthService.getCurrentUser: Session error:",
						sessionError,
					);
					return null;
				}

				if (!sessionData.session) {
					console.log(
						"✅ AuthService.getCurrentUser: No session, returning null",
					);
					return null;
				}

				// If we have a session, get the user
				const { data, error } = await supabase.auth.getUser();

				if (error) {
					console.error("❌ AuthService.getCurrentUser: Error:", error);
					return null;
				}

				console.log(
					"✅ AuthService.getCurrentUser: Success:",
					data.user ? "User found" : "No user",
				);
				return data.user;
			})();

			return await Promise.race([authPromise, timeoutPromise]);
		} catch (error) {
			console.error("❌ AuthService.getCurrentUser: Exception:", error);
			return null;
		}
	}

	// Get current session
	static async getCurrentSession() {
		const { data } = await supabase.auth.getSession();
		return data.session;
	}

	// Get user profile
	static async getProfile(userId: string): Promise<Profile | null> {
		try {
			console.log("🔍 AuthService.getProfile: Starting for user:", userId);

			// Check if we have a valid session first
			const { data: sessionData } = await supabase.auth.getSession();
			console.log(
				"🔍 AuthService.getProfile: Session check:",
				sessionData.session ? "Valid session" : "No session",
			);

			if (!sessionData.session) {
				console.log(
					"❌ AuthService.getProfile: No valid session, cannot fetch profile",
				);
				return null;
			}

			// Add timeout to profile fetch
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("Profile fetch timeout after 5 seconds")),
					5000,
				),
			);

			const profilePromise = supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			const { data, error } = await Promise.race([
				profilePromise,
				timeoutPromise,
			]);

			if (error) {
				console.error("❌ AuthService.getProfile: Error:", error);
				return null;
			}

			console.log(
				"✅ AuthService.getProfile: Success:",
				data ? "Profile found" : "No profile",
			);
			return data;
		} catch (error) {
			console.error("❌ AuthService.getProfile: Exception:", error);
			return null;
		}
	}

	// Update user profile
	static async updateProfile(
		userId: string,
		updates: Partial<Profile>,
	): Promise<Profile | null> {
		try {
			const { data, error } = await supabase
				.from("profiles")
				.update(updates)
				.eq("id", userId)
				.select()
				.single();

			if (error) {
				console.error("Error updating profile:", error);
				return null;
			}

			return data;
		} catch (error) {
			console.error("Error updating profile:", error);
			return null;
		}
	}

	// Listen to auth changes
	static onAuthStateChange(callback: (event: string, session: any) => void) {
		return supabase.auth.onAuthStateChange(callback);
	}
}
