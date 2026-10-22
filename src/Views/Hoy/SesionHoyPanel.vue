<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { units } from "@/curriculum/units";
import { useAuthStore } from "@/stores/auth";

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
const auth = useAuthStore();

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
    // Sin frases nuevas: o ya están las 6 de la meta, o ya aprendió las 4 del día
    text:
      props.newCount > 0
        ? `Aprender ${props.newCount} frases nuevas`
        : props.unitDone
          ? "Ya aprendiste las frases de esta meta"
          : "Ya aprendiste tus frases nuevas de hoy",
    muted: props.newCount === 0,
  },
  { text: "Conversar (llega pronto)", muted: true },
  { text: "Ver tu resumen", muted: false },
]);

// TEMPORAL (hasta la fase 5): con las frases de la meta aprendidas se pasa a la siguiente.
// En la última meta ya no hay a dónde seguir.
const isLastUnit = computed(
  () => auth.profile?.current_unit_id === units[units.length - 1].id,
);
const advancing = ref(false);
const advanceError = ref("");

async function advance(): Promise<void> {
  if (advancing.value) return;
  advancing.value = true;
  advanceError.value = "";
  try {
    // Si avanza, Hoy ve la nueva meta y vuelve a cargar los números
    if (!(await auth.advanceUnit())) {
      advanceError.value = "Todavía faltan frases de esta meta en tu repaso.";
    }
  } catch (error) {
    console.error(error);
    advanceError.value =
      "No pudimos pasarte a la próxima estación. Revisa tu conexión y vuelve a intentar.";
  } finally {
    advancing.value = false;
  }
}
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
      <p v-else-if="!unitDone" class="text-sm font-bold">
        Ya hiciste tu sesión de hoy. Vuelve mañana.
      </p>
      <template v-if="unitDone">
        <p v-if="isLastUnit" class="text-sm font-bold">
          Llegaste al final de la ruta.
        </p>
        <template v-else>
          <p v-if="advanceError" class="mt-2 mb-2 text-sm leading-snug">
            {{ advanceError }}
          </p>
          <!-- Si hay sesión, la acción rosa es "Empezar sesión" y esta va secundaria -->
          <Button
            data-testid="avance"
            :variant="canStart ? 'line' : 'go'"
            :class="{ 'mt-2': canStart }"
            :disabled="advancing"
            @click="advance"
          >
            Seguir a la próxima estación
          </Button>
        </template>
      </template>
    </template>
  </div>
</template>
