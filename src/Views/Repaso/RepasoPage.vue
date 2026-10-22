<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { localDate } from "@/common/Dates";
import { MAX_REVIEWS_PER_DAY } from "@/common/SpacedRepetition";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type {
  PhraseStats,
  ReviewQueue,
} from "@/Services/interfaces/Phrases/PhraseInterface";

// Pestaña Repaso (pantalla 3.1): para repasar cuando quieras. No usa IA.
const router = useRouter();
const { speak } = useSpeechOutput();

const queue = ref<ReviewQueue | null>(null);
const stats = ref<PhraseStats | null>(null);
const loadFailed = ref(false);

const pending = computed(() => queue.value?.phrases.length ?? 0);
const doneForToday = computed(
  () => (queue.value?.reviewedToday ?? 0) >= MAX_REVIEWS_PER_DAY,
);
// Unos 36 segundos por frase (diseño: 8 frases, 5 minutos)
const minutes = computed(() => Math.ceil(pending.value * 0.6));

async function load(): Promise<void> {
  loadFailed.value = false;
  const today = localDate(new Date());
  try {
    [queue.value, stats.value] = await Promise.all([
      PhrasesService.GetReviewQueue(today),
      PhrasesService.GetStats(today),
    ]);
  } catch (error) {
    console.error(error);
    loadFailed.value = true;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h1 class="mt-3 font-display text-2xl leading-none font-bold">Repaso</h1>
    <p class="mt-1 text-sm text-ink-2">
      Las frases regresan justo antes de que se te olviden.
    </p>

    <div
      v-if="loadFailed"
      class="mt-3.5 flex gap-[11px] rounded-xl bg-concrete p-3 text-sm leading-snug"
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

    <template v-else-if="queue && stats">
      <!-- Lo de hoy (diseño: .l-panel) -->
      <div class="mt-3.5 rounded-[14px] bg-concrete p-3.5">
        <template v-if="pending > 0">
          <h2 class="flex items-baseline justify-between text-base font-bold">
            Hoy toca repasar {{ pending }} frases
            <span class="text-sm font-normal text-ink-2"
              >{{ minutes }} min</span
            >
          </h2>
          <Button
            class="mt-3"
            @click="router.push({ name: 'repaso-tarjetas' })"
          >
            Repasar ahora
          </Button>
        </template>
        <template v-else-if="doneForToday">
          <h2 class="text-base font-bold">
            Ya repasaste {{ MAX_REVIEWS_PER_DAY }} frases hoy
          </h2>
          <p class="mt-1 text-sm text-ink-2">Mañana te esperan más.</p>
        </template>
        <template v-else>
          <h2 class="text-base font-bold">No tienes frases pendientes hoy</h2>
          <p class="mt-1 text-sm text-ink-2">
            Las frases que aprendas en tu sesión te van a esperar aquí.
          </p>
        </template>
      </div>

      <!-- Datos (diseño: .l-facts) -->
      <div
        class="mt-1 grid grid-cols-3 border-y-2 border-ink text-center text-xs text-ink-2"
      >
        <div class="py-2">
          <b class="block font-display text-xl leading-none text-ink">
            {{ stats.tomorrow }}
          </b>
          mañana
        </div>
        <div class="border-l border-rule py-2">
          <b class="block font-display text-xl leading-none text-ink">
            {{ stats.week }}
          </b>
          esta semana
        </div>
        <div class="border-l border-rule py-2">
          <b class="block font-display text-xl leading-none text-ink">
            {{ stats.total }}
          </b>
          en total
        </div>
      </div>

      <!-- Las que más cuestan (diseño: .l-list) -->
      <template v-if="stats.hardest.length > 0">
        <h2 class="mt-3.5 text-base font-bold">Las que más te cuestan</h2>
        <div>
          <div
            v-for="p in stats.hardest"
            :key="p.id"
            class="flex items-center gap-2.5 border-b border-rule py-[9px] last:border-b-0"
          >
            <div>
              <b class="block text-sm" lang="en">{{ p.en }}</b>
              <span class="text-xs text-ink-2">{{ p.es }}</span>
            </div>
            <button
              type="button"
              class="ml-auto grid size-[34px] shrink-0 place-items-center rounded-lg bg-concrete"
              :aria-label="`Escuchar ${p.en}`"
              @click="speak(p.en, false)"
            >
              <svg class="size-4 fill-ink"><use href="#i-speaker" /></svg>
            </button>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
