import { useMemo, useState } from 'react'
import type { Flashcard, Scenario } from '../types'
import { parseDialogueInput } from '../utils/parser'
import { mergePatterns, parsePatternInput, suggestScenarioPatterns } from '../utils/patterns'

interface ScenarioEditorProps {
  scenario: Scenario
  onSave: (scenario: Scenario) => void
  onBack: () => void
}

export default function ScenarioEditor({ scenario, onSave, onBack }: ScenarioEditorProps) {
  const [name, setName] = useState(scenario.name)
  const [description, setDescription] = useState(scenario.description)
  const [inputText, setInputText] = useState('')
  const [cards, setCards] = useState<Flashcard[]>(scenario.cards)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const [patternDraft, setPatternDraft] = useState('')

  const previewCards = useMemo(() => parseDialogueInput(inputText), [inputText])

  const patternSuggestions = useMemo(() => {
    if (!expandedCardId || !patternDraft.trim()) return []
    const card = cards.find((c) => c.id === expandedCardId)
    if (!card) return []
    return suggestScenarioPatterns(cards, patternDraft, { exclude: card.patterns, limit: 6 })
  }, [cards, expandedCardId, patternDraft])

  function handleGenerate() {
    if (previewCards.length === 0) return
    setCards((prev) => [...prev, ...previewCards])
    setInputText('')
  }

  function handleReplace() {
    if (previewCards.length === 0) return
    setCards(previewCards)
    setInputText('')
  }

  function handleRemoveCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id))
    if (expandedCardId === id) setExpandedCardId(null)
  }

  function handleUpdateNotes(id: string, notes: string) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)))
  }

  function handleAddPatternToCard(id: string, raw: string) {
    const incoming = parsePatternInput(raw)
    if (incoming.length === 0) return
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, patterns: mergePatterns(c.patterns, incoming) } : c,
      ),
    )
    setPatternDraft('')
  }

  function handleRemovePattern(id: string, pattern: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, patterns: c.patterns.filter((p) => p !== pattern) } : c,
      ),
    )
  }

  function toggleExpand(id: string) {
    setExpandedCardId((prev) => (prev === id ? null : id))
    setPatternDraft('')
  }

  function handleSave() {
    if (!name.trim()) {
      alert('请输入场景名称')
      return
    }
    onSave({
      ...scenario,
      name: name.trim(),
      description: description.trim(),
      cards,
      updatedAt: Date.now(),
    })
  }

  return (
    <div>
      <div className="toolbar">
        <button type="button" className="toolbar-back" onClick={onBack}>
          ← 返回
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          保存场景
        </button>
      </div>

      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <div className="panel-title">场景信息</div>
        <div className="form-group">
          <label htmlFor="name">场景名称</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：餐厅点餐、便利店购物"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="desc">描述（可选）</label>
          <input
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简要说明这个场景的用途"
          />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">导入对话</div>
        <div className="form-group">
          <label htmlFor="dialogue">日语对话 + 中文翻译</label>
          <textarea
            id="dialogue"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`支持以下格式，可直接粘贴：

いらっしゃいませ。	欢迎光临。
# 适用：进店时店员招呼
メニューをください。	请给我菜单。
@ 〜をください

或交替行：
いらっしゃいませ。
欢迎光临。
句型：いらっしゃいませ`}
          />
          <p className="form-hint">
            每行一句，可用 <code>Tab</code>、<code>|</code>、<code>：</code>{' '}
            分隔日语与中文。备注以 <code>#</code> 开头；句式以 <code>@</code> 或{' '}
            <code>句型：</code> 开头，附在上一条对话后。
          </p>
        </div>

        {inputText.trim() && (
          <div className="parse-count">
            识别到 <strong>{previewCards.length}</strong> 条对话
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={previewCards.length === 0}
          >
            追加到闪卡
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReplace}
            disabled={previewCards.length === 0}
          >
            替换全部闪卡
          </button>
        </div>

        {previewCards.length > 0 && inputText.trim() && (
          <div className="preview-list">
            <h4>预览（{previewCards.length} 条）</h4>
            {previewCards.slice(0, 6).map((card, i) => (
              <div key={i} className="preview-item">
                <div>
                  <div className="jp">{card.japanese}</div>
                  {card.patterns.length > 0 && (
                    <div className="preview-pattern-tags">
                      {card.patterns.map((p) => (
                        <span key={p} className="pattern-tag pattern-tag-sm">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  {card.notes && <div className="preview-notes">{card.notes}</div>}
                </div>
                <div className="cn">{card.chinese}</div>
              </div>
            ))}
            {previewCards.length > 6 && (
              <p className="form-hint">…还有 {previewCards.length - 6} 条</p>
            )}
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <div className="panel" style={{ marginTop: '1.25rem' }}>
          <div className="panel-title">
            当前闪卡 <span className="badge">{cards.length}</span>
          </div>
          <div className="card-list-editor">
            {cards.map((card, i) => (
              <div key={card.id} className="card-list-block">
                <div className="card-list-item">
                  <span className="card-list-num">{i + 1}</span>
                  <div className="card-list-content">
                    <div className="jp">{card.japanese}</div>
                    <div className="cn">{card.chinese}</div>
                    {card.patterns.length > 0 && expandedCardId !== card.id && (
                      <div className="card-list-pattern-tags">
                        {card.patterns.map((p) => (
                          <span key={p} className="pattern-tag pattern-tag-sm">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                    {card.notes && expandedCardId !== card.id && (
                      <div className="card-list-notes-preview">{card.notes}</div>
                    )}
                  </div>
                  <div className="card-list-actions">
                    <button
                      type="button"
                      className={`card-list-note-btn${expandedCardId === card.id ? ' active' : ''}${card.notes || card.patterns.length > 0 ? ' has-notes' : ''}`}
                      onClick={() => toggleExpand(card.id)}
                      title="编辑备注与句式"
                    >
                      标注
                    </button>
                    <button
                      type="button"
                      className="card-list-delete"
                      onClick={() => handleRemoveCard(card.id)}
                      title="删除"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {expandedCardId === card.id && (
                  <div className="card-notes-editor">
                    <label>高频句式</label>
                    <div className="pattern-input-row">
                      <input
                        className="pattern-input"
                        value={patternDraft}
                        onChange={(e) => setPatternDraft(e.target.value)}
                        placeholder="输入句式，按 Enter 添加"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddPatternToCard(card.id, patternDraft)
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleAddPatternToCard(card.id, patternDraft)}
                      >
                        添加
                      </button>
                    </div>
                    {expandedCardId === card.id && patternSuggestions.length > 0 && (
                      <div className="pattern-suggestions">
                        <span className="form-hint">匹配：</span>
                        {patternSuggestions.map((p) => (
                          <button
                            key={p}
                            type="button"
                            className="pattern-suggestion"
                            onClick={() => handleAddPatternToCard(card.id, p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                    {card.patterns.length > 0 && (
                      <div className="pattern-tag-list">
                        {card.patterns.map((p) => (
                          <span key={p} className="pattern-tag">
                            {p}
                            <button
                              type="button"
                              className="pattern-tag-remove"
                              onClick={() => handleRemovePattern(card.id, p)}
                              aria-label={`移除 ${p}`}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <label htmlFor={`notes-${card.id}`} style={{ marginTop: '1rem' }}>
                      备注
                    </label>
                    <textarea
                      id={`notes-${card.id}`}
                      className="card-notes-input"
                      value={card.notes}
                      onChange={(e) => handleUpdateNotes(card.id, e.target.value)}
                      placeholder="适用场景、使用注意等"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
