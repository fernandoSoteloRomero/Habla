import { createClient } from "@supabase/supabase-js";

// Cliente único de Supabase. La publishable key es pública: lo que protege los datos es el RLS.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
