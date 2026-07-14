import type { Scenario } from './types'

const STORAGE_KEY = 'japanese-speaking-scenarios'

export function normalizeScenario(scenario: Scenario): Scenario {
  const now = Date.now()
  return {
    ...scenario,
    description: scenario.description ?? '',
    createdAt: typeof scenario.createdAt === 'number' ? scenario.createdAt : now,
    updatedAt: typeof scenario.updatedAt === 'number' ? scenario.updatedAt : now,
    cards: scenario.cards.map((card) => ({
      ...card,
      notes: card.notes ?? '',
      patterns: Array.isArray(card.patterns) ? card.patterns : [],
    })),
  }
}

export function loadScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Scenario[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeScenario)
  } catch {
    return []
  }
}

export function saveScenarios(scenarios: Scenario[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
}

export function createScenario(name: string, description = ''): Scenario {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    description,
    cards: [],
    createdAt: now,
    updatedAt: now,
  }
}
