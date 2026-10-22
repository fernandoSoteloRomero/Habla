<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import ExerciseDeck from "@/components/ExerciseDeck.vue";
import { Button } from "@/components/ui/button";
import { buildExercises, shuffle } from "@/common/Exercises";
import type { Exercise } from "@/common/Exercises";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import { useAuthStore } from "@/stores/auth";

// Practicar desde la pestaña Repaso: ejercicios con frases de tu repaso, cuando quieras.
// No usa IA (es instantáneo y gratis) y no cambia cuándo vuelve cada frase.
const router = useRouter();
const auth = useAuthStore();
const { supported: canSpeak } = useSpeechOutput();

const RECENT = 20;
const PER_ROUND = 8;

const exercises = ref<Exercise[] | null>(null);
const loadFailed = ref(false);
const result = ref<{ firstTry: number; total: number } | null>(null);
// Cambia en cada ronda para que ExerciseDeck empiece de cero
const round = ref(0);

async function load(): Promise<void> {
  loadFailed.value = false;
  result.value = null;
  try {
    const recent = await PhrasesService.GetRecent(RECENT);
    const picked = shuffle(recent, Math.random).slice(0, PER_ROUND);
    exercises.value = buildExercises({
      phrases: picked.map((p) => ({ en: p.en, es: p.es })),
      pool: recent,
      level: auth.profile?.level ?? "L0",
      canSpeak,
    });
    round.value += 1;
  } catch (error) {
    console.error(error);
    loadFailed.value = true;
  }
}

onMounted(load);
</script>

<template>
  <div class="flex min-h-[70dvh] flex-col pt-3">
    <div
      v-if="loadFailed"
      class="flex gap-[11px] rounded-xl bg-concrete p-3 text-sm leading-snug"
    >
      <span
        class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink"
      >
        <svg class="size-[19px] fill-white"><use href="#i-nowifi" /></svg>
      </span>
      <div>
        <b class="mb-0.5 block">Sin conexión a internet</b>
        Revisa tu conexión y vuelve a intentar.<br />
        <button
          type="button"
          class="mt-1.5 font-bold text-l1 underline underline-offset-[3px]"
          @click="load"
        >
          Reintentar
        </button>
      </div>
    </div>

    <template
      v-else-if="result !== null || (exercises && exercises.length === 0)"
    >
      <h1 class="mt-4 font-display text-2xl leading-none font-bold">
        {{
          result
            ? `Listo, acertaste ${result.firstTry} de ${result.total} a la primera`
            : "Todavía no tienes frases para practicar"
        }}
      </h1>
      <p v-if="!result" class="mt-1 text-sm text-ink-2">
        Las frases que aprendas en tu sesión te van a esperar aquí.
      </p>
      <div class="flex-1" />
      <Button class="mt-6" @click="router.push({ name: 'repaso' })">
        Volver a Repaso
      </Button>
      <Button v-if="result" variant="quiet" class="mt-2" @click="load">
        Practicar otra vez
      </Button>
    </template>

    <ExerciseDeck
      v-else-if="exercises"
      :key="round"
      :exercises="exercises"
      @done="(r) => (result = r)"
    />
  </div>
</template>
