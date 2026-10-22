<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";

// Panel "Sesión de hoy" (diseño: .l-panel y .l-steps). Los números los carga HoyPage una sola vez
// (el panel se pinta dos veces: celular y computadora).
const props = defineProps<{
  pending: number;
  newCount: number;
  unitDone: boolean;
  status: "cargando" | "listo" | "error";
}>();
const emit = defineEmits<{ retry: [] }>();

const router = useRouter();

// ~36 s por repaso y ~90 s por frase nueva
const minutes = computed(() =>
  Math.ceil(props.pending * 0.6 + props.newCount * 1.5),
);
const canStart = computed(() => props.pending + props.newCount > 0);

const steps = computed(() => [
  {
    text:
      props.pending > 0
        ? `Repasar ${props.pending} frases`
        : "Nada que repasar hoy",
    muted: props.pending === 0,
  },
  {
    text:
      props.newCount > 0
        ? `Aprender ${props.newCount} frases nuevas`
        : "Ya aprendiste las frases de esta meta",
    muted: props.newCount === 0,
  },
  { text: "Conversar (llega pronto)", muted: true },
  { text: "Ver tu resumen", muted: false },
]);
</script>

<template>
  <div class="mt-1.5 mb-2.5 rounded-[14px] bg-concrete p-3.5">
    <h4 class="flex items-baseline justify-between text-base font-bold">
      Sesión de hoy
      <span
        v-if="status === 'listo' && canStart"
        class="text-sm font-normal text-ink-2"
      >
        {{ minutes }} minutos
      </span>
    </h4>

    <p v-if="status === 'cargando'" class="mt-1.5 text-sm text-ink-2">
      Cargando tu sesión…
    </p>

    <div v-else-if="status === 'error'" class="mt-1.5 text-sm">
      No pudimos cargar tu sesión. Revisa tu conexión.
      <button
        type="button"
        class="ml-1 font-bold text-l1 underline underline-offset-[3px]"
        @click="emit('retry')"
      >
        Reintentar
      </button>
    </div>

    <template v-else>
      <ol class="mt-1.5 mb-2.5 flex flex-col gap-1">
        <li
          v-for="(step, i) in steps"
          :key="i"
          class="flex items-center gap-2 text-sm"
          :class="{ 'text-ink-2': step.muted }"
        >
          <span
            class="grid size-[22px] shrink-0 place-items-center rounded-full border-2 text-xs font-bold"
            :class="step.muted ? 'border-rule' : 'border-ink'"
          >
            {{ i + 1 }}
          </span>
          {{ step.text }}
        </li>
      </ol>
      <Button v-if="canStart" @click="router.push({ name: 'sesion' })">
        Empezar sesión
      </Button>
      <slot v-if="unitDone" name="avance" />
    </template>
  </div>
</template>
