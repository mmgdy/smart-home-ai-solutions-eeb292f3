const configuredProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const DEFAULT_SUPABASE_PROJECT_ID = 'djsibxhkfvwtjzvnjmhp';
const DEFAULT_SUPABASE_URL = `https://${DEFAULT_SUPABASE_PROJECT_ID}.supabase.co`;
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_tfQAgq9bXUVRQnvZ1WjgWg_e7dF_T6W';

// Project ID and publishable key are browser-safe Supabase values. These
// fallbacks keep production builds rendering if host env vars are missing.
export const SUPABASE_PROJECT_ID = configuredProjectId || DEFAULT_SUPABASE_PROJECT_ID;
export const SUPABASE_URL = configuredUrl || DEFAULT_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY =
  configuredKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
