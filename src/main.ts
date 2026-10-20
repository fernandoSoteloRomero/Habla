import { createApp } from "vue";
import App from "./App.vue";

import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@/assets/index.css";
import { createPinia } from "pinia";
import { registerSW } from "virtual:pwa-register";
import router from "./router/index.ts";
import { useAuthStore } from "./stores/auth.ts";

// App instalable: cuando se publica una versión nueva, la página se recarga sola
// en cuanto el service worker nuevo toma el control (así no se queda con archivos viejos)
registerSW({ immediate: true });

async function bootstrap(): Promise<void> {
  const app = createApp(App);

  const pinia = createPinia();

  app.use(pinia);

  // Primero se revisa la sesión de Supabase; el router decide si manda a la Bienvenida
  const authStore = useAuthStore();
  await authStore.initialize();
  // Si la sesión se cierra en otra pestaña o vence sin poder renovarse, regresa a la Bienvenida
  authStore.listenForSignOut(() => {
    router.replace({ name: "bienvenida" });
  });

  app.use(router);

  app.mount("#app");
}

bootstrap();
