<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { supportFor } from "@shared/sessionPrompts";
import ChatInput from "@/components/ChatInput.vue";
import PictoTile from "@/components/PictoTile.vue";
import { Button } from "@/components/ui/button";
import { budgetMonthText } from "@/common/BudgetMonth";
import { useSpeechInput } from "@/composables/useSpeechInput";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import type { LevelId } from "@/curriculum/levels";
import SessionService, {
  SessionError,
} from "@/Services/Session/SessionService";
import type {
  PersonajeTurn,
  SessionClientError,
  SessionView,
  Turn,
} from "@/Services/interfaces/Session/SessionInterface";

// Conversar (pantallas 2.4 y 2.5): una escena de la meta con un personaje de la IA.
// La persona habla en negro; si algo suena mejor de otra forma, va en la placa verde y entra a
// su repaso. El historial lo guarda la función: aquí solo se manda el texto nuevo.
const props = defineProps<{ session: SessionView; level: LevelId }>();
const emit = defineEmits<{ done: [] }>();

const speech = useSpeechInput();
const { speak } = useSpeechOutput();
const support = supportFor(props.level);
const scene = props.session.content.escena;
const budget = budgetMonthText(new Date());
const MAX_USER_TURNS = 10;

const transcript = ref<Turn[]>([...props.session.transcript]);
const draft = ref("");
const sending = ref(false);
const errorCode = ref<SessionClientError | null>(null);
// Turnos con la traducción abierta ("En español")
const shownEs = ref<number[]>([]);
const bottom = ref<HTMLElement | null>(null);

const personaTurns = computed(
  () => transcript.value.filter((t) => t.quien === "persona").length,
);
const lastPersonaje = computed(() =>
  [...transcript.value]
    .reverse()
    .find((t): t is PersonajeTurn => t.quien === "personaje"),
);
const finished = computed(
  () =>
    !!lastPersonaje.value?.terminada ||
    errorCode.value === "terminada" ||
    personaTurns.value >= MAX_USER_TURNS,
);
const suggestions = computed(() =>
  support.suggestions && !finished.value
    ? (lastPersonaje.value?.sugerencias ?? [])
    : [],
);
// "el mesero" → "El mesero está escribiendo…"
const typing = computed(
  () =>
    `${scene.personaje_es.charAt(0).toUpperCase()}${scene.personaje_es.slice(1)} está escribiendo…`,
);

// La corrección de cada mensaje viene en la respuesta que le sigue
function correctionAfter(index: number): PersonajeTurn["correccion"] {
  const next = transcript.value[index + 1];
  return next?.quien === "personaje" ? next.correccion : null;
}

function showsEs(index: number): boolean {
  return support.translationVisible || shownEs.value.includes(index);
}
function toggleEs(index: number): void {
  shownEs.value = shownEs.value.includes(index)
    ? shownEs.value.filter((i) => i !== index)
    : [...shownEs.value, index];
}

// En iOS, leer en voz alta mientras se escucha mata el reconocimiento
function listen(text: string, slow: boolean): void {
  speech.cancel();
  speak(text, slow);
}

async function reload(): Promise<void> {
  try {
    const fresh = await SessionService.Start(props.session.date, []);
    transcript.value = [...fresh.transcript];
  } catch (error) {
    errorCode.value =
      error instanceof SessionError ? error.code : "sin-conexion";
  }
}

async function send(text: string): Promise<void> {
  if (sending.value || text.trim() === "") return;
  sending.value = true;
  errorCode.value = null;
  try {
    const { persona, personaje } = await SessionService.Turn(
      props.session.id,
      text.trim(),
    );
    transcript.value = [...transcript.value, persona, personaje];
    draft.value = "";
  } catch (error) {
    // El texto se queda en el cuadro para volver a mandarlo
    const code = error instanceof SessionError ? error.code : "ia";
    if (code === "conflicto") await reload();
    else errorCode.value = code;
  } finally {
    sending.value = false;
  }
}

// Avisos (diseño: avisos): qué pasó y qué sí se puede hacer
const notice = computed(() => {
  switch (errorCode.value) {
    case null:
    case "terminada":
    case "conflicto":
      return null;
    case "presupuesto":
      return {
        tone: "bg-yellow",
        icon: "#i-wallet",
        title: `Se terminó el presupuesto de IA de ${budget.mes}`,
        body: `Vuelve el ${budget.siguiente}. El repaso sigue disponible.`,
        retry: "",
      };
    case "limite":
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "Ya practicaste mucho hoy",
        body: "Vuelve mañana o repasa tus frases.",
        retry: "",
      };
    case "sin-conexion":
      return {
        tone: "bg-concrete",
        icon: "#i-nowifi",
        title: "Sin conexión a internet",
        body: "Revisa tu conexión y vuelve a intentar.",
        retry: "Reintentar",
      };
    case "sesion":
      return {
        tone: "bg-concrete",
        icon: "#i-group",
        title: "Tu sesión se cerró",
        body: "Vuelve a entrar con Google para seguir.",
        retry: "",
      };
    case "datos":
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "No se pudo mandar tu mensaje",
        body: "Revisa que no pase de 300 letras.",
        retry: "",
      };
    default:
      return {
        tone: "bg-concrete",
        icon: "#i-clock",
        title: "La IA no respondió",
        body: "Lo intentamos dos veces. Prueba de nuevo en un minuto.",
        retry: "Intentar de nuevo",
      };
  }
});

// El chat baja solo al último mensaje
watch(
  () => transcript.value.length,
  async () => {
    await nextTick();
    bottom.value?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  },
);
</script>

<template>
  <div class="flex flex-1 flex-col">
    <p class="text-sm font-bold">Con {{ scene.personaje_es }}</p>

    <!-- La escena y su objetivo (diseño: .l-info) -->
    <div
      class="mt-2 rounded-[4px_10px_10px_4px] border-l-[5px] border-l1 bg-l1-soft px-[11px] py-[9px] text-sm leading-snug"
    >
      {{ scene.escena_es }}
      <b class="mt-1 block">Tu objetivo:</b>
      {{ scene.objetivo_es }}
    </div>

    <!-- La conversación (diseño: .l-chat) -->
    <div class="mt-3 flex flex-col gap-2">
      <template v-for="(turn, index) in transcript" :key="index">
        <div
          v-if="turn.quien === 'personaje'"
          class="flex items-start gap-[9px]"
        >
          <PictoTile :name="scene.pictograma" bg="l1" />
          <div class="min-w-0 flex-1">
            <p class="text-sm leading-snug" lang="en">{{ turn.en }}</p>
            <div
              class="mt-[5px] flex flex-wrap gap-3.5 text-[12.5px] font-bold text-l1"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1"
                @click="listen(turn.en, false)"
              >
                <svg class="size-3.5 fill-l1"><use href="#i-speaker" /></svg>
                Escuchar
              </button>
              <button type="button" @click="listen(turn.en, true)">
                Más lento
              </button>
              <button
                v-if="!support.translationVisible"
                type="button"
                class="inline-flex items-center gap-1"
                @click="toggleEs(index)"
              >
                <svg class="size-3.5 fill-l1"><use href="#i-translate" /></svg>
                En español
              </button>
            </div>
            <p
              v-if="showsEs(index) && turn.es"
              class="mt-1.5 rounded-[4px_10px_10px_4px] border-l-[5px] border-l1 bg-l1-soft px-[11px] py-[7px] text-[13px] leading-snug"
            >
              {{ turn.es }}
            </p>
          </div>
        </div>

        <template v-else>
          <p
            class="max-w-[84%] self-end rounded-[12px_12px_3px_12px] bg-ink px-3 py-[9px] text-[14.5px] leading-snug text-white"
            lang="en"
          >
            {{ turn.texto }}
          </p>
          <!-- Cómo suena mejor (diseño: .l-fix) -->
          <div
            v-if="correctionAfter(index)"
            class="max-w-[92%] self-end rounded-[4px_10px_10px_4px] border-l-[5px] border-l2 bg-l2-soft px-[11px] py-2 text-[13px] leading-snug"
          >
            Se entendió. Suena mejor así:
            <b class="mt-0.5 block text-[14.5px]" lang="en">
              {{ correctionAfter(index)?.mejor }}
            </b>
            <span v-if="correctionAfter(index)?.nota" class="mt-1 block">
              {{ correctionAfter(index)?.nota }}
            </span>
            <span
              v-if="correctionAfter(index)?.guardada"
              class="mt-1 block text-xs font-bold text-[#006B43]"
            >
              Guardada en tu repaso
            </span>
          </div>
        </template>
      </template>
      <p v-if="sending" class="text-sm text-ink-2" aria-live="polite">
        {{ typing }}
      </p>
      <div ref="bottom" />
    </div>

    <div class="min-h-6 flex-1" />

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
        <template v-if="notice.retry">
          <br />
          <button
            type="button"
            class="mt-1.5 font-bold text-l1 underline underline-offset-[3px]"
            @click="send(draft)"
          >
            {{ notice.retry }}
          </button>
        </template>
      </div>
    </div>

    <Button v-if="finished" @click="emit('done')">Ver tu resumen</Button>

    <template v-else>
      <!-- Frases sugeridas (diseño: .l-sugg) -->
      <template v-if="suggestions.length > 0">
        <p class="mb-1.5 text-[12.5px] text-ink-2">Si no sabes qué decir:</p>
        <div class="mb-2 flex flex-wrap gap-1.5">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion"
            type="button"
            lang="en"
            class="rounded-lg border-2 border-rule px-[9px] py-1.5 text-[12.5px] font-bold"
            @click="draft = suggestion"
          >
            {{ suggestion }}
          </button>
        </div>
      </template>

      <ChatInput
        v-model="draft"
        :disabled="sending"
        :speech="speech"
        @send="send"
      />

      <Button
        v-if="personaTurns > 0"
        variant="quiet"
        class="mt-3"
        @click="emit('done')"
      >
        Terminar conversación
      </Button>
    </template>
  </div>
</template>
