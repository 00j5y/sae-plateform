"use client";

import { createBrowserClient } from "@supabase/ssr";

function publicSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("La configuration Supabase publique est incomplète.");
  }

  return { url, key };
}

export function createClient() {
  const { url, key } = publicSupabaseEnvironment();
  return createBrowserClient(url, key);
}
