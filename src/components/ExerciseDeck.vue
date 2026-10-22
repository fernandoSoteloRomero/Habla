<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { checkAnswer } from "@/common/Exercises";
import type { Exercise } from "@/common/Exercises";
import { isIOSDevice } from "@/common/SpeechStrategy";
import { useSpeechOutput } from "@/composables/useSpeechOutput";

// Practicar: ejercicios cortos para ver si recuerdas las frases. Se marca la respuesta y se
// confirma con "Revisar" (no brinca solo). Lo que falla vuelve al final, hasta 3 intentos.
// Sin puntos ni rojo: solo "Correcto." o "Era: …".
const props = defineProps<{ exercises: Exercise[] }>();
const emit = defineEmits<{
  done: [result: { firstTry: number; total: number }];
}>();

const MAX_ATTEMPTS = 3;
const { supported: canSpeak, speak } = useSpeechOutput();
const isIOS = isIOSDevice(navigator);

const queue = ref(
  props.exercises.map((exercise) => ({ exercise, attempts: 0 })),
);
const index = ref(0);
const selected = ref<string | null>(null);
// Ordenar: las posiciones de las palabras que ya se colocaron, en orden
const placed = ref<number[]>([]);
const typed = ref("");
const result = ref<boolean | null>(null);
const requeued = ref(false);
const firstTry = ref(0);

const item = computed(() => queue.value[index.value]);
const exercise = computed(() => item.value.exercise);
const isLast = computed(() => index.value === queue.value.length - 1);

const TITLES: Record<Exercise["kind"], string> = {
  significado: "¿Qué significa?",
  escuchar: "¿Qué frase escuchaste?",
  ordenar: "Ordena las palabras",
  completar: "Completa la frase",
  escribir: "Escríbela en inglés",
};

const given = computed(() => {
  const ex = exercise.value;
  if (ex.kind === "ordenar")
    return placed.value.map((i) => ex.options[i]).join(" ");
  if (ex.kind === "escribir") return typed.value;
  return selected.value ?? "";
});
const canCheck = computed(() => {
  if (exercise.value.kind === "ordenar") {
    return placed.value.length === exercise.value.options.length;
  }
  return given.value.trim() !== "";
});
// Lo que se muestra como la respuesta buena
const shownAnswer = computed(() => {
  const ex = exercise.value;
  return ex.kind === "completar" ? ex.source.en : ex.answer;
});

function check(): void {
  if (!canCheck.value || result.value !== null) return;
  const current = item.value;
  current.attempts += 1;
  result.value = checkAnswer(current.exercise, given.value);
  if (result.value && current.attempts === 1) firstTry.value += 1;
  requeued.value = !result.value && current.attempts < MAX_ATTEMPTS;
  if (requeued.value) {
    queue.value.push({
      exercise: current.exercise,
      attempts: current.attempts,
    });
  }
}

function next(): void {
  if (isLast.value) {
    emit("done", { firstTry: firstTry.value, total: props.exercises.length });
    return;
  }
  index.value += 1;
  selected.value = null;
  placed.value = [];
  typed.value = "";
  result.value = null;
  requeued.value = false;
}

function place(i: number): void {
  if (result.value === null) placed.value = [...placed.value, i];
}
function unplace(position: number): void {
  if (result.value === null) {
    placed.value = placed.value.filter((_, p) => p !== position);
  }
}
</script>

<template>
  <div v-if="item" class="flex flex-1 flex-col">
    <p class="flex items-center gap-2 text-sm text-ink-2">
      Ejercicio {{ index + 1 }} de {{ queue.length }}
      <span
        v-if="item.attempts > 0 && result === null"
        class="rounded bg-yellow px-1.5 py-px text-xs font-bold text-ink"
      >
        Otra vez
      </span>
    </p>
    <h1 class="mt-3 text-xl leading-tight font-bold">
      {{ TITLES[exercise.kind] }}
    </h1>

    <!-- Lo que se pregunta -->
    <p
      v-if="exercise.kind === 'significado' || exercise.kind === 'completar'"
      class="mt-3 text-xl leading-snug font-bold"
      lang="en"
    >
      {{ exercise.prompt }}
    </p>
    <p
      v-else-if="exercise.kind === 'ordenar' || exercise.kind === 'escribir'"
      class="mt-3 text-xl leading-snug font-bold"
    >
      {{ exercise.prompt }}
    </p>

    <div
      v-if="
        canSpeak &&
        (exercise.kind === 'escuchar' || exercise.kind === 'significado')
      "
      class="mt-3 flex gap-2"
    >
      <button
        type="button"
        class="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink font-bold text-white"
        @click="speak(exercise.source.en, false)"
      >
        <svg class="size-[18px] fill-white"><use href="#i-speaker" /></svg>
        Escuchar
      </button>
      <button
        type="button"
        class="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-concrete font-bold"
        @click="speak(exercise.source.en, true)"
      >
        Más lento
      </button>
    </div>

    <!-- Elegir una opción (diseño: .l-ans y .l-opt) -->
    <div
      v-if="exercise.options.length > 0 && exercise.kind !== 'ordenar'"
      role="radiogroup"
      :aria-label="TITLES[exercise.kind]"
      class="mt-3.5 flex flex-col gap-[7px]"
    >
      <button
        v-for="option in exercise.options"
        :key="option"
        type="button"
        role="radio"
        :aria-checked="selected === option"
        :lang="exercise.kind === 'significado' ? 'es' : 'en'"
        :disabled="result !== null"
        class="flex items-center gap-3 rounded-xl text-left text-base"
        :class="
          selected === option
            ? 'border-[3px] border-ink px-[13px] py-[11px] font-bold'
            : 'border-2 border-rule px-3.5 py-3'
        "
        @click="selected = option"
      >
        {{ option }}
      </button>
    </div>

    <!-- Ordenar: las colocadas arriba (se tocan para quitarlas) y las que faltan abajo -->
    <template v-if="exercise.kind === 'ordenar'">
      <div
        data-testid="colocadas"
        class="mt-3.5 flex min-h-[52px] flex-wrap gap-1.5 border-b-2 border-ink pb-2"
        lang="en"
      >
        <button
          v-for="(optionIndex, position) in placed"
          :key="`${optionIndex}-${position}`"
          type="button"
          class="rounded-lg bg-ink px-2.5 py-2 text-base font-bold text-white"
          @click="unplace(position)"
        >
          {{ exercise.options[optionIndex] }}
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-1.5" lang="en">
        <template v-for="(word, i) in exercise.options" :key="`${word}-${i}`">
          <button
            v-if="!placed.includes(i)"
            type="button"
            class="rounded-lg border-2 border-rule px-2.5 py-2 text-base font-bold"
            @click="place(i)"
          >
            {{ word }}
          </button>
        </template>
      </div>
    </template>

    <!-- Escribir o dictar -->
    <template v-if="exercise.kind === 'escribir'">
      <label for="escribir" class="mt-4 text-sm font-bold">
        Tu respuesta en inglés
      </label>
      <textarea
        id="escribir"
        v-model="typed"
        rows="2"
        maxlength="300"
        lang="en"
        autocapitalize="sentences"
        :disabled="result !== null"
        class="mt-1.5 rounded-xl border-2 border-ink p-3 text-base"
      />
      <p v-if="isIOS" class="mt-1.5 text-xs text-ink-2">
        En el iPhone puedes tocar el micrófono del teclado para dictar.
      </p>
    </template>

    <div class="min-h-4 flex-1" />

    <!-- Resultado: verde si salió, azul si no (nunca rojo) -->
    <div
      v-if="result !== null"
      class="mt-3 rounded-[4px_10px_10px_4px] border-l-[5px] px-[11px] py-[9px] text-sm leading-snug"
      :class="result ? 'border-l2 bg-l2-soft' : 'border-l1 bg-l1-soft'"
      aria-live="polite"
    >
      <b v-if="result" class="block">Correcto.</b>
      <b v-else class="block">Era: “{{ shownAnswer }}”.</b>
      <span
        v-if="result && exercise.kind === 'escribir'"
        class="mt-0.5 block"
        lang="en"
      >
        {{ exercise.answer }}
      </span>
      <span
        v-if="exercise.kind === 'completar' && exercise.source.por_que"
        class="mt-0.5 block"
      >
        {{ exercise.source.por_que }}
      </span>
      <span v-if="requeued" class="mt-0.5 block text-ink-2">
        La vas a ver otra vez al final.
      </span>
    </div>

    <Button
      v-if="result === null"
      class="mt-4"
      :disabled="!canCheck"
      @click="check"
    >
      Revisar
    </Button>
    <Button v-else class="mt-4" @click="next">
      {{ isLast ? "Terminar" : "Siguiente" }}
    </Button>
  </div>
</template>
