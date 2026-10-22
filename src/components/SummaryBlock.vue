<script setup lang="ts">
import type { SessionSummary } from "@/Services/interfaces/Session/SessionInterface";

// El resumen de una conversación (pantalla 2.6): primero lo que salió bien y después, como
// máximo, 3 correcciones en verde. Sin IA, "Lo que hiciste bien" no aparece.
defineProps<{ summary: SessionSummary | null }>();
</script>

<template>
  <template v-if="summary && summary.bien.length > 0">
    <h2 class="mt-4 text-[15px] font-bold">Lo que hiciste bien</h2>
    <ul class="mt-1.5 flex flex-col gap-1.5 text-base">
      <li v-for="item in summary.bien" :key="item" class="flex gap-2">
        <svg
          viewBox="0 0 24 24"
          class="mt-px size-4 shrink-0 fill-none stroke-l2 stroke-[3.2]"
        >
          <use href="#i-check" />
        </svg>
        {{ item }}
      </li>
    </ul>
  </template>

  <template v-if="summary && summary.correcciones.length > 0">
    <h2 class="mt-3.5 text-[15px] font-bold">Para la próxima</h2>
    <div
      class="mt-1.5 flex flex-col gap-1 rounded-[4px_10px_10px_4px] border-l-[5px] border-l2 bg-l2-soft px-[11px] py-[9px] text-sm leading-snug"
    >
      <p
        v-for="fix in summary.correcciones"
        :key="fix.mejor"
        class="flex flex-wrap items-baseline gap-x-2"
        lang="en"
      >
        <s class="text-ink-2">{{ fix.original }}</s>
        <b>{{ fix.mejor }}</b>
      </p>
    </div>
  </template>
</template>
