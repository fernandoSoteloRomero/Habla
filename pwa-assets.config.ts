import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Íconos de la app a partir de public/logo.svg (la estación "Estás aquí" sobre rosa).
// Android (maskable) e iPhone (apple) recortan las esquinas solos: sin margen blanco.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
      resizeOptions: { background: "#E4007C" },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0,
      resizeOptions: { background: "#E4007C" },
    },
  },
  images: ["public/logo.svg"],
});
