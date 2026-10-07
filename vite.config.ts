import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Use our own service worker (src/sw.ts) instead of a generated one, so it can
      // handle notification taps and, later, push messages
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      manifest: {
        name: "ARK Tracker",
        short_name: "ARK Tracker",
        description: "Track abandoned bases, neglected tames, and points of interest in ARK",
        start_url: "/",
        display: "standalone",
        background_color: "#15181c",
        theme_color: "#15181c",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
        // jsPDF's optional helpers for HTML and SVG rendering. The reports don't use them, so
        // they're never loaded; keeping them out of the offline cache saves every user ~400 KB.
        globIgnores: ["**/html2canvas*.js", "**/purify*.js", "**/index.es-*.js"],
      },
    }),
  ],
});
