import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// NOTE: the @lovable.dev/mcp-js Vite plugin was removed on purpose. It
// regenerated supabase/functions/mcp/index.ts on every build, overwriting
// the deployability fixes (esm.sh imports, Deno.env, zod pin) in the
// owned copy of that bundle. The function is maintained by hand now.

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
}));
