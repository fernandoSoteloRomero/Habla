import { createApp } from "vue";
import App from "./App.vue";

import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@/assets/index.css";
import { createPinia } from "pinia";
import router from "./router/index.ts";
import { useAuthStore } from "./stores/auth.ts";

async function bootstrap(): Promise<void> {
  const app = createApp(App);

  const pinia = createPinia();

  app.use(pinia);

  // Primero se revisa la sesión de Supabase; el router decide si manda a la Bienvenida
  const authStore = useAuthStore();
  await authStore.initialize();

  app.use(router);

  app.mount("#app");
}

bootstrap();
