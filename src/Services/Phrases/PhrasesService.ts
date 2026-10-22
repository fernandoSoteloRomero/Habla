import { addDays } from "@/common/Dates";
import { MAX_REVIEWS_PER_DAY } from "@/common/SpacedRepetition";
import type { SrsUpdate } from "@/common/SpacedRepetition";
import type { KeyPhrase } from "@/curriculum/units";
import { supabase } from "@/lib/supabase";
import type {
  Phrase,
  PhraseStats,
  ReviewQueue,
} from "@/Services/interfaces/Phrases/PhraseInterface";

// El RLS deja ver y calificar solo las frases propias; no hace falta filtrar por usuario aquí.
const COLUMNS =
  "id, en, es, unit_id, due_on, interval_days, ease, reps, lapses, reviewed_on";

export default {
  // Lo que toca repasar hoy: vencidas hasta hoy, las más atrasadas primero, sin pasar de 15 al día
  async GetReviewQueue(today: string): Promise<ReviewQueue> {
    const { count, error: countError } = await supabase
      .from("phrases")
      .select("id", { count: "exact", head: true })
      .eq("reviewed_on", today);
    if (countError) throw countError;
    const reviewedToday = count ?? 0;
    const remaining = MAX_REVIEWS_PER_DAY - reviewedToday;
    if (remaining <= 0) return { phrases: [], reviewedToday };

    const { data, error } = await supabase
      .from("phrases")
      .select(COLUMNS)
      .lte("due_on", today)
      .order("due_on", { ascending: true })
      .order("lapses", { ascending: false })
      .limit(remaining);
    if (error) throw error;
    return { phrases: (data ?? []) as Phrase[], reviewedToday };
  },

  async SaveReview(id: number, update: SrsUpdate): Promise<void> {
    const { error } = await supabase
      .from("phrases")
      .update(update)
      .eq("id", id);
    if (error) throw error;
  },

  // Las frases que se acaban de aprender entran al repaso; si ya estaban, no se duplican
  async AddLessonPhrases(
    userId: string,
    unitId: string,
    phrases: KeyPhrase[],
    dueOn: string,
  ): Promise<void> {
    const rows = phrases.map((p) => ({
      user_id: userId,
      en: p.en,
      es: p.es,
      source: "leccion",
      unit_id: unitId,
      due_on: dueOn,
    }));
    const { error } = await supabase
      .from("phrases")
      .upsert(rows, { onConflict: "user_id,en", ignoreDuplicates: true });
    if (error) throw error;
  },

  // Las frases de la meta que ya están en el repaso (para no volver a enseñarlas)
  async GetLearnedEn(unitId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("phrases")
      .select("en")
      .eq("unit_id", unitId);
    if (error) throw error;
    return (data ?? []).map((row) => (row as { en: string }).en);
  },

  async GetStats(today: string): Promise<PhraseStats> {
    const tomorrowDate = addDays(today, 1);
    const [tomorrow, week, total, hardest] = await Promise.all([
      supabase
        .from("phrases")
        .select("id", { count: "exact", head: true })
        .eq("due_on", tomorrowDate),
      supabase
        .from("phrases")
        .select("id", { count: "exact", head: true })
        .gte("due_on", tomorrowDate)
        .lte("due_on", addDays(today, 7)),
      supabase.from("phrases").select("id", { count: "exact", head: true }),
      supabase
        .from("phrases")
        .select(COLUMNS)
        .gt("lapses", 0)
        .order("lapses", { ascending: false })
        .limit(3),
    ]);
    const failed = [tomorrow, week, total, hardest].find((r) => r.error);
    if (failed?.error) throw failed.error;
    return {
      tomorrow: tomorrow.count ?? 0,
      week: week.count ?? 0,
      total: total.count ?? 0,
      hardest: (hardest.data ?? []) as Phrase[],
    };
  },
};
