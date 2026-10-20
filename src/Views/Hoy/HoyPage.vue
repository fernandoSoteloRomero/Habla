<script setup lang="ts">
import { computed } from "vue";
import LineaVertical from "@/components/LineaVertical.vue";
import { getGreeting } from "@/common/Greeting";
import { getLevel } from "@/curriculum/levels";
import { getUnit, units } from "@/curriculum/units";
import { useAuthStore } from "@/stores/auth";
import SesionHoyPanel from "./SesionHoyPanel.vue";

const auth = useAuthStore();

const current = computed(() => getUnit(auth.profile?.current_unit_id ?? ""));
const level = computed(() => getLevel(current.value.nivel));
const greeting = computed(() =>
  getGreeting(new Date(), auth.profile?.name ?? ""),
);

// Celular: la estación anterior, la actual y la siguiente (en el camino completo)
const nearbyStations = computed(() => {
  const index = units.indexOf(current.value);
  return units.slice(Math.max(0, index - 1), index + 2);
});

// Computadora: todas las metas del nivel actual
const levelStations = computed(() =>
  units.filter((u) => u.nivel === current.value.nivel),
);

const lineLabel = computed(() =>
  level.value.id === "L0"
    ? "Línea rosa, Nivel 0"
    : `Línea ${level.value.linea.toLowerCase()}, nivel ${level.value.nombre}`,
);
</script>

<template>
  <div v-if="auth.profile">
    <!-- Celular -->
    <div data-testid="linea-movil" class="lg:hidden">
      <p class="mt-3 text-sm leading-snug text-ink-2">{{ greeting }}</p>
      <LineaVertical
        :stations="nearbyStations"
        :current-unit-id="current.id"
        :color="level.color"
        large-current
      >
        <SesionHoyPanel />
      </LineaVertical>
    </div>

    <!-- Computadora: la línea del nivel a la izquierda y la sesión al centro -->
    <div class="hidden grid-cols-[270px_1fr] lg:grid">
      <div class="border-r-2 border-concrete py-[22px] pr-6">
        <p class="text-sm text-ink-2">{{ lineLabel }}</p>
        <LineaVertical
          :stations="levelStations"
          :current-unit-id="current.id"
          :color="level.color"
        />
      </div>
      <div class="max-w-xl py-[22px] pl-6">
        <p class="text-sm text-ink-2">{{ greeting }}</p>
        <h1
          class="mt-3.5 font-display text-3xl leading-[.95] font-bold tracking-tight"
        >
          {{ current.titulo_es }}
        </h1>
        <SesionHoyPanel class="mt-5" />
      </div>
    </div>
  </div>
</template>
