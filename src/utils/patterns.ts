import type { Flashcard, PatternCardRef, PatternEntry, Scenario } from '../types'

export function normalizePattern(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function parsePatternInput(raw: string): string[] {
  const normalized = normalizePattern(raw)
  return normalized ? [normalized] : []
}

export function mergePatterns(existing: string[], incoming: string[]): string[] {
  const set = new Set(existing.map(normalizePattern).filter(Boolean))
  for (const p of incoming) {
    const normalized = normalizePattern(p)
    if (normalized) set.add(normalized)
  }
  return [...set]
}

export function collectPatterns(scenarios: Scenario[]): PatternEntry[] {
  const map = new Map<string, PatternCardRef[]>()

  for (const scenario of scenarios) {
    for (const card of scenario.cards) {
      for (const pattern of card.patterns ?? []) {
        const key = normalizePattern(pattern)
        if (!key) continue

        const items = map.get(key) ?? []
        items.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          card,
        })
        map.set(key, items)
      }
    }
  }

  return [...map.entries()]
    .map(([pattern, items]) => ({ pattern, items }))
    .sort((a, b) => b.items.length - a.items.length || a.pattern.localeCompare(b.pattern, 'ja'))
}

export function suggestScenarioPatterns(
  cards: Flashcard[],
  query: string,
  options?: { exclude?: string[]; limit?: number },
): string[] {
  const q = normalizePattern(query).toLowerCase()
  if (!q) return []

  const exclude = new Set((options?.exclude ?? []).map(normalizePattern).filter(Boolean))
  const limit = options?.limit ?? 6

  const usage = new Map<string, number>()
  for (const card of cards) {
    for (const pattern of card.patterns ?? []) {
      const key = normalizePattern(pattern)
      if (key) usage.set(key, (usage.get(key) ?? 0) + 1)
    }
  }

  const candidates = [...usage.keys()].filter((p) => !exclude.has(p) && p.toLowerCase().includes(q))

  candidates.sort((a, b) => {
    const aLower = a.toLowerCase()
    const bLower = b.toLowerCase()
    const aStarts = aLower.startsWith(q) ? 0 : 1
    const bStarts = bLower.startsWith(q) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    const usageDiff = (usage.get(b) ?? 0) - (usage.get(a) ?? 0)
    if (usageDiff !== 0) return usageDiff
    return a.localeCompare(b, 'ja')
  })

  return candidates.slice(0, limit)
}

export function cardsForPattern(scenarios: Scenario[], pattern: string): PatternCardRef[] {
  const key = normalizePattern(pattern)
  const entry = collectPatterns(scenarios).find((e) => e.pattern === key)
  return entry?.items ?? []
}

export function flashcardsFromRefs(refs: PatternCardRef[]): Flashcard[] {
  const seen = new Set<string>()
  const cards: Flashcard[] = []

  for (const ref of refs) {
    const dedupeKey = `${ref.scenarioId}::${ref.card.id}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    cards.push(ref.card)
  }

  return cards
}

export function removePatternFromScenarios(scenarios: Scenario[], pattern: string): Scenario[] {
  const key = normalizePattern(pattern)
  if (!key) return scenarios

  const now = Date.now()
  return scenarios.map((scenario) => {
    const cards = scenario.cards.map((card) => ({
      ...card,
      patterns: (card.patterns ?? []).filter((p) => normalizePattern(p) !== key),
    }))
    const changed = cards.some(
      (card, index) => card.patterns.length !== (scenario.cards[index].patterns ?? []).length,
    )
    return changed ? { ...scenario, cards, updatedAt: now } : scenario
  })
}

export function renamePatternInScenarios(
  scenarios: Scenario[],
  oldPattern: string,
  newPattern: string,
): Scenario[] {
  const oldKey = normalizePattern(oldPattern)
  const newKey = normalizePattern(newPattern)
  if (!oldKey || !newKey || oldKey === newKey) return scenarios

  const now = Date.now()
  return scenarios.map((scenario) => {
    let changed = false
    const cards = scenario.cards.map((card) => {
      const patterns = card.patterns ?? []
      if (!patterns.some((p) => normalizePattern(p) === oldKey)) return card
      changed = true
      return {
        ...card,
        patterns: mergePatterns(
          [],
          patterns.map((p) => (normalizePattern(p) === oldKey ? newKey : p)),
        ),
      }
    })
    return changed ? { ...scenario, cards, updatedAt: now } : scenario
  })
}
