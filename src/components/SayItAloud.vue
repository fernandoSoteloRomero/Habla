<script setup lang="ts">
import { ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { soundsSame } from "@/common/SameWords";
import { useSpeechInput } from "@/composables/useSpeechInput";

// "Decirla en voz alta" (pantalla 2.3): practicar diciendo la frase. No califica la
// pronunciación (fuera de la v1); solo dice si se entendieron sus palabras.
const props = defineProps<{ phrase: string }>();

const speech = useSpeechInput();
const open = ref(false);
const typed = ref("");
// Lo que se entendió la última vez (null = todavía no lo intenta)
const heard = ref<string | null>(null);

function begin(): void {
  open.value = true;
  heard.value = null;
  if (speech.strategy.value === "webSpeech") speech.start();
}

async function finishListening(): Promise<void> {
  heard.value = await speech.stop();
}

function check(): void {
  heard.value = typed.value.trim();
}

function useKeyboard(): void {
  speech.useKeyboard();
  open.value = true;
}

// Si el navegador deja de escuchar solo (Chrome lo hace al terminar la frase)
watch(speech.listening, (now, before) => {
  if (before && !now && heard.value === null && !speech.error.value) {
    heard.value = speech.interim.value.trim();
  }
});
</script>

<template>
  <div>
    <!-- Sin permiso de micrófono (diseño: aviso azul) -->
    <div
      v-if="speech.error.value === 'permiso'"
      class="mb-2 flex gap-[11px] rounded-xl bg-l1-soft p-3 text-sm leading-snug"
    >
      <span class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-l1">
        <svg class="size-[19px] fill-white"><use href="#i-mic" /></svg>
      </span>
      <div>
        <b class="mb-0.5 block">Falta permiso para el micrófono</b>
        Toca el candado junto a la dirección de la página y activa
        “Micrófono”.<br />
        <button
          type="button"
          class="mt-1.5 font-bold text-l1 underline underline-offset-[3px]"
          @click="useKeyboard"
        >
          Escribir mientras tanto
        </button>
      </div>
    </div>

    <!-- Resultado -->
    <p
      v-if="heard !== null && heard !== '' && soundsSame(props.phrase, heard)"
      class="mb-2 rounded-[4px_10px_10px_4px] border-l-[5px] border-l2 bg-l2-soft px-[11px] py-[9px] text-sm leading-snug"
    >
      Se entendió bien.
    </p>
    <p
      v-else-if="heard !== null && heard !== ''"
      class="mb-2 rounded-[4px_10px_10px_4px] border-l-[5px] border-l1 bg-l1-soft px-[11px] py-[9px] text-sm leading-snug"
    >
      Se entendió: “{{ heard }}”. Inténtalo otra vez.
    </p>
    <p
      v-else-if="heard === ''"
      class="mb-2 rounded-[4px_10px_10px_4px] border-l-[5px] border-l1 bg-l1-soft px-[11px] py-[9px] text-sm leading-snug"
    >
      No se escuchó nada. Inténtalo otra vez.
    </p>

    <!-- Con el micrófono del navegador -->
    <template
      v-if="speech.strategy.value === 'webSpeech' && speech.listening.value"
    >
      <div
        class="mb-2 rounded-xl border-2 border-dashed border-ink px-3 py-2.5 text-base font-bold"
        aria-live="polite"
      >
        {{ speech.interim.value || "…" }}
        <small class="mt-0.5 block text-xs font-normal text-ink-2">
          Te estoy escuchando
        </small>
      </div>
      <Button variant="quiet" @click="finishListening">Listo</Button>
    </template>

    <!-- Con el dictado del teclado -->
    <template v-else-if="open && speech.strategy.value === 'keyboardDictation'">
      <label for="decirla" class="text-sm text-ink-2">
        Toca el micrófono del teclado y dila en inglés.
      </label>
      <textarea
        id="decirla"
        v-model="typed"
        rows="2"
        maxlength="300"
        lang="en"
        autocapitalize="sentences"
        class="mt-1.5 w-full rounded-xl border-2 border-ink p-3 text-base"
      />
      <Button
        variant="quiet"
        class="mt-2"
        :disabled="typed.trim() === ''"
        @click="check"
      >
        Revisar
      </Button>
    </template>

    <Button v-else variant="line" @click="begin">
      <svg><use href="#i-mic" /></svg>
      Decirla en voz alta
    </Button>
  </div>
</template>
