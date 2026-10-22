<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { isIOSDevice } from "@/common/SpeechStrategy";
import type { useSpeechInput } from "@/composables/useSpeechInput";

// Cómo contesta la persona en Conversar (pantallas 2.4 y 2.5):
// - Teclado (iPhone y navegadores sin reconocimiento): cuadro de texto y el botón rosa de enviar.
// - Micrófono (Chrome, Edge, Android): se mantiene presionado mientras habla; al soltar se ve
//   lo que se entendió y se manda con "Enviar" (o "Otra vez").
// El reconocimiento lo crea ConversationView, para poder cortarlo antes de leer en voz alta.
const props = defineProps<{
  modelValue: string;
  disabled: boolean;
  speech: ReturnType<typeof useSpeechInput>;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  send: [text: string];
}>();

const isIOS = isIOSDevice(navigator);
const strategy = computed(() => props.speech.strategy.value);
const listening = computed(() => props.speech.listening.value);
const canSend = computed(
  () => !props.disabled && props.modelValue.trim() !== "",
);

function send(): void {
  if (canSend.value) emit("send", props.modelValue.trim());
}

// Enter manda; Shift+Enter hace un salto de línea
function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send();
  }
}

function press(): void {
  if (!props.disabled) props.speech.start();
}
async function release(): Promise<void> {
  if (!listening.value) return;
  const text = await props.speech.stop();
  emit("update:modelValue", text);
}
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
          @click="speech.useKeyboard()"
        >
          Escribir mientras tanto
        </button>
      </div>
    </div>

    <!-- Teclado (diseño: .l-input) -->
    <template v-if="strategy === 'keyboardDictation'">
      <div
        class="flex min-h-[52px] items-end gap-2 rounded-xl border-2 border-ink py-1.5 pr-1.5 pl-3"
      >
        <textarea
          :value="modelValue"
          rows="1"
          maxlength="300"
          lang="en"
          autocapitalize="sentences"
          aria-label="Tu respuesta en inglés"
          placeholder="Toca y dicta con el teclado"
          class="min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-ink-2"
          @input="
            emit(
              'update:modelValue',
              ($event.target as HTMLTextAreaElement).value,
            )
          "
          @keydown="onKeydown"
        />
        <button
          type="button"
          aria-label="Enviar"
          class="grid size-10 shrink-0 place-items-center rounded-[9px] bg-rosa disabled:opacity-50"
          :disabled="!canSend"
          @click="send"
        >
          <svg class="size-5 fill-white"><use href="#i-send" /></svg>
        </button>
      </div>
      <p v-if="isIOS" class="mt-1.5 text-xs text-ink-2">
        En el iPhone puedes tocar el micrófono del teclado para dictar.
      </p>
    </template>

    <!-- Micrófono del navegador (diseño: .l-live y .l-mic) -->
    <template v-else>
      <div
        v-if="listening || modelValue"
        class="rounded-xl border-2 border-dashed border-ink px-3 py-2.5 text-base font-bold"
        aria-live="polite"
      >
        {{ listening ? speech.interim.value || "…" : modelValue }}
        <small
          v-if="listening"
          class="mt-0.5 block text-xs font-normal text-ink-2"
        >
          Te estoy escuchando
        </small>
      </div>

      <div v-if="!listening && modelValue" class="mt-3 flex flex-col gap-2">
        <Button :disabled="!canSend" @click="send">Enviar</Button>
        <Button variant="quiet" @click="emit('update:modelValue', '')">
          Otra vez
        </Button>
      </div>
      <template v-else>
        <button
          type="button"
          aria-label="Mantén presionado para hablar"
          class="mx-auto mt-5 grid size-[84px] touch-none place-items-center rounded-full bg-rosa outline-[3px] outline-offset-[8px] outline-rosa outline-solid select-none disabled:opacity-50"
          :disabled="disabled"
          @pointerdown.prevent="press"
          @pointerup="release"
          @pointerleave="release"
          @pointercancel="release"
          @keydown.space.prevent="press"
          @keyup.space.prevent="release"
        >
          <svg class="size-9 fill-white"><use href="#i-mic" /></svg>
        </button>
        <p class="mt-5 text-center text-sm text-ink-2">
          Mantén presionado mientras hablas
        </p>
      </template>
      <p class="mt-2 text-center">
        <button
          type="button"
          class="text-sm font-bold text-l1 underline underline-offset-[3px]"
          @click="speech.useKeyboard()"
        >
          Prefiero escribir
        </button>
      </p>
    </template>
  </div>
</template>
