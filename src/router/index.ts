import MainLayout from "@/components/layout/MainLayout.vue";
import { useAuthStore } from "@/stores/auth";
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
    {
      path: "/bienvenida",
      name: "bienvenida",
      component: () => import("@/Views/Bienvenida/BienvenidaPage.vue"),
    },
    {
      path: "/motivo",
      name: "motivo",
      component: () => import("@/Views/Motivo/MotivoPage.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("@/Views/404/NotFoundPage.vue"),
    },
  ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  // Sin sesión: solo la Bienvenida
  if (!authStore.isAuthenticated) {
    if (to.name !== "bienvenida") {
      return { name: "bienvenida" };
    }
    return;
  }

  // Primer uso: hasta que conteste su motivo, solo ve esa pantalla
  if (!authStore.hasMotive) {
    if (to.name !== "motivo") {
      return { name: "motivo" };
    }
    return;
  }

  // Ya entró y ya contestó: de la Bienvenida o del motivo lo regresa a Hoy
  if (to.name === "bienvenida" || to.name === "motivo") {
    return { name: "hoy" };
  }
});

export default router;
