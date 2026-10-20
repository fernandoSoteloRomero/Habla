<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";

// Pantalla 1.1: la línea rosa ya muestra el viaje; solo se entra con Google y con invitación.
const auth = useAuthStore();
const opening = ref(false);

async function continueWithGoogle(): Promise<void> {
  opening.value = true;
  try {
    await auth.signInWithGoogle();
  } finally {
    opening.value = false;
  }
}

function retry(): void {
  window.location.reload();
}
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-3.5 pb-6">
    <!-- La línea rosa con la primera estación en amarillo (diseño: .l-cover) -->
    <div
      class="relative flex flex-1 flex-col pl-[34px] before:absolute before:top-0 before:bottom-0 before:left-[11px] before:w-2 before:rounded before:bg-rosa before:content-['']"
    >
      <h1
        class="mt-7 font-display text-[76px] leading-[.85] font-bold tracking-[-.02em]"
      >
        Habla
      </h1>
      <p class="mt-3 mb-[18px] text-base text-ink">
        Inglés para moverte en la vida real, 20 minutos al día.
      </p>
      <div
        class="relative py-[7px] font-display text-lg font-semibold text-ink before:absolute before:top-[5px] before:-left-[35px] before:box-border before:size-[26px] before:rounded-full before:border-[6px] before:border-ink before:bg-yellow before:content-['']"
      >
        Presentarte
      </div>
      <div
        v-for="station in ['Pedir comida', 'Tu primera junta']"
        :key="station"
        class="relative py-[7px] font-display text-lg font-semibold text-ink-2 before:absolute before:top-[9px] before:-left-[31px] before:box-border before:size-[18px] before:rounded-full before:border-4 before:border-rosa before:bg-white before:content-['']"
      >
        {{ station }}
      </div>
    </div>

    <!-- Avisos cuando no se pudo entrar (diseño: .l-alert) -->
    <div
      v-if="auth.loginError === 'sin-invitacion'"
      class="mt-3.5 flex gap-[11px] rounded-xl bg-yellow p-3 text-sm leading-snug"
    >
      <span class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink">
        <svg class="size-[19px] fill-white"><use href="#i-mail" /></svg>
      </span>
      <div>
        <b class="mb-0.5 block">No pudimos dejarte entrar</b>
        Solo pueden entrar correos invitados. Si ya te invitaron, revisa que
        elegiste la cuenta de Google correcta.
      </div>
    </div>
    <div
      v-else-if="auth.loginError === 'sin-perfil'"
      class="mt-3.5 flex gap-[11px] rounded-xl bg-yellow p-3 text-sm leading-snug"
    >
      <span class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink">
        <svg class="size-[19px] fill-white"><use href="#i-group" /></svg>
      </span>
      <div>
        <b class="mb-0.5 block">Entraste, pero falta tu perfil</b>
        Avísale a quien te invitó para que lo revise.
      </div>
    </div>
    <div
      v-else-if="auth.loginError === 'sin-conexion'"
      class="mt-3.5 flex gap-[11px] rounded-xl bg-concrete p-3 text-sm leading-snug"
    >
      <span class="grid size-8 shrink-0 place-items-center rounded-[7px] bg-ink">
        <svg class="size-[19px] fill-white"><use href="#i-nowifi" /></svg>
      </span>
      <div>
        <b class="mb-0.5 block">Sin conexión a internet</b>
        Revisa tu conexión y vuelve a intentar.<br />
        <button
          type="button"
          class="mt-1.5 font-bold text-l1 underline underline-offset-[3px]"
          @click="retry"
        >
          Reintentar
        </button>
      </div>
    </div>

    <Button
      variant="line"
      class="mt-3.5"
      :disabled="opening"
      @click="continueWithGoogle"
    >
      <span class="text-lg font-bold text-[#4285F4]">G</span>
      Continuar con Google
    </Button>
    <p class="mt-2.5 text-xs leading-snug text-ink-2">
      Solo pueden entrar personas invitadas. Si no tienes invitación, pídesela a
      quien te recomendó la app.
    </p>
  </div>
</template>
