// Topic matcher: keyword-overlap fallback + AI semantic batch matcher.
import { supabase } from "@/integrations/supabase/client";

const STOPWORDS = new Set([
  "the","a","an","of","to","and","or","for","with","in","on","is","are","be","by",
  "what","how","why","you","your","my","this","that","ai","using","use","intro",
  "introduction","beginners","beginner","tutorial","guide","explained","basics",
  "complete","part","vs","from","into","at","it","its","as","about","learn",
]);

function tokens(s: string): Set<string> {
  return new Set(
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

export function scoreOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let hits = 0;
  ta.forEach((t) => { if (tb.has(t)) hits += 1; });
  return hits;
}

/** Keyword-overlap fallback. */
export function bestTopicId<T extends { id: string; title: string }>(
  text: string,
  topics: T[]
): string | null {
  if (!topics.length) return null;
  let bestScore = 0;
  let bestId = topics[0].id;
  for (const t of topics) {
    const s = scoreOverlap(text, t.title);
    if (s > bestScore) { bestScore = s; bestId = t.id; }
  }
  return bestId;
}

/**
 * Semantic batch matcher via Lovable AI. Falls back to keyword overlap on failure.
 * items: array of { key, text }. topics: { id, title }[]. Returns map key → topicId.
 */
export async function bestTopicIdsAI<T extends { id: string; title: string }>(
  items: { key: string; text: string }[],
  topics: T[]
): Promise<Record<string, string | null>> {
  if (!items.length || !topics.length) return {};
  try {
    const { data, error } = await supabase.functions.invoke("match-topics", {
      body: { items, topics: topics.map(t => ({ id: t.id, title: t.title })) },
    });
    if (error) throw error;
    if ((data as any)?.fallback) {
      const out: Record<string, string | null> = {};
      for (const it of items) out[it.key] = bestTopicId(it.text, topics);
      return out;
    }
    const matches: Record<string, string | null> = (data as any)?.matches || {};
    for (const it of items) {
      if (!matches[it.key]) matches[it.key] = bestTopicId(it.text, topics);
    }
    return matches;
  } catch (e) {
    console.warn("AI topic match failed, using keyword fallback", e);
    const out: Record<string, string | null> = {};
    for (const it of items) out[it.key] = bestTopicId(it.text, topics);
    return out;
  }
}
