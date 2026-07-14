import type { Scenario } from '../types'

interface ScenarioListProps {
  scenarios: Scenario[]
  onCreate: () => void
  onPatterns: () => void
  onEdit: (id: string) => void
  onStudy: (id: string) => void
  onDelete: (id: string) => void
}

export default function ScenarioList({
  scenarios,
  onCreate,
  onPatterns,
  onEdit,
  onStudy,
  onDelete,
}: ScenarioListProps) {
  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="badge">{scenarios.length} 个场景</span>
        </div>
        <div className="toolbar-right">
          <button type="button" className="btn btn-secondary" onClick={onPatterns}>
            句式库
          </button>
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            + 新建场景
          </button>
        </div>
      </div>

      {scenarios.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-state-icon">🎴</div>
          <p>还没有口语场景</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            创建场景，粘贴日语对话与中文翻译，即可生成闪卡
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '1.25rem' }}
            onClick={onCreate}
          >
            开始创建
          </button>
        </div>
      ) : (
        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="scenario-card">
              <div className="scenario-info">
                <h3>{scenario.name}</h3>
                {scenario.description && <p>{scenario.description}</p>}
                <div className="scenario-meta">
                  {scenario.cards.length} 张闪卡 ·{' '}
                  {new Date(scenario.updatedAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div className="scenario-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onStudy(scenario.id)}
                  disabled={scenario.cards.length === 0}
                >
                  学习
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onEdit(scenario.id)}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-danger"
                  onClick={() => {
                    if (confirm(`确定删除「${scenario.name}」吗？`)) {
                      onDelete(scenario.id)
                    }
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
