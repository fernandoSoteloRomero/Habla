<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import LineaVertical from "@/components/LineaVertical.vue";
import { Button } from "@/components/ui/button";
import { getLevel } from "@/curriculum/levels";
import { units } from "@/curriculum/units";
import { useAuthStore } from "@/stores/auth";

// Pantalla 1.4: el nivel se anuncia como un letrero de línea, en palabras simples.
const auth = useAuthStore();
const router = useRouter();

const result = computed(() => auth.lastPlacement);
const level = computed(() => getLevel(result.value?.level ?? "L0"));
const firstStations = computed(() =>
  units.filter((u) => u.nivel === level.value.id).slice(0, 3),
);

// Texto negro sobre naranja (B1); blanco sobre las demás líneas
const signColors = {
  l0: "bg-l0 text-white",
  l1: "bg-l1 text-white",
  l2: "bg-l2 text-white",
  l3: "bg-l3 text-ink",
};

function goToday(): void {
  router.replace({ name: "hoy" });
}
</script>

<template>
  <div
    v-if="result"
    class="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-3.5 pb-6"
  >
    <!-- Letrero de la línea (diseño: .l-sign) -->
    <div
      class="-mx-5 -mt-3.5 px-[22px] pt-[70px] pb-[26px]"
      :class="signColors[level.color]"
    >
      <p class="text-base font-bold">
        Tu línea es la {{ level.linea.toLowerCase() }}
      </p>
      <h1
        class="mt-1.5 font-display text-3xl leading-[.95] font-bold tracking-tight"
      >
        Empiezas en {{ level.nombre }}
      </h1>
      <p class="mt-2.5 text-base leading-snug">{{ result.resumen }}</p>
    </div>

    <LineaVertical
      class="mt-[18px]"
      :stations="firstStations"
      :current-unit-id="result.unitId"
      :color="level.color"
      current-label="Primera estación"
    />

    <div class="flex-1" />
    <Button class="mt-6" @click="goToday">Continuar</Button>
  </div>
</template>
