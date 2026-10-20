<script setup lang="ts">
import { computed } from "vue";
import { getStationState } from "@/common/StationStates";
import { levels } from "@/curriculum/levels";
import type { Level } from "@/curriculum/levels";
import { getUnit, units } from "@/curriculum/units";
import type { Unit } from "@/curriculum/units";
import { useAuthStore } from "@/stores/auth";

// Mi línea (diseño: .l-net, .l-lv y .l-can): todo el camino como un mapa de metro.
const auth = useAuthStore();

const current = computed(() => getUnit(auth.profile?.current_unit_id ?? ""));
const currentLevelIndex = computed(() =>
  levels.findIndex((l) => l.id === current.value.nivel),
);

interface LevelBlock {
  level: Level;
  status: "completo" | "actual" | "despues";
  label: string;
  done: Unit[];
  later: string;
}

// "Pedir direcciones y 4 metas más" / "Pedir direcciones y 1 meta más" / "Pedir direcciones"
function laterText(remaining: Unit[]): string {
  if (remaining.length === 0) return "";
  const others = remaining.length - 1;
  if (others === 0) return remaining[0].titulo_es;
  return `${remaining[0].titulo_es} y ${others} ${others === 1 ? "meta más" : "metas más"}`;
}

const blocks = computed<LevelBlock[]>(() =>
  levels.map((level, index) => {
    const levelUnits = units.filter((u) => u.nivel === level.id);
    if (index < currentLevelIndex.value) {
      return { level, status: "completo", label: "completo", done: [], later: "" };
    }
    if (index > currentLevelIndex.value) {
      return { level, status: "despues", label: "después", done: [], later: "" };
    }
    const done = levelUnits.filter(
      (u) => getStationState(u.id, current.value.id) === "lograda",
    );
    const remaining = levelUnits.filter(
      (u) => getStationState(u.id, current.value.id) === "proxima",
    );
    return {
      level,
      status: "actual",
      label: `${done.length} de ${levelUnits.length}`,
      done,
      later: laterText(remaining),
    };
  }),
);

// Clases completas por color de línea
const railColors = {
  l0: "before:bg-l0",
  l1: "before:bg-l1",
  l2: "before:bg-l2",
  l3: "before:bg-l3",
};
const tagColors = {
  l0: "bg-l0 text-white",
  l1: "bg-l1 text-white",
  l2: "bg-l2 text-white",
  l3: "bg-l3 text-ink",
};
const checkColors = {
  l0: "stroke-l0",
  l1: "stroke-l1",
  l2: "stroke-l2",
  l3: "stroke-l3",
};
</script>

<template>
  <div v-if="auth.profile">
    <h1 class="mt-3 font-display text-2xl leading-none font-bold">Mi línea</h1>

    <div class="mt-3">
      <div
        v-for="(block, index) in blocks"
        :key="block.level.id"
        class="flex gap-3"
        :data-nivel="block.level.id"
      >
        <!-- Riel del nivel; los círculos negros son los transbordos -->
        <div
          class="relative w-[26px] shrink-0 before:absolute before:left-[9px] before:w-2 before:content-['']"
          :class="[
            railColors[block.level.color],
            index === 0 ? 'before:top-2.5 before:rounded-t' : 'before:top-0',
            index === blocks.length - 1
              ? 'before:bottom-2.5 before:rounded-b before:opacity-35'
              : 'before:bottom-0',
          ]"
        >
          <span
            v-if="index > 0"
            class="absolute top-0.5 left-[3px] z-10 box-border size-5 rounded-full border-4 border-ink bg-white"
          />
        </div>

        <div class="flex-1 pb-3">
          <div
            class="mb-0.5 flex items-center gap-1.5 font-display text-lg font-bold"
          >
            {{ block.level.nombre }}
            <em
              class="rounded px-1.5 py-px font-sans text-xs font-bold not-italic"
              :class="tagColors[block.level.color]"
            >
              {{ block.level.linea }}
            </em>
            <small class="font-sans text-xs font-normal text-ink-2">
              {{ block.label }}
            </small>
          </div>

          <!-- Nivel completo: el resumen con palomita -->
          <div
            v-if="block.status === 'completo'"
            class="flex gap-1.5 py-0.5 text-sm leading-snug"
          >
            <svg
              viewBox="0 0 24 24"
              class="mt-px size-[15px] shrink-0 fill-none stroke-3"
              :class="checkColors[block.level.color]"
            >
              <use href="#i-check" />
            </svg>
            {{ block.level.resumen }}
          </div>

          <!-- Nivel actual: lo logrado, dónde estás y lo que falta -->
          <template v-else-if="block.status === 'actual'">
            <div
              v-for="unit in block.done"
              :key="unit.id"
              class="flex gap-1.5 py-0.5 text-sm leading-snug"
            >
              <svg
                viewBox="0 0 24 24"
                class="mt-px size-[15px] shrink-0 fill-none stroke-3"
                :class="checkColors[block.level.color]"
              >
                <use href="#i-check" />
              </svg>
              {{ unit.meta_puedes }}
            </div>
            <div
              class="flex items-start gap-1.5 py-0.5 text-sm leading-snug font-bold"
            >
              <span
                class="mt-[3px] box-border size-3 shrink-0 rounded-full border-[3px] border-ink bg-yellow"
              />
              {{ current.titulo_es }}
            </div>
            <div
              v-if="block.later"
              class="py-0.5 pl-[19px] text-sm leading-snug text-ink-2"
            >
              {{ block.later }}
            </div>
          </template>

          <!-- Nivel futuro -->
          <div v-else class="py-0.5 text-sm leading-snug text-ink-2">
            {{ block.level.resumen }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
