"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthService } from "@/lib/supabase/auth";
import type { User } from "@supabase/supabase-js";
import type { Profile, AuthState } from "@/types/user";

interface AuthContextType extends AuthState {
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load initial auth state - only run once
  useEffect(() => {
    if (initialized) return;

    const initializeAuth = async () => {
      try {
        console.log("🔄 Starting auth initialization...");
        setLoading(true);

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Auth initialization timeout after 10 seconds")),
            10000
          )
        );

        const authPromise = (async () => {
          console.log("🔍 Getting current user...");
          const currentUser = await AuthService.getCurrentUser();
          console.log(
            "👤 Current user result:",
            currentUser ? "Found user" : "No user"
          );

          if (currentUser) {
            setUser(currentUser);
            console.log("🔍 Fetching user profile...");
            try {
              const userProfile = await AuthService.getProfile(currentUser.id);
              console.log(
                "👤 Profile result:",
                userProfile ? "Found profile" : "No profile"
              );
              setProfile(userProfile);
            } catch (profileError) {
              console.error(
                "❌ Profile fetch failed, continuing without profile:",
                profileError
              );
              // Continue without profile - user can still use the app
              setProfile(null);
            }
          } else {
            // No user found, clear any stale session data
            console.log("🧹 Clearing stale session data...");
            try {
              await AuthService.signOut();
            } catch (signOutError) {
              console.log(
                "🧹 Sign out error (expected if no session):",
                signOutError
              );
            }
          }

          console.log("✅ Auth initialization completed");
        })();

        await Promise.race([authPromise, timeoutPromise]);
      } catch (err) {
        console.error("❌ Error initializing auth:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize auth"
        );
      } finally {
        console.log("🏁 Setting loading to false");
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = AuthService.onAuthStateChange(async (event, session) => {
      try {
        console.log(
          "🔄 Auth state change:",
          event,
          session ? "Has session" : "No session"
        );
        if (session?.user) {
          console.log("👤 Setting user from auth state change");
          setUser(session.user);
          console.log("🔍 Fetching profile from auth state change...");
          try {
            const userProfile = await AuthService.getProfile(session.user.id);
            console.log(
              "👤 Profile from auth state change:",
              userProfile ? "Found profile" : "No profile"
            );
            setProfile(userProfile);
          } catch (profileError) {
            console.error(
              "❌ Profile fetch failed in auth state change, continuing without profile:",
              profileError
            );
            // Continue without profile - user can still use the app
            setProfile(null);
          }
        } else {
          console.log("🚫 Clearing user and profile");
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("❌ Error handling auth state change:", err);
        setError(
          err instanceof Error ? err.message : "Auth state change failed"
        );
      }
    });

    return () => subscription.unsubscribe();
  }, [initialized]);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const { user: authUser, error: authError } = await AuthService.signIn(
        email,
        password
      );

      if (authError) {
        setError(authError.message);
        return { success: false, error: authError.message };
      }

      if (authUser) {
        setUser(authUser);
        const userProfile = await AuthService.getProfile(authUser.id);
        setProfile(userProfile);
        return { success: true };
      }

      return { success: false, error: "Sign in failed" };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Sign in failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    try {
      setError(null);
      setLoading(true);

      const { user: authUser, error: authError } = await AuthService.signUp(
        email,
        password,
        displayName
      );

      if (authError) {
        setError(authError.message);
        return { success: false, error: authError.message };
      }

      if (authUser) {
        setUser(authUser);
        // Profile will be created automatically by the trigger
        // Wait a moment and then fetch it
        setTimeout(async () => {
          const userProfile = await AuthService.getProfile(authUser.id);
          setProfile(userProfile);
        }, 500);

        return { success: true };
      }

      return { success: false, error: "Sign up failed" };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Sign up failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log("useAuth: Starting signOut process...");

      // Try to sign out from Supabase
      const result = await AuthService.signOut();
      console.log("useAuth: Supabase signOut result:", result);

      // Always clear local state, even if Supabase call fails
      setUser(null);
      setProfile(null);
      setError(null);
      console.log("useAuth: Local state cleared");
    } catch (err) {
      console.error("useAuth: Error signing out:", err);
      // Still clear local state even on error
      setUser(null);
      setProfile(null);
      setError(err instanceof Error ? err.message : "Sign out failed");
    } finally {
      setLoading(false);
      console.log("useAuth: signOut process completed");
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) return false;

      const updatedProfile = await AuthService.updateProfile(user.id, updates);
      if (updatedProfile) {
        setProfile(updatedProfile);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Profile update failed");
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
