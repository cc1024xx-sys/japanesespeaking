export interface Flashcard {
  id: string
  japanese: string
  chinese: string
  notes: string
  patterns: string[]
}

export interface Scenario {
  id: string
  name: string
  description: string
  cards: Flashcard[]
  createdAt: number
  updatedAt: number
}

export interface PatternCardRef {
  scenarioId: string
  scenarioName: string
  card: Flashcard
}

export interface PatternEntry {
  pattern: string
  items: PatternCardRef[]
}

export type View = 'home' | 'edit' | 'study' | 'patterns'
