<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ayudaFor } from "@shared/ayuda";
import ConversationView from "@/components/ConversationView.vue";
import KeepPracticing from "@/components/KeepPracticing.vue";
import NoticeBox from "@/components/NoticeBox.vue";
import SummaryBlock from "@/components/SummaryBlock.vue";
import { Button } from "@/components/ui/button";
import { aiNotice } from "@/common/AiNotice";
import { budgetMonthText } from "@/common/BudgetMonth";
import { localDate } from "@/common/Dates";
import { getUnit } from "@/curriculum/units";
import SessionService, {
  SessionError,
} from "@/Services/Session/SessionService";
import type {
  Ayuda,
  CloseResult,
  SessionClientError,
  SessionView,
} from "@/Services/interfaces/Session/SessionInterface";
import { useAuthStore } from "@/stores/auth";

// "Seguir practicando": otra conversación con la otra escena de la meta, cuando quieras.
// No es la sesión del día (no cuenta en Hoy) y tiene los mismos límites del día que la IA.
const auth = useAuthStore();
const router = useRouter();
const today = localDate(new Date());
const budget = budgetMonthText(new Date());
const unit = computed(() => getUnit(auth.profile?.current_unit_id ?? ""));
const ayuda = computed(() =>
  ayudaFor(auth.profile?.level ?? "L0", auth.profile?.ayuda ?? null),
);

const session = ref<SessionView | null>(null);
const starting = ref(false);
const closing = ref(false);
const errorCode = ref<SessionClientError | null>(null);
// Qué estaba fallando, para que "Intentar de nuevo" repita eso
const failedStep = ref<"start" | "close">("start");
const result = ref<CloseResult | null>(null);

const notice = computed(() =>
  errorCode.value ? aiNotice(errorCode.value, budget) : null,
);
const saved = computed(
  () =>
    result.value?.summary.correcciones.filter((c) => c.guardada).length ?? 0,
);

async function start(): Promise<void> {
  starting.value = true;
  errorCode.value = null;
  failedStep.value = "start";
  try {
    session.value = await SessionService.StartPractice(today);
  } catch (error) {
    errorCode.value = error instanceof SessionError ? error.code : "ia";
  } finally {
    starting.value = false;
  }
}

async function close(): Promise<void> {
  if (!session.value) return;
  closing.value = true;
  errorCode.value = null;
  failedStep.value = "close";
  try {
    result.value = await SessionService.Close(session.value.id);
    auth.applyAyuda(result.value.ayuda);
  } catch (error) {
    errorCode.value = error instanceof SessionError ? error.code : "ia";
  } finally {
    closing.value = false;
  }
}

function retry(): void {
  if (failedStep.value === "close") void close();
  else void start();
}

async function changeAyuda(value: Ayuda): Promise<void> {
  try {
    await auth.setAyuda(value);
  } catch (error) {
    console.error(error);
  }
}

onMounted(start);
</script>

<template>
  <div class="flex min-h-[70dvh] flex-col pt-3">
    <!-- Resumen de la conversación extra -->
    <template v-if="result">
      <h1 class="mt-4 font-display text-[34px] leading-none font-bold">
        Conversación terminada
      </h1>
      <p class="mt-1 text-sm text-ink-2">
        {{ result.minutes }} minutos en {{ unit.titulo_es }}.
      </p>
      <SummaryBlock :summary="result.summary" />
      <p v-if="saved > 0" class="mt-3 text-xs text-ink-2">
        Agregamos {{ saved }} frases a tu repaso.
      </p>
      <KeepPracticing :recommended="result.siguiente" :can-converse="true" />
      <div class="flex-1" />
      <Button
        variant="quiet"
        class="mt-6"
        @click="router.push({ name: 'hoy' })"
      >
        Volver a Hoy
      </Button>
    </template>

    <template v-else-if="notice">
      <div class="flex-1" />
      <NoticeBox :notice="notice" class="mb-3" @retry="retry" />
      <Button variant="quiet" @click="router.push({ name: 'hoy' })">
        Volver a Hoy
      </Button>
    </template>

    <p v-else-if="closing" class="text-sm text-ink-2" aria-live="polite">
      Preparando tu resumen…
    </p>

    <ConversationView
      v-else-if="session && auth.profile"
      :session="session"
      :level="auth.profile.level"
      :ayuda="ayuda"
      @ayuda="changeAyuda"
      @done="close"
    />

    <p v-else-if="starting" class="text-sm text-ink-2" aria-live="polite">
      Preparando la conversación…
    </p>
  </div>
</template>
