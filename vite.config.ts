import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind 0.0.0.0 so the preview proxy can reach the dev server
    port: 5173,
    // Allow the Arena/e2b live-preview proxy hosts (subdomain wildcard).
    allowedHosts: [".e2b.app"],
  },
  preview: {
    host: true,
    port: 4173,
  },
});
