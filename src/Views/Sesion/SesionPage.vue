<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ayudaFor } from "@shared/ayuda";
import ConversationView from "@/components/ConversationView.vue";
import ExerciseDeck from "@/components/ExerciseDeck.vue";
import KeepPracticing from "@/components/KeepPracticing.vue";
import LessonDeck from "@/components/LessonDeck.vue";
import NoticeBox from "@/components/NoticeBox.vue";
import ReviewDeck from "@/components/ReviewDeck.vue";
import SessionSteps from "@/components/SessionSteps.vue";
import SummaryBlock from "@/components/SummaryBlock.vue";
import { Button } from "@/components/ui/button";
import { aiNotice } from "@/common/AiNotice";
import { budgetMonthText } from "@/common/BudgetMonth";
import { localDate } from "@/common/Dates";
import { buildExercises } from "@/common/Exercises";
import type { Exercise, ExerciseSource } from "@/common/Exercises";
import { pickNewPhrases } from "@/common/LessonPicker";
import { useSpeechOutput } from "@/composables/useSpeechOutput";
import { getUnit } from "@/curriculum/units";
import type { KeyPhrase } from "@/curriculum/units";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import SessionService, {
  SessionError,
} from "@/Services/Session/SessionService";
import type { Phrase } from "@/Services/interfaces/Phrases/PhraseInterface";
import type {
  Ayuda,
  SessionClientError,
  SessionSummary,
  SessionView,
} from "@/Services/interfaces/Session/SessionInterface";
import { useAuthStore } from "@/stores/auth";

// Sesión de hoy (spec 5.3): Repasar → Aprender → Practicar → Conversar → Resumen.
// La IA prepara la sesión mientras la persona repasa (no la hace esperar). Si la IA no está
// disponible, Repasar, Aprender y Practicar funcionan igual y Conversar se puede saltar.
const auth = useAuthStore();
const router = useRouter();
// "Hoy" se calcula una sola vez al abrir la sesión
const today = localDate(new Date());
const unit = computed(() => getUnit(auth.profile?.current_unit_id ?? ""));
const budget = budgetMonthText(new Date());
const { supported: canSpeak } = useSpeechOutput();
// Practicar: las frases nuevas de hoy y 2 de días anteriores
const OLD_PHRASES_TO_PRACTICE = 2;

type Stage =
  | "cargando"
  | "error"
  | "repasar"
  | "aprender"
  | "practicar"
  | "conversar"
  | "cerrando"
  | "resumen";
const stage = ref<Stage>("cargando");
const toReview = ref<Phrase[]>([]);
const toLearn = ref<KeyPhrase[]>([]);
const reviewed = ref(0);
const learned = ref(0);
// Las últimas frases del repaso: para practicar las de días anteriores y armar opciones
const recent = ref<Phrase[]>([]);
const exercises = ref<Exercise[]>([]);
const practice = ref<{ firstTry: number; total: number } | null>(null);

// Lo que preparó la IA
const session = ref<SessionView | null>(null);
const starting = ref(false);
const startError = ref<SessionClientError | null>(null);
// El resumen
const summary = ref<SessionSummary | null>(null);
const minutes = ref<number | null>(null);
const closeError = ref<SessionClientError | null>(null);
// Qué le conviene practicar después (lo decide la función según cómo le fue)
const next = ref<"conversar" | "ejercicios">("conversar");
// Cuánta ayuda tiene en la conversación: la que eligió o la de su nivel
const ayuda = computed(() =>
  ayudaFor(auth.profile?.level ?? "L0", auth.profile?.ayuda ?? null),
);

// En la mini línea, "cerrando" ya cuenta como el resumen
const step = computed<
  "repasar" | "aprender" | "practicar" | "conversar" | "resumen"
>(() =>
  stage.value === "repasar" ||
  stage.value === "aprender" ||
  stage.value === "practicar" ||
  stage.value === "conversar"
    ? stage.value
    : "resumen",
);
const savedCorrections = computed(
  () => summary.value?.correcciones.filter((c) => c.guardada).length ?? 0,
);
const added = computed(() => learned.value + savedCorrections.value);

async function startSession(): Promise<void> {
  starting.value = true;
  startError.value = null;
  try {
    const started = await SessionService.Start(
      today,
      toLearn.value.map((f) => f.en),
    );
    session.value = started;
    // Ya la terminó hoy (por ejemplo, desde otra pestaña): se ve su resumen
    if (started.status === "terminada") {
      summary.value = started.summary;
      minutes.value = started.minutes;
      stage.value = "resumen";
    }
  } catch (error) {
    startError.value = error instanceof SessionError ? error.code : "ia";
  } finally {
    starting.value = false;
  }
}

async function load(): Promise<void> {
  stage.value = "cargando";
  try {
    const [queue, learnedEn, learnedToday, latest] = await Promise.all([
      PhrasesService.GetReviewQueue(today),
      PhrasesService.GetLearnedEn(unit.value.id),
      PhrasesService.CountLearnedToday(today),
      PhrasesService.GetRecent(10),
    ]);
    toReview.value = queue.phrases;
    toLearn.value = pickNewPhrases(unit.value, learnedEn, learnedToday);
    recent.value = latest;
    if (toReview.value.length > 0) stage.value = "repasar";
    else if (toLearn.value.length > 0) stage.value = "aprender";
    else goToPractice();
  } catch (error) {
    console.error(error);
    stage.value = "error";
    return;
  }
  // Sin esperar: se prepara mientras repasa
  void startSession();
}

// Los ejercicios de completar los preparó la IA; si todavía no llega, salen otros tipos
function goToPractice(): void {
  const extras = session.value?.content.frases ?? [];
  const news: ExerciseSource[] = toLearn.value.map((f) => {
    const extra = extras.find((e) => e.en === f.en);
    return {
      en: f.en,
      es: f.es,
      hueco: extra?.hueco,
      trampas: extra?.trampas,
      por_que: extra?.por_que,
    };
  });
  const newEn = new Set(toLearn.value.map((f) => f.en));
  const olds = recent.value
    .filter((p) => !newEn.has(p.en))
    .slice(0, OLD_PHRASES_TO_PRACTICE)
    .map((p) => ({ en: p.en, es: p.es }));
  exercises.value = buildExercises({
    phrases: [...news, ...olds],
    pool: [...unit.value.frases_clave, ...recent.value],
    level: auth.profile?.level ?? "L0",
    canSpeak,
  });
  stage.value = exercises.value.length > 0 ? "practicar" : "conversar";
}

function afterReview(count: number): void {
  reviewed.value = count;
  if (toLearn.value.length > 0) stage.value = "aprender";
  else goToPractice();
}
function afterLesson(): void {
  learned.value = toLearn.value.length;
  goToPractice();
}
function afterPractice(result: { firstTry: number; total: number }): void {
  practice.value = result;
  stage.value = "conversar";
}

// Termina la sesión; sin IA, el resumen llega sin "Lo que hiciste bien"
async function close(): Promise<void> {
  if (!session.value) {
    stage.value = "resumen";
    return;
  }
  stage.value = "cerrando";
  closeError.value = null;
  try {
    const closed = await SessionService.Close(session.value.id);
    summary.value = closed.summary;
    minutes.value = closed.minutes;
    next.value = closed.siguiente;
    // La ayuda de la próxima conversación ya la guardó la función
    auth.applyAyuda(closed.ayuda);
    stage.value = "resumen";
  } catch (error) {
    closeError.value = error instanceof SessionError ? error.code : "ia";
  }
}

// "Más ayuda" / "Menos ayuda": si no se pudo guardar, se queda la de antes
async function changeAyuda(value: Ayuda): Promise<void> {
  try {
    await auth.setAyuda(value);
  } catch (error) {
    console.error(error);
  }
}

const startNotice = computed(() =>
  startError.value ? aiNotice(startError.value, budget) : null,
);
const closeNotice = computed(() =>
  closeError.value ? aiNotice(closeError.value, budget) : null,
);

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
      <SessionSteps :current="step" class="mb-4" />

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
        :extras="session?.content.frases"
        @done="afterLesson"
      />

      <ExerciseDeck
        v-else-if="stage === 'practicar'"
        :exercises="exercises"
        @done="afterPractice"
      />

      <!-- Conversar (pantallas 2.4 y 2.5) -->
      <template v-else-if="stage === 'conversar'">
        <ConversationView
          v-if="session && auth.profile"
          :session="session"
          :level="auth.profile.level"
          :ayuda="ayuda"
          @ayuda="changeAyuda"
          @done="close"
        />
        <p v-else-if="starting" class="text-sm text-ink-2" aria-live="polite">
          Preparando la conversación…
        </p>
        <template v-else-if="startNotice">
          <div class="flex-1" />
          <NoticeBox :notice="startNotice" class="mb-3" @retry="startSession" />
          <Button variant="quiet" @click="stage = 'resumen'">
            Saltar la conversación
          </Button>
        </template>
      </template>

      <!-- Preparando el resumen -->
      <template v-else-if="stage === 'cerrando'">
        <p v-if="!closeNotice" class="text-sm text-ink-2" aria-live="polite">
          Preparando tu resumen…
        </p>
        <template v-else>
          <div class="flex-1" />
          <NoticeBox :notice="closeNotice" class="mb-3" @retry="close" />
        </template>
      </template>

      <!-- Resumen (pantalla 2.6) -->
      <template v-else>
        <h1 class="mt-4 font-display text-[34px] leading-none font-bold">
          Sesión terminada
        </h1>
        <p class="mt-1 text-sm text-ink-2">
          <template v-if="minutes">
            {{ minutes }} minutos en {{ unit.titulo_es }}.
          </template>
          <template v-else>En {{ unit.titulo_es }}.</template>
        </p>

        <SummaryBlock :summary="summary" />

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
          <li v-if="practice" class="flex gap-2">
            <svg
              viewBox="0 0 24 24"
              class="mt-px size-4 shrink-0 fill-none stroke-l2 stroke-[3.2]"
            >
              <use href="#i-check" />
            </svg>
            Ejercicios: acertaste {{ practice.firstTry }} de
            {{ practice.total }} a la primera
          </li>
          <li
            v-if="!session && !practice && reviewed === 0 && learned === 0"
            class="text-ink-2"
          >
            Hoy no había frases para repasar ni para aprender.
          </li>
        </ul>
        <p v-if="added > 0" class="mt-3 text-xs text-ink-2">
          Agregamos {{ added }} frases a tu repaso.
        </p>
        <!-- Sin IA (no hubo sesión de IA) no se ofrece otra conversación -->
        <KeepPracticing :recommended="next" :can-converse="!!session" />
        <div class="flex-1" />
        <Button
          variant="quiet"
          class="mt-6"
          @click="router.push({ name: 'hoy' })"
        >
          Terminar
        </Button>
      </template>
    </template>
  </div>
</template>
