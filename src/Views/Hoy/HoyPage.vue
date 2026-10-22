<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import LineaVertical from "@/components/LineaVertical.vue";
import { localDate, weekStart } from "@/common/Dates";
import { getGreeting, practiceDaysText } from "@/common/Greeting";
import { allLearned, pickNewPhrases } from "@/common/LessonPicker";
import { getLevel } from "@/curriculum/levels";
import { getUnit, sceneFor, units } from "@/curriculum/units";
import PhrasesService from "@/Services/Phrases/PhrasesService";
import SessionService from "@/Services/Session/SessionService";
import type { TodayStatus } from "@/Services/interfaces/Session/SessionInterface";
import { useAuthStore } from "@/stores/auth";
import SesionHoyPanel from "./SesionHoyPanel.vue";

const auth = useAuthStore();
// "Hoy" en el teléfono (para la escena del día y los días de práctica)
const today = localDate(new Date());

const current = computed(() => getUnit(auth.profile?.current_unit_id ?? ""));
const level = computed(() => getLevel(current.value.nivel));
const practiceDays = ref(0);
// "Buenas tardes, Fernando. Esta semana practicaste 4 días."
const greeting = computed(() =>
  [
    getGreeting(new Date(), auth.profile?.name ?? ""),
    practiceDaysText(practiceDays.value),
  ]
    .filter((t) => t !== "")
    .join(" "),
);
// El personaje de la conversación de hoy (cambia con el motivo y, con "ambos", con el día)
const personaje = computed(
  () =>
    sceneFor(current.value, auth.profile?.motive ?? null, today).personaje_es,
);

// Celular: la estación anterior, la actual y la siguiente (en el camino completo)
const nearbyStations = computed(() => {
  const index = units.indexOf(current.value);
  return units.slice(Math.max(0, index - 1), index + 2);
});

// Computadora: todas las metas del nivel actual
const levelStations = computed(() =>
  units.filter((u) => u.nivel === current.value.nivel),
);

// Números de la sesión de hoy: se cargan una vez y se pasan a los dos paneles
const status = ref<"cargando" | "listo" | "error">("cargando");
const pending = ref(0);
const newCount = ref(0);
const unitDone = ref(false);
const sessionStatus = ref<TodayStatus>("ninguna");

async function loadSession(): Promise<void> {
  status.value = "cargando";
  try {
    const [queue, learnedEn, learnedToday, todayStatus, days] =
      await Promise.all([
        PhrasesService.GetReviewQueue(today),
        PhrasesService.GetLearnedEn(current.value.id),
        PhrasesService.CountLearnedToday(today),
        SessionService.GetTodayStatus(today),
        SessionService.CountPracticeDays(weekStart(today), today),
      ]);
    sessionStatus.value = todayStatus;
    practiceDays.value = days;
    pending.value = queue.phrases.length;
    newCount.value = pickNewPhrases(
      current.value,
      learnedEn,
      learnedToday,
    ).length;
    unitDone.value = allLearned(current.value, learnedEn);
    status.value = "listo";
  } catch (error) {
    console.error(error);
    status.value = "error";
  }
}

onMounted(loadSession);
// Si cambia de estación (avance temporal), se recargan los números
watch(() => current.value.id, loadSession);

const lineLabel = computed(() =>
  level.value.id === "L0"
    ? "Línea rosa, Nivel 0"
    : `Línea ${level.value.linea.toLowerCase()}, nivel ${level.value.nombre}`,
);
</script>

<template>
  <div v-if="auth.profile">
    <!-- Celular -->
    <div data-testid="linea-movil" class="lg:hidden">
      <p class="mt-3 text-sm leading-snug text-ink-2">{{ greeting }}</p>
      <LineaVertical
        :stations="nearbyStations"
        :current-unit-id="current.id"
        :color="level.color"
        large-current
      >
        <SesionHoyPanel
          :pending="pending"
          :new-count="newCount"
          :unit-done="unitDone"
          :status="status"
          :session-status="sessionStatus"
          :personaje="personaje"
          @retry="loadSession"
        />
      </LineaVertical>
    </div>

    <!-- Computadora: la línea del nivel a la izquierda y la sesión al centro -->
    <div class="hidden grid-cols-[270px_1fr] lg:grid">
      <div class="border-r-2 border-concrete py-[22px] pr-6">
        <p class="text-sm text-ink-2">{{ lineLabel }}</p>
        <LineaVertical
          :stations="levelStations"
          :current-unit-id="current.id"
          :color="level.color"
        />
      </div>
      <div class="max-w-xl py-[22px] pl-6">
        <p class="text-sm text-ink-2">{{ greeting }}</p>
        <h1
          class="mt-3.5 font-display text-3xl leading-[.95] font-bold tracking-tight"
        >
          {{ current.titulo_es }}
        </h1>
        <SesionHoyPanel
          class="mt-5"
          :pending="pending"
          :new-count="newCount"
          :unit-done="unitDone"
          :status="status"
          :session-status="sessionStatus"
          :personaje="personaje"
          @retry="loadSession"
        />
      </div>
    </div>
  </div>
</template>
