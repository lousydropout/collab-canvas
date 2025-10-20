import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Debug: Log which Supabase URL is being used
console.log("🔗 Supabase URL:", supabaseUrl);
console.log(
	"🔑 Supabase Key:",
	supabasePublishableKey?.substring(0, 20) + "...",
);

// Validate environment variables
if (!supabaseUrl) {
	throw new Error(
		"Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable",
	);
}

if (!supabasePublishableKey) {
	throw new Error(
		"Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_KEY environment variable",
	);
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
	},
});
