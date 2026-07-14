import type { Flashcard } from '../types'
import { mergePatterns, parsePatternInput } from './patterns'

const SEPARATORS = ['\t', '｜', '|', '：', ':', '——', '—', ' - ']
const NOTE_PREFIXES = ['#', '//', '【备注】', '备注：', '备注:']
const PATTERN_PREFIXES = ['@', '句型：', '句型:', '句式：', '句式:', '【句型】', '【句式】']

interface ParsedPair {
  japanese: string
  chinese: string
  notes: string
  patterns: string[]
}

function parsePatternLine(line: string): string[] {
  const trimmed = line.trim()

  for (const prefix of PATTERN_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return parsePatternInput(trimmed.slice(prefix.length))
    }
  }

  if (trimmed.startsWith('#')) {
    const content = trimmed.slice(1).trim()
    for (const prefix of ['句型：', '句型:', '句式：', '句式:']) {
      if (content.startsWith(prefix)) {
        return parsePatternInput(content.slice(prefix.length))
      }
    }
  }

  return []
}

function isPatternLine(line: string): boolean {
  return parsePatternLine(line).length > 0 || line.trim().startsWith('@')
}

function isNoteLine(line: string): boolean {
  const trimmed = line.trim()
  if (isPatternLine(line)) return false
  return NOTE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}

function parseNoteLine(line: string): string {
  const trimmed = line.trim()
  for (const prefix of NOTE_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim()
    }
  }
  return trimmed
}

function splitLine(line: string): { japanese: string; chinese: string } | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  for (const sep of SEPARATORS) {
    const idx = trimmed.indexOf(sep)
    if (idx > 0 && idx < trimmed.length - sep.length) {
      const left = trimmed.slice(0, idx).trim()
      const right = trimmed.slice(idx + sep.length).trim()
      if (left && right) {
        return { japanese: left, chinese: right }
      }
    }
  }

  return null
}

function hasJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

function looksLikeJapaneseFirst(jp: string, cn: string): boolean {
  const jpScore = (jp.match(/[\u3040-\u309F\u30A0-\u30FF]/g) ?? []).length
  const cnScore = (cn.match(/[\u4E00-\u9FFF]/g) ?? []).length
  const cnJpScore = (cn.match(/[\u3040-\u309F\u30A0-\u30FF]/g) ?? []).length
  const jpCnScore = (jp.match(/[\u4E00-\u9FFF]/g) ?? []).length

  if (jpScore > cnJpScore) return true
  if (cnJpScore > jpScore) return false
  if (jpCnScore < cnScore) return true
  return true
}

function normalizePair(a: string, b: string): { japanese: string; chinese: string } {
  if (looksLikeJapaneseFirst(a, b)) {
    return { japanese: a, chinese: b }
  }
  return { japanese: b, chinese: a }
}

export function parseDialogueInput(raw: string): Flashcard[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const pairs: ParsedPair[] = []

  let i = 0
  while (i < lines.length) {
    const patternTags = parsePatternLine(lines[i])
    if (patternTags.length > 0 || lines[i].trim().startsWith('@')) {
      if (pairs.length > 0) {
        const last = pairs[pairs.length - 1]
        last.patterns = mergePatterns(last.patterns, patternTags)
      }
      i += 1
      continue
    }

    if (isNoteLine(lines[i])) {
      const note = parseNoteLine(lines[i])
      if (pairs.length > 0 && note) {
        const last = pairs[pairs.length - 1]
        last.notes = last.notes ? `${last.notes}\n${note}` : note
      }
      i += 1
      continue
    }

    const inline = splitLine(lines[i])
    if (inline) {
      pairs.push({ ...inline, notes: '', patterns: [] })
      i += 1
      continue
    }

    if (i + 1 < lines.length) {
      const nextInline = splitLine(lines[i + 1])
      if (!nextInline && !isNoteLine(lines[i + 1]) && !isPatternLine(lines[i + 1])) {
        pairs.push({ ...normalizePair(lines[i], lines[i + 1]), notes: '', patterns: [] })
        i += 2
        continue
      }
    }

    if (hasJapanese(lines[i])) {
      pairs.push({ japanese: lines[i], chinese: lines[i], notes: '', patterns: [] })
    }
    i += 1
  }

  const seen = new Set<string>()
  const cards: Flashcard[] = []

  for (const pair of pairs) {
    const key = `${pair.japanese}|||${pair.chinese}|||${pair.notes}|||${pair.patterns.join(',')}`
    if (seen.has(key)) continue
    seen.add(key)

    cards.push({
      id: crypto.randomUUID(),
      japanese: pair.japanese,
      chinese: pair.chinese,
      notes: pair.notes,
      patterns: pair.patterns,
    })
  }

  return cards
}

export function cardsToPreviewText(cards: Flashcard[]): string {
  return cards
    .map((c) => {
      const lines = [`${c.japanese}\t${c.chinese}`]
      if (c.notes) lines.push(`# ${c.notes.replace(/\n/g, '\n# ')}`)
      for (const pattern of c.patterns ?? []) {
        lines.push(`@ ${pattern}`)
      }
      return lines.join('\n')
    })
    .join('\n')
}
