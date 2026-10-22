<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import ReviewDeck from "@/components/ReviewDeck.vue";
import { Button } from "@/components/ui/button";
import { localDate } from "@/common/Dates";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";

// Repasar desde la pestaña Repaso (fuera de la sesión de hoy)
const router = useRouter();
// "Hoy" se calcula una sola vez al abrir: si se pasa la medianoche a media sesión, no cambia
const today = localDate(new Date());

const phrases = ref<Phrase[] | null>(null);
const loadFailed = ref(false);
const reviewed = ref<number | null>(null);

async function load(): Promise<void> {
  loadFailed.value = false;
  try {
    phrases.value = (await PhrasesService.GetReviewQueue(today)).phrases;
  } catch (error) {
    console.error(error);
    loadFailed.value = true;
  }
}

function back(): void {
  router.push({ name: "repaso" });
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
      v-else-if="reviewed !== null || (phrases && phrases.length === 0)"
    >
      <h1 class="mt-4 font-display text-2xl leading-none font-bold">
        {{
          reviewed
            ? `Listo, repasaste ${reviewed} frases`
            : "No tienes frases pendientes hoy"
        }}
      </h1>
      <div class="flex-1" />
      <Button class="mt-6" @click="back">Volver a Repaso</Button>
    </template>

    <ReviewDeck
      v-else-if="phrases"
      :phrases="phrases"
      :today="today"
      @done="(n) => (reviewed = n)"
    />
  </div>
</template>
