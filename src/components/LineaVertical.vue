<script setup lang="ts">
import PictoTile from "@/components/PictoTile.vue";
import type { TileColor } from "@/common/PictogramTypes";
import { getStationState } from "@/common/StationStates";
import type { StationState } from "@/common/StationStates";
import type { Level } from "@/curriculum/levels";
import type { Unit } from "@/curriculum/units";

// Línea vertical con estaciones (diseño: .l-line y .l-st).
// El slot se pinta justo debajo de la estación actual (ej. la sesión de hoy).
const props = defineProps<{
  stations: Unit[];
  currentUnitId: string;
  color: Level["color"];
  largeCurrent?: boolean;
}>();

// Clases completas por color de línea (Tailwind no detecta clases armadas)
const railColors = {
  l0: "before:bg-l0",
  l1: "before:bg-l1",
  l2: "before:bg-l2",
  l3: "before:bg-l3",
};
const dotBorders = {
  l0: "border-l0",
  l1: "border-l1",
  l2: "border-l2",
  l3: "border-l3",
};
const dotFills = { l0: "bg-l0", l1: "bg-l1", l2: "bg-l2", l3: "bg-l3" };

function stateOf(unit: Unit): StationState {
  return getStationState(unit.id, props.currentUnitId);
}

function dotClass(state: StationState): string {
  if (state === "aqui") {
    return "-left-[35px] top-0 size-[26px] border-[6px] border-ink bg-yellow";
  }
  const fill = state === "lograda" ? dotFills[props.color] : "bg-white";
  return `-left-[31px] top-[3px] size-[18px] border-4 ${dotBorders[props.color]} ${fill}`;
}

function tileColor(state: StationState): TileColor {
  if (state === "aqui") return "ink";
  if (state === "lograda") return props.color;
  return "rule";
}
</script>

<template>
  <div
    class="relative mt-3.5 pl-[34px] before:absolute before:top-2 before:bottom-0 before:left-[11px] before:w-2 before:rounded before:content-['']"
    :class="railColors[color]"
  >
    <template v-for="unit in stations" :key="unit.id">
      <div
        class="relative flex min-h-9 items-start gap-2.5"
        :class="{ 'opacity-75': stateOf(unit) === 'proxima' }"
        :data-estado="stateOf(unit)"
      >
        <span
          class="absolute box-border rounded-full"
          :class="dotClass(stateOf(unit))"
        />
        <PictoTile
          :name="unit.pictograma"
          size="sm"
          :bg="tileColor(stateOf(unit))"
        />
        <div>
          <div
            class="pt-px font-display leading-[1.1] font-semibold"
            :class="[
              stateOf(unit) === 'aqui' ? 'text-ink' : 'text-ink-2',
              stateOf(unit) === 'aqui' && largeCurrent ? 'text-xl' : 'text-lg',
            ]"
          >
            {{ unit.titulo_es }}
          </div>
          <span
            v-if="stateOf(unit) === 'aqui'"
            class="mt-[3px] inline-block rounded-[4px] bg-ink px-[7px] py-0.5 text-xs font-bold text-white"
          >
            Estás aquí
          </span>
        </div>
      </div>
      <slot v-if="stateOf(unit) === 'aqui'" />
    </template>
  </div>
</template>
