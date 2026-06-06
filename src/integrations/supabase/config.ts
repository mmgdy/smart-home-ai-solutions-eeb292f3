const CURRENT_PROJECT_ID = 'vgwptcvjhmphqhoepbri';
const CURRENT_SUPABASE_URL = `https://${CURRENT_PROJECT_ID}.supabase.co`;
const CURRENT_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InZnd3B0Y3ZqaG1waHFob2VwYnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzk2MjcsImV4cCI6MjA4MzIxNTYyN30.sLDAgPDZhw5zAdrmMj66vlMASa1HfhbDYwTJhRoKn2w';

const configuredProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isLegacyBackend =
  configuredProjectId === 'djsibxhkfvwtjzvnjmhp' ||
  configuredUrl?.includes('djsibxhkfvwtjzvnjmhp');

export const SUPABASE_PROJECT_ID = isLegacyBackend
  ? CURRENT_PROJECT_ID
  : configuredProjectId || CURRENT_PROJECT_ID;

export const SUPABASE_URL = isLegacyBackend
  ? CURRENT_SUPABASE_URL
  : configuredUrl || `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const SUPABASE_PUBLISHABLE_KEY = isLegacyBackend
  ? CURRENT_PUBLISHABLE_KEY
  : configuredKey || CURRENT_PUBLISHABLE_KEY;
