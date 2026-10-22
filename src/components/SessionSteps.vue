<script setup lang="ts">
// Mini línea de la sesión (diseño: .l-mini): Repasar, Aprender, Conversar y Resumen.
type Step = "repasar" | "aprender" | "conversar" | "resumen";

const props = defineProps<{ current: Step }>();

const steps: { id: Step; label: string }[] = [
  { id: "repasar", label: "Repasar" },
  { id: "aprender", label: "Aprender" },
  { id: "conversar", label: "Conversar" },
  { id: "resumen", label: "Resumen" },
];
const currentIndex = (): number =>
  steps.findIndex((s) => s.id === props.current);
</script>

<template>
  <div :data-paso="current">
    <div class="mt-2.5 flex items-center">
      <template v-for="(step, i) in steps" :key="step.id">
        <span
          v-if="i > 0"
          class="h-[5px] flex-1"
          :class="i <= currentIndex() ? 'bg-rosa' : 'bg-rule'"
        />
        <span
          class="box-border shrink-0 rounded-full"
          :class="
            i === currentIndex()
              ? 'size-5 border-[5px] border-ink bg-yellow'
              : i < currentIndex()
                ? 'size-3.5 border-[3px] border-rosa bg-rosa'
                : 'size-3.5 border-[3px] border-rule bg-white'
          "
        />
      </template>
    </div>
    <div class="mt-1 flex justify-between text-xs text-ink-2">
      <component
        :is="step.id === current ? 'b' : 'span'"
        v-for="step in steps"
        :key="step.id"
        :class="{ 'text-ink': step.id === current }"
      >
        {{ step.label }}
      </component>
    </div>
  </div>
</template>
