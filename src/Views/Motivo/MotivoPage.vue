<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import PictoTile from "@/components/PictoTile.vue";
import { Button } from "@/components/ui/button";
import type { PictogramName, TileColor } from "@/common/PictogramTypes";
import type { Motive } from "@/Services/interfaces/Profile/ProfileInterface";
import { useAuthStore } from "@/stores/auth";

// Pantalla 1.2: una sola pregunta. El motivo solo cambia los ejemplos; el plan es el mismo.
const auth = useAuthStore();
const router = useRouter();

const options: {
  motive: Motive;
  title: string;
  detail: string;
  pictogram: PictogramName;
  color: TileColor;
}[] = [
  {
    motive: "trabajo",
    title: "Trabajo",
    detail: "Juntas, correos y llamadas",
    pictogram: "work",
    color: "l1",
  },
  {
    motive: "viajes",
    title: "Viajes",
    detail: "Aeropuerto, hotel y restaurante",
    pictogram: "plane",
    color: "rosa",
  },
  {
    motive: "ambos",
    title: "Las dos cosas",
    detail: "Un poco de cada una",
    pictogram: "both",
    color: "ink",
  },
];

const selected = ref<Motive | null>(null);
const saving = ref(false);
const saveFailed = ref(false);

async function continueToToday(): Promise<void> {
  if (!selected.value) return;
  saving.value = true;
  saveFailed.value = false;
  try {
    await auth.saveMotive(selected.value);
    await router.replace({ name: "hoy" });
  } catch (error) {
    console.error(error);
    saveFailed.value = true;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-3.5 pb-6">
    <!-- Mini línea del primer uso (diseño: .l-mini) -->
    <div class="mt-2.5 flex items-center">
      <span
        class="box-border size-3.5 shrink-0 rounded-full border-[3px] border-rosa bg-rosa"
      />
      <span class="h-[5px] flex-1 bg-rosa" />
      <span
        class="box-border size-5 shrink-0 rounded-full border-[5px] border-ink bg-yellow"
      />
      <span class="h-[5px] flex-1 bg-rule" />
      <span
        class="box-border size-3.5 shrink-0 rounded-full border-[3px] border-rule bg-white"
      />
    </div>
    <div class="mt-1 flex justify-between text-xs text-ink-2">
      <span>Cuenta</span>
      <b class="text-ink">Tu motivo</b>
      <span>Evaluación</span>
    </div>

    <h1 class="mt-[22px] text-xl leading-tight font-bold">
      ¿Para qué quieres aprender inglés?
    </h1>
    <p class="mt-1.5 mb-4 text-sm text-ink-2">
      Solo cambia los ejemplos que vas a ver. Tu plan es el mismo.
    </p>

    <!-- Tres placas grandes; la elegida lleva borde negro y el círculo amarillo (diseño: .l-opt) -->
    <div
      role="radiogroup"
      aria-label="¿Para qué quieres aprender inglés?"
      class="flex flex-col gap-2"
    >
      <button
        v-for="option in options"
        :key="option.motive"
        type="button"
        role="radio"
        :aria-checked="selected === option.motive"
        :data-motivo="option.motive"
        class="flex items-center gap-3 rounded-xl text-left text-base font-bold"
        :class="
          selected === option.motive
            ? 'border-[3px] border-ink p-[11px]'
            : 'border-2 border-rule p-3'
        "
        @click="selected = option.motive"
      >
        <PictoTile :name="option.pictogram" :bg="option.color" />
        <span>
          {{ option.title }}
          <small class="mt-px block text-sm font-normal text-ink-2">
            {{ option.detail }}
          </small>
        </span>
        <span
          class="ml-auto box-border size-6 shrink-0 rounded-full"
          :class="
            selected === option.motive
              ? 'border-[6px] border-ink bg-yellow'
              : 'border-2 border-rule'
          "
        />
      </button>
    </div>

    <div class="flex-1" />

    <div
      v-if="saveFailed"
      class="mb-3 flex gap-[11px] rounded-xl bg-concrete p-3 text-sm leading-snug"
    >
      <span class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink">
        <svg class="size-[19px] fill-white"><use href="#i-nowifi" /></svg>
      </span>
      <p>No se guardó tu respuesta. Revisa tu conexión y vuelve a intentar.</p>
    </div>

    <Button
      data-testid="continuar"
      class="mt-4"
      :disabled="!selected || saving"
      @click="continueToToday"
    >
      Continuar
    </Button>
  </div>
</template>
