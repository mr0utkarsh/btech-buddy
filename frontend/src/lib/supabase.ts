import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "BTech Buddy: Supabase URL or anon key is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl || "https://placeholder.invalid", supabaseAnonKey || "");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
