"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client using the public anon key.
 * Used for optional Realtime subscriptions on the admin pages.
 */
export function createBrowserClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
