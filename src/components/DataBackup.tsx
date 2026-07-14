import { useRef, useState } from 'react'
import type { Scenario } from '../types'
import {
  downloadBackup,
  formatBackupTime,
  mergeScenarios,
  parseBackup,
} from '../utils/backup'

interface DataBackupProps {
  scenarios: Scenario[]
  onImport: (scenarios: Scenario[]) => void
}

export default function DataBackup({ scenarios, onImport }: DataBackupProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [message, setMessage] = useState<string | null>(null)

  function handleExport() {
    downloadBackup(scenarios)
    setMessage(`已导出 ${scenarios.length} 个场景`)
  }

  function handlePickFile(mode: 'merge' | 'replace') {
    setImportMode(mode)
    setMessage(null)
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const raw = await file.text()
      const backup = parseBackup(raw)
      const importedCount = backup.scenarios.length

      if (importMode === 'replace') {
        const confirmed = confirm(
          `将用备份中的 ${importedCount} 个场景替换当前全部 ${scenarios.length} 个场景。\n\n备份时间：${formatBackupTime(backup.exportedAt)}\n\n此操作不可撤销，确定继续？`,
        )
        if (!confirmed) return
        onImport(backup.scenarios)
        setMessage(`已替换为 ${importedCount} 个场景`)
        return
      }

      const merged = mergeScenarios(scenarios, backup.scenarios)
      const confirmed = confirm(
        `将把备份中的 ${importedCount} 个场景合并到现有 ${scenarios.length} 个场景中。\n\n备份时间：${formatBackupTime(backup.exportedAt)}\n\n相同 ID 的场景会被覆盖，确定继续？`,
      )
      if (!confirmed) return
      onImport(merged)
      setMessage(`已合并，当前共 ${merged.length} 个场景`)
    } catch (error) {
      const text = error instanceof Error ? error.message : '导入失败'
      alert(text)
    }
  }

  return (
    <div className="panel data-backup-panel">
      <div className="panel-title">数据备份</div>
      <p className="form-hint data-backup-desc">
        导出全部场景与闪卡为 JSON 文件，可在其他设备或浏览器中导入恢复。
      </p>

      <div className="data-backup-actions">
        <button type="button" className="btn btn-secondary" onClick={handleExport}>
          导出备份
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => handlePickFile('merge')}>
          导入合并
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => handlePickFile('replace')}>
          导入替换
        </button>
      </div>

      <p className="form-hint data-backup-hint">
        合并：保留现有数据，同 ID 场景以备份为准；替换：清空后仅保留备份内容。
      </p>

      {message && <p className="data-backup-message">{message}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleFileChange}
      />
    </div>
  )
}
