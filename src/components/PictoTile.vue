<script setup lang="ts">
import { computed } from "vue";
import type { PictogramName, TileColor } from "@/common/PictogramTypes";

const props = withDefaults(
  defineProps<{
    name: PictogramName;
    size?: "sm" | "md" | "lg";
    bg?: TileColor;
  }>(),
  { size: "md", bg: "ink" },
);

// Clases completas: Tailwind no detecta clases armadas con template strings
const tileSizes = {
  sm: "size-[30px] rounded-[7px]",
  md: "size-10 rounded-[9px]",
  lg: "size-24 rounded-[20px]",
};
const iconSizes = {
  sm: "size-[18px]",
  md: "size-6",
  lg: "size-[60px]",
};
const backgrounds = {
  ink: "bg-ink",
  rosa: "bg-rosa",
  rule: "bg-rule",
  l0: "bg-l0",
  l1: "bg-l1",
  l2: "bg-l2",
  l3: "bg-l3",
};

const tileClass = computed(
  () => `${tileSizes[props.size]} ${backgrounds[props.bg]}`,
);

// El naranja de B1 solo lleva negro encima (blanco sobre naranja no da el contraste AA)
const iconClass = computed(
  () =>
    `${iconSizes[props.size]} ${props.bg === "l3" ? "fill-ink" : "fill-white"}`,
);
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center"
    :class="tileClass"
    aria-hidden="true"
  >
    <svg :class="iconClass">
      <use :href="`#i-${name}`" />
    </svg>
  </span>
</template>
