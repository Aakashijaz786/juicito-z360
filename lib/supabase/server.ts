import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service-role key.
 * NEVER import this into a client component — it bypasses RLS.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase env not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  // Be tolerant of a pasted REST URL: supabase-js wants the bare project URL.
  const baseUrl = url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

  cached = createClient(baseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Next.js 14 caches fetch() by default, which makes supabase-js reads
      // return stale rows after an update. Force every request to bypass it.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}
