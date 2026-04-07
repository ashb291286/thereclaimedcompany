const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "from",
  "your",
  "our",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "x",
]);

/** Extra tokens matched per category slug (seed categories + semantic neighbours). */
export const CATEGORY_SEMANTIC_KEYWORDS: Record<string, string[]> = {
  "bricks-blocks": [
    "brick",
    "bricks",
    "block",
    "blocks",
    "engineering",
    "reclaimed",
    "clay",
    "paver",
    "wall",
  ],
  "timber-wood": [
    "timber",
    "wood",
    "lumber",
    "beam",
    "beams",
    "joist",
    "joists",
    "plank",
    "planks",
    "board",
    "boards",
    "oak",
    "pine",
    "floorboard",
    "skirting",
  ],
  "roof-tiles-slates": [
    "roof",
    "roofing",
    "tile",
    "tiles",
    "slate",
    "slates",
    "pantile",
    "ridges",
    "ridge",
    "thatch",
  ],
  flooring: [
    "floor",
    "flooring",
    "parquet",
    "lvt",
    "laminate",
    "boards",
    "tiles",
    "flagstone",
  ],
  fireplaces: [
    "fireplace",
    "mantel",
    "mantle",
    "hearth",
    "surround",
    "grate",
    "insert",
    "chimney",
  ],
  doors: ["door", "doors", "panel", "entrance", "front", "internal", "glazed"],
  windows: ["window", "windows", "sash", "casement", "glazing", "frame", "frames"],
  staircases: ["stair", "stairs", "staircase", "balustrade", "newel", "banister", "spiral"],
  "cornicing-architraves": [
    "cornice",
    "coving",
    "architrave",
    "moulding",
    "molding",
    "skirting",
    "plaster",
    "ceiling",
    "rose",
  ],
  "hardware-fixtures": [
    "hinge",
    "hinges",
    "handle",
    "handles",
    "lock",
    "locks",
    "bracket",
    "rail",
    "hook",
    "latch",
    "knob",
    "pull",
  ],
  "stone-paving": [
    "stone",
    "granite",
    "marble",
    "limestone",
    "paving",
    "cobble",
    "cobbles",
    "flagstone",
    "setts",
    "kerb",
    "edging",
  ],
  other: [],
};

export type CategorySuggestRecord = { id: string; name: string; slug: string };

export type CategorySuggestionResult = {
  bestMatch: CategorySuggestRecord | null;
  score: number;
  /** True when we should nudge the user to pick manually or suggest a new category. */
  lowConfidence: boolean;
};

const LOW_CONFIDENCE_BELOW = 1.25;

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function normalizeToken(t: string): string {
  return t
    .toLowerCase()
    .replace(/['’]s$/, "")
    .replace(/[^a-z0-9]/g, "");
}

export function tokenizeTitle(title: string): string[] {
  const raw = title
    .toLowerCase()
    .split(/[\s,/·|+&]+/)
    .map(normalizeToken)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return [...new Set(raw)];
}

function categoryKeywordSet(cat: CategorySuggestRecord): Set<string> {
  const set = new Set<string>();
  for (const part of cat.slug.split("-")) {
    if (part.length > 1) set.add(part);
  }
  for (const part of cat.name.toLowerCase().split(/[\s&/,]+/)) {
    const t = normalizeToken(part);
    if (t.length > 1) set.add(t);
  }
  const extra = CATEGORY_SEMANTIC_KEYWORDS[cat.slug];
  if (extra) {
    for (const k of extra) {
      const t = normalizeToken(k);
      if (t.length > 0) set.add(t);
    }
  }
  return set;
}

/**
 * Score title tokens against category names + semantic keyword maps (no external API).
 */
export function suggestCategoryFromTitle(
  title: string,
  categories: CategorySuggestRecord[]
): CategorySuggestionResult {
  const tokens = tokenizeTitle(title);
  if (tokens.length === 0) {
    return { bestMatch: null, score: 0, lowConfidence: true };
  }

  let best: CategorySuggestRecord | null = null;
  let bestScore = 0;

  for (const cat of categories) {
    const keywords = categoryKeywordSet(cat);
    let score = 0;
    for (const tok of tokens) {
      if (keywords.has(tok)) {
        score += 1;
        continue;
      }
      for (const kw of keywords) {
        if (kw.length > 2 && (tok.includes(kw) || kw.includes(tok))) {
          score += 0.65;
          break;
        }
      }
    }
    const hay = `${cat.name} ${cat.slug}`.toLowerCase();
    const titleLower = title.toLowerCase();
    if (titleLower.length > 3 && hay.includes(titleLower.slice(0, Math.min(24, titleLower.length)))) {
      score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  return {
    bestMatch: best,
    score: bestScore,
    lowConfidence: bestScore < LOW_CONFIDENCE_BELOW,
  };
}
