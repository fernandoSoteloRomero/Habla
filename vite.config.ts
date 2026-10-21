/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // App instalable (PWA): se actualiza sola cuando hay una versión nueva.
    // El registro se hace en main.ts (registerSW), que recarga la página al actualizar.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
      // Las fuentes también se guardan, para que la app se vea igual sin conexión
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,ico,svg}"],
      },
      manifest: {
        name: "Habla",
        short_name: "Habla",
        description: "Inglés para moverte en la vida real, 20 minutos al día.",
        lang: "es",
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Lógica pura compartida con las Edge Functions (sin npm: ni Deno)
      "@shared": fileURLToPath(
        new URL("./supabase/functions/_shared", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "supabase/functions/_shared/**/*.test.ts"],
  },
});
