import { normalizeScenario } from '../storage'
import type { Scenario } from '../types'

export const BACKUP_VERSION = 1
export const BACKUP_APP = 'japanese-speaking-flashcards'

export interface BackupData {
  version: number
  app: string
  exportedAt: number
  scenarios: Scenario[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidScenario(value: unknown): value is Scenario {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return false
  if (!Array.isArray(value.cards)) return false

  return value.cards.every((card) => {
    if (!isRecord(card)) return false
    return (
      typeof card.id === 'string' &&
      typeof card.japanese === 'string' &&
      typeof card.chinese === 'string'
    )
  })
}

export function createBackup(scenarios: Scenario[]): BackupData {
  return {
    version: BACKUP_VERSION,
    app: BACKUP_APP,
    exportedAt: Date.now(),
    scenarios: scenarios.map(normalizeScenario),
  }
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2)
}

export function parseBackup(raw: string): BackupData {
  const parsed: unknown = JSON.parse(raw)

  if (!isRecord(parsed) || !Array.isArray(parsed.scenarios)) {
    throw new Error('备份文件格式无效')
  }

  if (parsed.app !== BACKUP_APP) {
    throw new Error('这不是日语口语闪卡的备份文件')
  }

  if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) {
    throw new Error('备份版本过高，请更新应用后再导入')
  }

  const scenarios = parsed.scenarios.filter(isValidScenario).map(normalizeScenario)
  if (scenarios.length === 0) {
    throw new Error('备份中没有可用的场景数据')
  }

  return {
    version: parsed.version,
    app: parsed.app,
    exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : Date.now(),
    scenarios,
  }
}

export function mergeScenarios(existing: Scenario[], imported: Scenario[]): Scenario[] {
  const map = new Map(existing.map((scenario) => [scenario.id, scenario]))

  for (const scenario of imported.map(normalizeScenario)) {
    map.set(scenario.id, scenario)
  }

  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function downloadBackup(scenarios: Scenario[]): void {
  const backup = createBackup(scenarios)
  const blob = new Blob([serializeBackup(backup)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const date = new Date(backup.exportedAt).toISOString().slice(0, 10)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `日语口语闪卡备份_${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function formatBackupTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN')
}
