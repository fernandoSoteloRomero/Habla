<script setup lang="ts">
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";

// "Seguir practicando" al terminar una conversación: la app recomienda lo que más conviene
// (otra conversación si le fue bien; ejercicios si le costó) y la recomendada va en rosa.
// Sin IA disponible no se ofrece otra conversación.
const props = defineProps<{
  recommended: "conversar" | "ejercicios";
  canConverse: boolean;
}>();

const router = useRouter();
const converseFirst = (): boolean =>
  props.canConverse && props.recommended === "conversar";
</script>

<template>
  <div data-testid="seguir-practicando">
    <h2 class="mt-5 text-[15px] font-bold">Seguir practicando</h2>
    <p class="mt-0.5 text-sm text-ink-2">
      {{
        converseFirst()
          ? "Te salió bien: otra conversación te ayuda a soltarte."
          : "Unos ejercicios te ayudan a fijar las frases."
      }}
    </p>
    <div class="mt-2.5 flex flex-col gap-2">
      <Button
        v-if="canConverse"
        :variant="converseFirst() ? 'go' : 'line'"
        :class="{ 'order-2': !converseFirst() }"
        @click="router.push({ name: 'practica' })"
      >
        Otra conversación
      </Button>
      <Button
        :variant="converseFirst() ? 'line' : 'go'"
        @click="router.push({ name: 'repaso-ejercicios' })"
      >
        Practicar con ejercicios
      </Button>
    </div>
  </div>
</template>
