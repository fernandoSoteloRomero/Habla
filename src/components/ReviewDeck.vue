<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { intervalLabel, nextIntervals, rate } from "@/common/SpacedRepetition";
import type { Rating } from "@/common/SpacedRepetition";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";

// Tarjetas de repaso (pantalla 2.2): primero intentas recordar; luego ves el significado y
// dices qué tan fácil fue. La app calcula cuándo vuelve cada frase (src/common/SpacedRepetition).
const props = defineProps<{ phrases: Phrase[]; today: string }>();
const emit = defineEmits<{ done: [reviewed: number] }>();

const { speak } = useSpeechOutput();
const index = ref(0);
const revealed = ref(false);
const saving = ref(false);
const saveFailed = ref(false);

const phrase = computed(() => props.phrases[index.value]);
const intervals = computed(() => nextIntervals(phrase.value));

const ratings: { id: Rating; label: string; color: string }[] = [
  { id: "no-me-acorde", label: "No me acordé", color: "border-t-rosa" },
  { id: "me-costo", label: "Me costó", color: "border-t-yellow" },
  { id: "facil", label: "Fácil", color: "border-t-l2" },
];

async function choose(rating: Rating): Promise<void> {
  if (saving.value) return;
  saving.value = true;
  saveFailed.value = false;
  try {
    await PhrasesService.SaveReview(
      phrase.value.id,
      rate(phrase.value, rating, props.today),
    );
    if (index.value === props.phrases.length - 1) {
      emit("done", props.phrases.length);
      return;
    }
    index.value += 1;
    revealed.value = false;
  } catch (error) {
    // La tarjeta se queda: se puede volver a calificar
    console.error(error);
    saveFailed.value = true;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="phrase" class="flex flex-1 flex-col">
    <p class="text-sm text-ink-2">
      Frase {{ index + 1 }} de {{ phrases.length }}
    </p>

    <!-- Tarjeta (diseño: .l-flash) -->
    <div class="mt-[22px] rounded-2xl border-[3px] border-ink px-4 py-[18px]">
      <p class="text-xs text-ink-2">¿Recuerdas qué significa?</p>
      <p class="mt-2 text-xl leading-snug font-bold" lang="en">
        {{ phrase.en }}
      </p>
      <div class="mt-3.5 flex gap-2">
        <button
          type="button"
          class="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink font-bold text-white"
          @click="speak(phrase.en, false)"
        >
          <svg class="size-[18px] fill-white"><use href="#i-speaker" /></svg>
          Escuchar
        </button>
        <button
          type="button"
          class="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-concrete font-bold"
          @click="speak(phrase.en, true)"
        >
          Más lento
        </button>
      </div>
      <template v-if="revealed">
        <hr
          class="mt-3.5 mb-2.5 border-0 border-t-2 border-dashed border-rule"
        />
        <p class="text-base text-ink-2">{{ phrase.es }}</p>
      </template>
    </div>

    <div class="flex-1" />

    <div
      v-if="saveFailed"
      class="mb-3 flex gap-[11px] rounded-xl bg-concrete p-3 text-sm leading-snug"
    >
      <span
        class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink"
      >
        <svg class="size-[19px] fill-white"><use href="#i-nowifi" /></svg>
      </span>
      <p>No se guardó tu respuesta. Revisa tu conexión y vuelve a intentar.</p>
    </div>

    <Button
      v-if="!revealed"
      variant="line"
      class="mt-4"
      @click="revealed = true"
    >
      Ver significado
    </Button>
    <template v-else>
      <p class="mt-4 mb-2 text-xs font-bold text-ink">¿Qué tan fácil fue?</p>
      <!-- Calificación (diseño: .l-rate) -->
      <div class="grid grid-cols-3 gap-[7px]">
        <button
          v-for="r in ratings"
          :key="r.id"
          type="button"
          class="min-h-[52px] rounded-[10px] border-2 border-t-[6px] border-rule px-1.5 py-[9px] text-center text-sm leading-tight font-bold disabled:opacity-50"
          :class="r.color"
          :disabled="saving"
          @click="choose(r.id)"
        >
          {{ r.label }}
          <small class="mt-[3px] block text-xs font-normal text-ink-2">
            {{ intervalLabel(intervals[r.id]) }}
          </small>
        </button>
      </div>
    </template>
  </div>
</template>
