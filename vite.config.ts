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
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const normalized = id.replace(/\\/g, '/');
            if (normalized.includes('/@radix-ui/')) {
              return 'vendor-ui';
            }
            if (
              normalized.includes('/node_modules/react/') ||
              normalized.includes('/node_modules/react-dom/') ||
              normalized.includes('/node_modules/react-router/') ||
              normalized.includes('/node_modules/react-router-dom/') ||
              normalized.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (
              normalized.includes('/jspdf/') ||
              normalized.includes('/jspdf-autotable/') ||
              normalized.includes('/html2canvas/')
            ) {
              return 'vendor-pdf';
            }
            if (
              normalized.includes('/recharts/') ||
              normalized.includes('/d3-') ||
              normalized.includes('/victory-vendor/')
            ) {
              return 'vendor-charts';
            }
            if (normalized.includes('/framer-motion/')) {
              return 'vendor-motion';
            }
            if (normalized.includes('/@supabase/')) {
              return 'vendor-supabase';
            }
          }
        },
      },
    },
  },
}));
