<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="mx-auto max-w-md px-5 pt-10">
    <h1 class="font-display text-2xl leading-none font-bold">
      Esta página no existe.
    </h1>
    <RouterLink
      :to="{ name: 'hoy' }"
      class="mt-4 inline-block text-sm font-bold text-l1 underline underline-offset-[3px]"
    >
      Ir a Hoy
    </RouterLink>
  </div>
</template>
