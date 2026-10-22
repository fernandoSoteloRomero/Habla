<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { budgetMonthText } from "@/common/BudgetMonth";
import {
  answerQuestion,
  currentQuestion,
  startPlacement,
} from "@/common/PlacementFlow";
import type { PlacementState } from "@/common/PlacementFlow";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import { PlacementError } from "@/Services/Placement/PlacementService";
import type { PlacementErrorCode } from "@/Services/interfaces/Placement/PlacementInterface";
import { useAuthStore } from "@/stores/auth";

// Pantalla 1.3: evaluación corta, adaptativa y sin pena. Las preguntas no usan IA;
// al final se mandan todas las respuestas una sola vez y la IA decide el nivel.
const auth = useAuthStore();
const router = useRouter();
const { supported: canSpeak, speak } = useSpeechOutput();

const TOTAL = 12;
const state = ref<PlacementState>(startPlacement());
const question = computed(() => currentQuestion(state.value));
const number = computed(() => state.value.answers.length + 1);
const openAnswer = ref("");
// Opción marcada; se confirma con "Siguiente" (tocar una opción ya no brinca sola)
const selected = ref<number | null>(null);
const sending = ref(false);
const errorCode = ref<PlacementErrorCode | null>(null);
const budget = budgetMonthText(new Date());

function confirmChoice(): void {
  if (selected.value === null) return;
  state.value = answerQuestion(state.value, selected.value);
  selected.value = null;
}
function sendOpenAnswer(): void {
  state.value = answerQuestion(state.value, openAnswer.value);
  openAnswer.value = "";
}
function dontKnow(): void {
  state.value = answerQuestion(state.value, null);
  openAnswer.value = "";
  selected.value = null;
}

// Manda las respuestas (o pide Nivel 0 sin IA) una sola vez aunque toquen dos veces
async function send(withAi: boolean): Promise<void> {
  if (sending.value) return;
  sending.value = true;
  errorCode.value = null;
  try {
    if (withAi) await auth.finishPlacement(state.value.answers);
    else await auth.finishPlacementFallback();
    await router.replace({ name: "resultado" });
  } catch (error) {
    // Las respuestas se quedan en state: el botón vuelve a mandarlas
    const code = error instanceof PlacementError ? error.code : "ia";
    if (code === "ya-evaluado") {
      // Ya la hizo en otra pestaña: se trae su perfil y el guard lo deja en Hoy
      await auth.reloadProfile();
      await router.replace({ name: "hoy" });
      return;
    }
    errorCode.value = code;
  } finally {
    sending.value = false;
  }
}

function restart(): void {
  state.value = startPlacement();
  errorCode.value = null;
  selected.value = null;
  openAnswer.value = "";
}

async function enterAgain(): Promise<void> {
  await auth.signOut();
  await router.replace({ name: "bienvenida" });
}

// Botón rosa según lo que pasó: reintentar, empezar de nuevo o entrar otra vez
function mainAction(): Promise<void> | void {
  if (errorCode.value === "datos") return restart();
  if (errorCode.value === "sesion") return enterAgain();
  return send(true);
}
const mainLabel = computed(() => {
  if (sending.value) return "Calculando tu nivel…";
  if (errorCode.value === "datos") return "Empezar de nuevo";
  if (errorCode.value === "sesion") return "Entrar otra vez";
  if (errorCode.value) return "Intentar de nuevo";
  return "Ver mi resultado";
});

// Si la IA no está disponible, se puede empezar en Nivel 0 sin gastar (spec 9: no dejar a nadie atorado).
// Sin conexión no tendría caso: tampoco llegaría.
const canFallback = computed(
  () =>
    errorCode.value === "presupuesto" ||
    errorCode.value === "limite" ||
    errorCode.value === "ia" ||
    errorCode.value === "servidor",
);

// Avisos (diseño 4.2): qué pasó y qué sí se puede hacer
const notice = computed(() => {
  switch (errorCode.value) {
    case null:
    case "ya-evaluado":
      return null;
    case "presupuesto":
      return {
        tone: "bg-yellow",
        icon: "#i-wallet",
        title: `Se terminó el presupuesto de IA de ${budget.mes}`,
        body: `Vuelve el ${budget.siguiente}.`,
      };
    case "limite":
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "Ya hiciste la evaluación varias veces hoy",
        body: "Vuelve mañana para intentarlo otra vez.",
      };
    case "sin-conexion":
      return {
        tone: "bg-concrete",
        icon: "#i-nowifi",
        title: "Sin conexión a internet",
        body: "Tus respuestas siguen aquí. Revisa tu conexión y vuelve a intentar.",
      };
    case "servidor":
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "No se guardó tu resultado",
        body: "Tus respuestas siguen aquí. Intenta de nuevo en un momento.",
      };
    case "datos":
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "Algo salió mal con tus respuestas",
        body: "Vuelve a empezar la evaluación.",
      };
    case "sesion":
      return {
        tone: "bg-concrete",
        icon: "#i-group",
        title: "Tu sesión se cerró",
        body: "Vuelve a entrar con Google para seguir.",
      };
    default:
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "La IA no respondió",
        body: "Lo intentamos dos veces. Prueba de nuevo en un minuto.",
      };
  }
});
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-3.5 pb-6">
    <template v-if="!state.done">
      <!-- Avance (diseño: .l-count y .l-meter) -->
      <p class="text-sm text-ink-2">
        Pregunta {{ number }}, de unas {{ TOTAL }}
      </p>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-concrete">
        <div
          class="h-full bg-rosa"
          :style="{ width: `${(number / TOTAL) * 100}%` }"
        />
      </div>

      <h1 class="mt-[18px] text-xl leading-tight font-bold">
        {{ question.instruction }}
      </h1>

      <!-- Escuchar: audio normal y lento; sin audio, la frase escrita -->
      <template v-if="question.kind === 'escuchar'">
        <div v-if="canSpeak" class="mt-3 flex gap-2">
          <button
            type="button"
            class="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink font-bold text-white"
            @click="speak(question.text, false)"
          >
            <svg class="size-[18px] fill-white"><use href="#i-speaker" /></svg>
            Escuchar
          </button>
          <button
            type="button"
            class="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-concrete font-bold"
            @click="speak(question.text, true)"
          >
            Más lento
          </button>
        </div>
        <template v-else>
          <p class="mt-3 text-xl leading-snug font-bold">{{ question.text }}</p>
          <p class="mt-1 text-xs text-ink-2">
            Tu navegador no puede leer en voz alta. Lee la frase.
          </p>
        </template>
      </template>

      <!-- Completar: la frase con el hueco -->
      <p
        v-else-if="question.kind === 'completar'"
        class="mt-3 text-xl leading-snug font-bold"
      >
        {{ question.text }}
      </p>

      <!-- Opciones (diseño: .l-ans y .l-opt): se marca una y se confirma con "Siguiente" -->
      <template v-if="question.options">
        <div
          role="radiogroup"
          :aria-label="question.instruction"
          class="mt-3.5 flex flex-col gap-[7px]"
        >
          <button
            v-for="(option, i) in question.options"
            :key="option"
            type="button"
            role="radio"
            :aria-checked="selected === i"
            class="flex items-center gap-3 rounded-xl text-left text-base"
            :class="
              selected === i
                ? 'border-[3px] border-ink px-[13px] py-[11px] font-bold'
                : 'border-2 border-rule px-3.5 py-3'
            "
            @click="selected = i"
          >
            {{ option }}
            <span
              class="ml-auto box-border size-6 shrink-0 rounded-full"
              :class="
                selected === i
                  ? 'border-[6px] border-ink bg-yellow'
                  : 'border-2 border-rule'
              "
            />
          </button>
        </div>
        <Button
          class="mt-3"
          :disabled="selected === null"
          @click="confirmChoice"
        >
          Siguiente
        </Button>
      </template>

      <!-- Responder: texto o dictado del teclado -->
      <template v-if="question.kind === 'responder'">
        <p class="mt-3 text-xl leading-snug font-bold">{{ question.text }}</p>
        <div v-if="canSpeak" class="mt-2 flex gap-2">
          <button
            type="button"
            class="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink font-bold text-white"
            @click="speak(question.text, false)"
          >
            <svg class="size-[18px] fill-white"><use href="#i-speaker" /></svg>
            Escuchar
          </button>
          <button
            type="button"
            class="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-concrete font-bold"
            @click="speak(question.text, true)"
          >
            Más lento
          </button>
        </div>
        <label for="respuesta" class="mt-4 text-sm font-bold">
          Tu respuesta en inglés
        </label>
        <textarea
          id="respuesta"
          v-model="openAnswer"
          rows="3"
          maxlength="300"
          lang="en"
          autocapitalize="sentences"
          class="mt-1.5 rounded-xl border-2 border-ink p-3 text-base"
        />
        <p class="mt-1.5 text-xs text-ink-2">
          En el iPhone puedes tocar el micrófono del teclado para dictar.
        </p>
        <Button
          class="mt-3"
          :disabled="openAnswer.trim() === ''"
          @click="sendOpenAnswer"
        >
          Siguiente
        </Button>
      </template>

      <div class="flex-1" />
      <Button variant="quiet" class="mt-4" @click="dontKnow">No sé</Button>
      <p class="mt-2 text-xs leading-snug text-ink-2">
        Elegir "No sé" está bien: nos ayuda a saber por dónde empezar. La
        evaluación termina sola cuando se pone difícil.
      </p>
    </template>

    <!-- Fin: se manda todo una sola vez -->
    <template v-else>
      <h1 class="mt-7 font-display text-2xl leading-none font-bold">
        Listo, ya tenemos tus respuestas
      </h1>
      <p class="mt-2 text-sm text-ink-2">
        Con esto decidimos en qué línea empiezas.
      </p>
      <div class="flex-1" />
      <div
        v-if="notice"
        class="mb-3 flex gap-[11px] rounded-xl p-3 text-sm leading-snug"
        :class="notice.tone"
      >
        <span
          class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink"
        >
          <svg class="size-[19px] fill-white"><use :href="notice.icon" /></svg>
        </span>
        <div>
          <b class="mb-0.5 block">{{ notice.title }}</b>
          {{ notice.body }}
        </div>
      </div>
      <!-- Mientras la IA responde: el botón avisa y queda apagado (solo texto: la única animación es la de la línea) -->
      <Button class="mt-4" :disabled="sending" @click="mainAction">
        {{ mainLabel }}
      </Button>
      <p v-if="sending" class="mt-2 text-xs text-ink-2" aria-live="polite">
        Tarda unos segundos.
      </p>
      <Button
        v-if="canFallback && !sending"
        variant="quiet"
        class="mt-2"
        @click="send(false)"
      >
        Empezar en Nivel 0 por ahora
      </Button>
    </template>
  </div>
</template>
