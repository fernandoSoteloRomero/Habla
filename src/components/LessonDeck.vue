<script setup lang="ts">
import { computed, ref } from "vue";
import { supportFor } from "@shared/sessionPrompts";
import PictoTile from "@/components/PictoTile.vue";
import SayItAloud from "@/components/SayItAloud.vue";
import { Button } from "@/components/ui/button";
import { addDays } from "@/common/Dates";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import { getLevel } from "@/curriculum/levels";
import type { KeyPhrase, Unit } from "@/curriculum/units";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import type { LessonExtra } from "@/Services/interfaces/Session/SessionInterface";
import { useAuthStore } from "@/stores/auth";

// Aprender (pantalla 2.3): frases nuevas de la meta con su significado, audio, nota,
// "Otro ejemplo" (lo escribe la IA según el motivo) y "Decirla en voz alta".
// Al terminar entran al repaso para mañana. Sin IA, se ve igual pero sin el ejemplo.
const props = defineProps<{
  unit: Unit;
  phrases: KeyPhrase[];
  today: string;
  // Llegan cuando la IA termina de preparar la sesión (pueden llegar tarde)
  extras?: LessonExtra[];
}>();
const emit = defineEmits<{ done: [] }>();

const auth = useAuthStore();
const { speak } = useSpeechOutput();
const index = ref(0);
const saving = ref(false);
const saveFailed = ref(false);

const phrase = computed(() => props.phrases[index.value]);
const isLast = computed(() => index.value === props.phrases.length - 1);
const color = computed(() => getLevel(props.unit.nivel).color);
const extra = computed(() =>
  props.extras?.find((e) => e.en === phrase.value?.en),
);
const nota = computed(() => phrase.value?.nota || extra.value?.nota || "");
// L0 y A1 ven la traducción del ejemplo (spec 5.3)
const showTranslation = computed(
  () => supportFor(props.unit.nivel).translationVisible,
);

async function next(): Promise<void> {
  if (!isLast.value) {
    index.value += 1;
    return;
  }
  if (saving.value || !auth.profile) return;
  saving.value = true;
  saveFailed.value = false;
  try {
    await PhrasesService.AddLessonPhrases(
      auth.profile.user_id,
      props.unit.id,
      props.phrases,
      addDays(props.today, 1),
    );
    emit("done");
  } catch (error) {
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
      Frase nueva {{ index + 1 }} de {{ phrases.length }}
    </p>

    <div class="mt-5 flex items-start gap-3">
      <PictoTile :name="unit.pictograma" :bg="color" />
      <div>
        <p class="text-xl leading-snug font-bold" lang="en">{{ phrase.en }}</p>
        <p class="mt-1.5 text-base text-ink-2">{{ phrase.es }}</p>
      </div>
    </div>

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

    <!-- Nota corta (diseño: .l-note) -->
    <p
      v-if="nota"
      class="mt-3.5 rounded-[4px_10px_10px_4px] border-l-[5px] border-yellow bg-yellow-soft px-[11px] py-[9px] text-sm leading-snug"
    >
      {{ nota }}
    </p>

    <!-- Otro ejemplo (lo escribe la IA según el motivo) -->
    <template v-if="extra?.ejemplo_en">
      <p class="mt-3 text-[13px] text-ink-2">Otro ejemplo</p>
      <p class="mt-0.5 text-[15px] font-bold" lang="en">
        {{ extra.ejemplo_en }}
      </p>
      <p v-if="showTranslation" class="text-sm text-ink-2">
        {{ extra.ejemplo_es }}
      </p>
    </template>

    <div class="flex-1" />

    <SayItAloud :key="phrase.en" :phrase="phrase.en" class="mt-4" />

    <div
      v-if="saveFailed"
      class="mb-3 flex gap-[11px] rounded-xl bg-concrete p-3 text-sm leading-snug"
    >
      <span
        class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink"
      >
        <svg class="size-[19px] fill-white"><use href="#i-nowifi" /></svg>
      </span>
      <p>
        No se guardaron tus frases nuevas. Revisa tu conexión y vuelve a
        intentar.
      </p>
    </div>

    <Button class="mt-4" :disabled="saving" @click="next">
      {{ isLast ? "Terminar" : "Siguiente frase" }}
    </Button>
  </div>
</template>
