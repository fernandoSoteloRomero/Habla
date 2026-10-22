<script setup lang="ts">
import type { Notice } from "@/common/AiNotice";

// Un aviso (diseño: .l-alert) con el botón de volver a intentar, si tiene caso
defineProps<{ notice: Notice }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div
    class="flex gap-[11px] rounded-xl p-3 text-sm leading-snug"
    :class="notice.tone"
  >
    <span class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink">
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
          @click="emit('retry')"
        >
          {{ notice.retry }}
        </button>
      </template>
    </div>
  </div>
</template>
