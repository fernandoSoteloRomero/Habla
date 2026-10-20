<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { getLevel } from "@/curriculum/levels";
import { getUnit } from "@/curriculum/units";
import { useAuthStore } from "@/stores/auth";

// Celular: "Habla" + avatar arriba y pestañas abajo (diseño: .l-word, .l-me, .l-tabs).
// Computadora (lg): barra superior con la navegación (diseño: .l-topbar).
const auth = useAuthStore();

const initial = computed(
  () => auth.profile?.name.trim().charAt(0).toUpperCase() || "?",
);

// El color de cada persona es el de su línea
const avatarColors = {
  l0: "bg-l0 text-white",
  l1: "bg-l1 text-white",
  l2: "bg-l2 text-white",
  l3: "bg-l3 text-ink",
};
const avatarClass = computed(() => {
  const unit = getUnit(auth.profile?.current_unit_id ?? "");
  return avatarColors[getLevel(unit.nivel).color];
});

const tabs = [
  { name: "hoy", label: "Hoy", icon: "#i-tab-today" },
  { name: "mi-linea", label: "Mi línea", icon: "#i-tab-map" },
];
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header
      class="flex items-center gap-[26px] px-5 pt-3.5 lg:border-b-2 lg:border-concrete lg:px-[26px] lg:pb-3.5"
    >
      <div class="font-display text-xl leading-none font-bold lg:text-2xl">
        Habla<span
          class="ml-[3px] inline-block size-2.5 rounded-full bg-rosa align-[2px]"
        />
      </div>
      <nav class="ml-auto hidden gap-[22px] text-sm font-bold text-ink-2 lg:flex">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.name"
          :to="{ name: tab.name }"
          active-class="text-ink border-b-4 border-rosa"
          class="pb-1"
        >
          {{ tab.label }}
        </RouterLink>
      </nav>
      <div
        class="ml-auto grid size-[34px] place-items-center rounded-[8px] text-base font-bold lg:ml-0"
        :class="avatarClass"
      >
        {{ initial }}
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1040px] flex-1 px-5 pb-6">
      <RouterView />
    </main>

    <!-- Pestañas del celular -->
    <nav
      class="sticky bottom-0 flex justify-around border-t-2 border-concrete bg-white pt-2.5 pb-[calc(18px+env(safe-area-inset-bottom))] text-xs font-bold lg:hidden"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        active-class="is-active"
        class="flex flex-col items-center gap-[3px] text-ink-2 [&.is-active]:text-ink [&.is-active_svg]:fill-rosa"
      >
        <svg class="size-[22px] fill-ink-2">
          <use :href="tab.icon" />
        </svg>
        {{ tab.label }}
      </RouterLink>
    </nav>
  </div>
</template>
