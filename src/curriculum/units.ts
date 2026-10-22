// El temario vive en supabase/functions/_shared/curriculum para que la Edge Function `session`
// lo lea igual que la app. Aquí solo se re-exporta, así los imports de la app no cambian.
export * from "@shared/curriculum/units";
