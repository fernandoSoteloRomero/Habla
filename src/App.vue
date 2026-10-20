<script setup lang="ts">
// Temporal (Tarea 1): solo comprueba que el sprite y los tokens cargan. La Tarea 3 lo cambia a <RouterView />.
import PictoTile from "@/components/PictoTile.vue";
import { Button } from "@/components/ui/button";
</script>

<template>
  <main class="flex max-w-sm flex-col gap-3 p-5">
    <h1 class="font-display text-2xl font-bold">Habla</h1>
    <div class="flex gap-2">
      <PictoTile name="food" size="sm" bg="l2" />
      <PictoTile name="hand" />
      <PictoTile name="plane" size="lg" bg="rosa" />
    </div>
    <Button>Acción principal</Button>
    <Button variant="line">Acción secundaria</Button>
    <Button variant="quiet">Acción discreta</Button>
  </main>
</template>
