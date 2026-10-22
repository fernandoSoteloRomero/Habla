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
        {
          path: "sesion",
          name: "sesion",
          component: () => import("@/Views/Sesion/SesionPage.vue"),
        },
        {
          path: "practica",
          name: "practica",
          component: () => import("@/Views/Practica/PracticaPage.vue"),
        },
        {
          path: "repaso",
          name: "repaso",
          component: () => import("@/Views/Repaso/RepasoPage.vue"),
        },
        {
          path: "repaso/tarjetas",
          name: "repaso-tarjetas",
          component: () => import("@/Views/Repaso/TarjetasPage.vue"),
        },
        {
          path: "repaso/ejercicios",
          name: "repaso-ejercicios",
          component: () => import("@/Views/Repaso/EjerciciosPage.vue"),
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
      path: "/evaluacion",
      name: "evaluacion",
      component: () => import("@/Views/Evaluacion/EvaluacionPage.vue"),
    },
    {
      path: "/resultado",
      name: "resultado",
      component: () => import("@/Views/Resultado/ResultadoPage.vue"),
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

  // Después del motivo va la evaluación inicial: hasta terminarla, solo ve esa pantalla
  if (!authStore.isPlaced) {
    if (to.name !== "evaluacion") {
      return { name: "evaluacion" };
    }
    return;
  }

  // Ya terminó el primer uso: de esas pantallas lo regresa a Hoy
  if (
    to.name === "bienvenida" ||
    to.name === "motivo" ||
    to.name === "evaluacion"
  ) {
    return { name: "hoy" };
  }

  // El resultado solo se ve justo después de la evaluación
  if (to.name === "resultado" && !authStore.lastPlacement) {
    return { name: "hoy" };
  }
});

// Si se publicó una versión nueva mientras la app estaba abierta, los archivos de las
// pantallas cambian de nombre y el import() falla: se recarga una vez en la ruta destino.
router.onError((error, to) => {
  const isChunkError =
    /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      String(error?.message),
    );
  if (!isChunkError) return;
  const key = `recargado:${to.fullPath}`;
  if (sessionStorage.getItem(key)) return; // ya se intentó: no recargar en ciclo
  sessionStorage.setItem(key, "1");
  window.location.assign(to.fullPath);
});

export default router;
