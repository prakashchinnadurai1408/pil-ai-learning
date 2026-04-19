// Lightweight keyword-overlap matcher used to auto-link videos to module topics
// when an explicit topic_id is not present (legacy/static videos, or admin-created
// rows that were saved without picking a topic).

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

/**
 * Pick the topic whose title overlaps most with the given text.
 * Falls back to the first topic when nothing matches.
 */
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
