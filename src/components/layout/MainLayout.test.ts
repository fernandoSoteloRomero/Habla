import type { Session } from "@supabase/supabase-js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import router from "@/router";
import { useAuthStore } from "@/stores/auth";
import MainLayout from "./MainLayout.vue";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

enableAutoUnmount(afterEach);

describe("MainLayout", () => {
  it("en Mi línea solo se marca esa pestaña, no también Hoy", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore();
    auth.session = { user: { id: "u1" } } as Session;
    auth.profile = {
      user_id: "u1",
      name: "Ana",
      motive: "viajes",
      level: "L0",
      current_unit_id: "l0-saludar",
      is_admin: false,
      placed_at: "2026-10-21T15:00:00Z",
    };
    await router.push("/mi-linea");
    const w = mount(MainLayout, { global: { plugins: [pinia, router] } });

    const tab = (label: string): string[] =>
      w
        .findAll("nav.sticky a")
        .find((a) => a.text() === label)
        ?.classes() ?? [];
    expect(tab("Mi línea")).toContain("is-active");
    expect(tab("Hoy")).not.toContain("is-active");
  });
});
