import { useMemo, useState } from 'react'
import type { PatternCardRef, Scenario } from '../types'
import { collectPatterns, flashcardsFromRefs } from '../utils/patterns'

interface PatternBrowserProps {
  scenarios: Scenario[]
  onBack: () => void
  onStudyPattern: (pattern: string, cards: ReturnType<typeof flashcardsFromRefs>) => void
}

export default function PatternBrowser({ scenarios, onBack, onStudyPattern }: PatternBrowserProps) {
  const [query, setQuery] = useState('')
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null)

  const entries = useMemo(() => collectPatterns(scenarios), [scenarios])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => e.pattern.toLowerCase().includes(q))
  }, [entries, query])

  const selectedEntry = useMemo(
    () => entries.find((e) => e.pattern === selectedPattern) ?? null,
    [entries, selectedPattern],
  )

  function handleStudy(items: PatternCardRef[]) {
    if (!selectedPattern) return
    onStudyPattern(selectedPattern, flashcardsFromRefs(items))
  }

  return (
    <div className="pattern-browser">
      <div className="toolbar">
        <button type="button" className="toolbar-back" onClick={onBack}>
          ← 返回
        </button>
        <span className="badge">{entries.length} 个句式</span>
      </div>

      {entries.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-state-icon">📐</div>
          <p>还没有标注句式</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            在场景编辑中为闪卡添加句式标签，即可在此按句式复习
          </p>
        </div>
      ) : (
        <div className="pattern-layout">
          <div className="panel pattern-list-panel">
            <div className="panel-title">高频句式</div>
            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索句式…"
              />
            </div>
            <div className="pattern-list">
              {filtered.map((entry) => (
                <button
                  key={entry.pattern}
                  type="button"
                  className={`pattern-list-item${selectedPattern === entry.pattern ? ' active' : ''}`}
                  onClick={() => setSelectedPattern(entry.pattern)}
                >
                  <span className="pattern-list-label">{entry.pattern}</span>
                  <span className="pattern-list-count">{entry.items.length} 张</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="form-hint" style={{ padding: '0.5rem 0' }}>
                  没有匹配的句式
                </p>
              )}
            </div>
          </div>

          <div className="panel pattern-detail-panel">
            {!selectedEntry ? (
              <div className="pattern-detail-empty">
                <p>← 选择一个句式</p>
                <p className="form-hint">查看关联闪卡，并按句式集中复习</p>
              </div>
            ) : (
              <>
                <div className="pattern-detail-header">
                  <div>
                    <div className="panel-title" style={{ marginBottom: '0.25rem' }}>
                      {selectedEntry.pattern}
                    </div>
                    <p className="form-hint">
                      关联 {selectedEntry.items.length} 张闪卡
                      {new Set(selectedEntry.items.map((i) => i.scenarioId)).size > 1 &&
                        ` · 跨 ${new Set(selectedEntry.items.map((i) => i.scenarioId)).size} 个场景`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleStudy(selectedEntry.items)}
                  >
                    学习此句式
                  </button>
                </div>

                <div className="pattern-card-list">
                  {selectedEntry.items.map((item) => (
                    <div
                      key={`${item.scenarioId}-${item.card.id}`}
                      className="pattern-card-item"
                    >
                      <span className="pattern-card-scenario">{item.scenarioName}</span>
                      <div className="pattern-card-jp">{item.card.japanese}</div>
                      <div className="pattern-card-cn">{item.card.chinese}</div>
                      {item.card.notes.trim() && (
                        <div className="pattern-card-notes">{item.card.notes}</div>
                      )}
                      {item.card.patterns.length > 1 && (
                        <div className="pattern-card-tags">
                          {item.card.patterns
                            .filter((p) => p !== selectedEntry.pattern)
                            .map((p) => (
                              <span key={p} className="pattern-tag pattern-tag-sm">
                                {p}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
