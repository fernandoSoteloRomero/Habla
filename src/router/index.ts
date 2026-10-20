import MainLayout from "@/components/layout/MainLayout.vue";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: MainLayout,
      children: [
        {
          path: "",
          name: "hoy",
          component: () => import("@/Views/Hoy/HoyPage.vue"),
        },
        {
          path: "mi-linea",
          name: "mi-linea",
          component: () => import("@/Views/MiLinea/MiLineaPage.vue"),
        },
      ],
    },
  ],
});

export default router;
