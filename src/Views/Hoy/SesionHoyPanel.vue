<script setup lang="ts">
// Panel "Sesión de hoy" (diseño: .l-panel y .l-steps). El botón "Empezar sesión" llega en la fase 3.
const steps = [
  "Repasar frases",
  "Aprender frases nuevas",
  "Conversar en inglés",
  "Ver tu resumen",
];
</script>

<template>
  <div class="mt-1.5 mb-2.5 rounded-[14px] bg-concrete p-3.5">
    <h4 class="flex items-baseline justify-between text-base font-bold">
      Sesión de hoy
      <span class="text-sm font-normal text-ink-2">22 minutos</span>
    </h4>
    <ol class="mt-1.5 mb-2.5 flex flex-col gap-1">
      <li
        v-for="(step, i) in steps"
        :key="step"
        class="flex items-center gap-2 text-sm"
      >
        <span
          class="grid size-[22px] shrink-0 place-items-center rounded-full border-2 border-ink text-xs font-bold"
        >
          {{ i + 1 }}
        </span>
        {{ step }}
      </li>
    </ol>
    <p class="text-xs text-ink-2">
      Las sesiones llegan en la próxima versión de Habla.
    </p>
  </div>
</template>
