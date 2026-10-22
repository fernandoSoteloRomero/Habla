// Fila de public.phrases (fase 3): una frase en el repaso de la persona
export interface Phrase {
  id: number;
  en: string;
  es: string;
  unit_id: string;
  due_on: string;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
  reviewed_on: string | null;
}

// Frases que tocan hoy (máximo 15 al día) y cuántas ya se repasaron hoy
export interface ReviewQueue {
  phrases: Phrase[];
  reviewedToday: number;
}

// Datos de la pestaña Repaso (pantalla 3.1)
export interface PhraseStats {
  tomorrow: number;
  week: number;
  total: number;
  hardest: Phrase[];
}
