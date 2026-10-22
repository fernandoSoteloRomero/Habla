<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import LessonDeck from "@/components/LessonDeck.vue";
import ReviewDeck from "@/components/ReviewDeck.vue";
import SessionSteps from "@/components/SessionSteps.vue";
import { Button } from "@/components/ui/button";
import { localDate } from "@/common/Dates";
import { pickNewPhrases } from "@/common/LessonPicker";
import { getUnit } from "@/curriculum/units";
import type { KeyPhrase } from "@/curriculum/units";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";
import { useAuthStore } from "@/stores/auth";

// Sesión de hoy (spec 5.3), sin IA en la fase 3: Repasar → Aprender → Resumen.
// "Conversar" con el personaje llega en la fase 4.
const auth = useAuthStore();
const router = useRouter();
// "Hoy" se calcula una sola vez al abrir la sesión
const today = localDate(new Date());
const unit = computed(() => getUnit(auth.profile?.current_unit_id ?? ""));

type Stage = "cargando" | "error" | "repasar" | "aprender" | "resumen";
const stage = ref<Stage>("cargando");
const toReview = ref<Phrase[]>([]);
const toLearn = ref<KeyPhrase[]>([]);
const reviewed = ref(0);
const learned = ref(0);

async function load(): Promise<void> {
  stage.value = "cargando";
  try {
    const [queue, learnedEn, learnedToday] = await Promise.all([
      PhrasesService.GetReviewQueue(today),
      PhrasesService.GetLearnedEn(unit.value.id),
      PhrasesService.CountLearnedToday(today),
    ]);
    toReview.value = queue.phrases;
    toLearn.value = pickNewPhrases(unit.value, learnedEn, learnedToday);
    stage.value =
      toReview.value.length > 0
        ? "repasar"
        : toLearn.value.length > 0
          ? "aprender"
          : "resumen";
  } catch (error) {
    console.error(error);
    stage.value = "error";
  }
}

function afterReview(count: number): void {
  reviewed.value = count;
  stage.value = toLearn.value.length > 0 ? "aprender" : "resumen";
}
function afterLesson(): void {
  learned.value = toLearn.value.length;
  stage.value = "resumen";
}

onMounted(load);
</script>

<template>
  <div class="flex min-h-[70dvh] flex-col pt-3">
    <div
      v-if="stage === 'error'"
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

    <p v-else-if="stage === 'cargando'" class="text-sm text-ink-2">
      Cargando tu sesión…
    </p>

    <template v-else>
      <SessionSteps :current="stage" class="mb-4" />

      <ReviewDeck
        v-if="stage === 'repasar'"
        :phrases="toReview"
        :today="today"
        @done="afterReview"
      />

      <LessonDeck
        v-else-if="stage === 'aprender'"
        :unit="unit"
        :phrases="toLearn"
        :today="today"
        @done="afterLesson"
      />

      <!-- Resumen (pantalla 2.6, sin la parte de la conversación) -->
      <template v-else>
        <h1 class="mt-4 font-display text-2xl leading-none font-bold">
          Sesión terminada
        </h1>
        <p class="mt-1 text-sm text-ink-2">En {{ unit.titulo_es }}.</p>
        <ul class="mt-4 flex flex-col gap-1.5 text-base">
          <li v-if="reviewed > 0" class="flex gap-2">
            <svg
              viewBox="0 0 24 24"
              class="mt-px size-4 shrink-0 fill-none stroke-l2 stroke-[3.2]"
            >
              <use href="#i-check" />
            </svg>
            Repasaste {{ reviewed }} frases
          </li>
          <li v-if="learned > 0" class="flex gap-2">
            <svg
              viewBox="0 0 24 24"
              class="mt-px size-4 shrink-0 fill-none stroke-l2 stroke-[3.2]"
            >
              <use href="#i-check" />
            </svg>
            Aprendiste {{ learned }} frases nuevas
          </li>
          <li v-if="reviewed === 0 && learned === 0" class="text-ink-2">
            Hoy no había frases para repasar ni para aprender.
          </li>
        </ul>
        <p v-if="learned > 0" class="mt-3 text-xs text-ink-2">
          Agregamos {{ learned }} frases a tu repaso. Vuelven mañana.
        </p>
        <div class="flex-1" />
        <Button class="mt-6" @click="router.push({ name: 'hoy' })">
          Terminar
        </Button>
      </template>
    </template>
  </div>
</template>
