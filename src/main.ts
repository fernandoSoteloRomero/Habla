import { createApp } from "vue";
import App from "./App.vue";

import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@/assets/index.css";
import { createPinia } from "pinia";
import router from "./router/index.ts";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");
