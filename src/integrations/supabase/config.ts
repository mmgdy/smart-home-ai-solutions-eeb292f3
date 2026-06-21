const configuredProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isLegacyBackend =
  configuredProjectId === 'djsibxhkfvwtjzvnjmhp' ||
  configuredUrl?.includes('djsibxhkfvwtjzvnjmhp');

// Project ID is not secret (it appears in the public Supabase URL), so a
// fallback is acceptable for the legacy project.
export const SUPABASE_PROJECT_ID = isLegacyBackend
  ? configuredProjectId || 'vgwptcvjhmphqhoepbri'
  : configuredProjectId!;

export const SUPABASE_URL = isLegacyBackend
  ? configuredUrl || `https://vgwptcvjhmphqhoepbri.supabase.co`
  : configuredUrl || `https://${SUPABASE_PROJECT_ID}.supabase.co`;

// The publishable (anon) key is designed to be public, but we must NOT hardcode
// a real key as a build-time fallback — that ships the live key in the bundle
// for every environment. Require it explicitly from env, and fail loudly at
// runtime if it is missing instead of silently using a baked-in value.
export const SUPABASE_PUBLISHABLE_KEY = configuredKey as string;

if (!SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    '[supabase] VITE_SUPABASE_PUBLISHABLE_KEY is not set. ' +
      'Add it to your .env (see .env.example). Authentication and data access will fail.'
  );
}
