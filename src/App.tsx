import { useCallback, useEffect, useState } from 'react'
import type { Flashcard, Scenario, View } from './types'
import { createScenario, loadScenarios, saveScenarios } from './storage'
import ScenarioList from './components/ScenarioList'
import ScenarioEditor from './components/ScenarioEditor'
import FlashcardStudy from './components/FlashcardStudy'
import PatternBrowser from './components/PatternBrowser'

export default function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [view, setView] = useState<View>('home')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [studyCards, setStudyCards] = useState<Flashcard[] | null>(null)
  const [studyTitle, setStudyTitle] = useState('')

  useEffect(() => {
    setScenarios(loadScenarios())
  }, [])

  const persist = useCallback((next: Scenario[]) => {
    setScenarios(next)
    saveScenarios(next)
  }, [])

  const activeScenario = scenarios.find((s) => s.id === activeId)

  function handleCreate() {
    const scenario = createScenario('新场景')
    persist([scenario, ...scenarios])
    setActiveId(scenario.id)
    setView('edit')
  }

  function handleSave(scenario: Scenario) {
    persist(scenarios.map((s) => (s.id === scenario.id ? scenario : s)))
    setView('home')
    setActiveId(null)
  }

  function handleDelete(id: string) {
    persist(scenarios.filter((s) => s.id !== id))
  }

  function startStudy(title: string, cards: Flashcard[]) {
    setStudyTitle(title)
    setStudyCards(cards)
    setView('study')
  }

  function exitStudy() {
    setStudyCards(null)
    setStudyTitle('')
    setActiveId(null)
    setView('home')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>日语口语闪卡</h1>
        <p>按场景整理高频对话，正面中文 · 反面日语</p>
      </header>

      {view === 'home' && (
        <ScenarioList
          scenarios={scenarios}
          onCreate={handleCreate}
          onPatterns={() => setView('patterns')}
          onEdit={(id) => {
            setActiveId(id)
            setView('edit')
          }}
          onStudy={(id) => {
            const scenario = scenarios.find((s) => s.id === id)
            if (!scenario) return
            setActiveId(id)
            startStudy(scenario.name, scenario.cards)
          }}
          onDelete={handleDelete}
        />
      )}

      {view === 'patterns' && (
        <PatternBrowser
          scenarios={scenarios}
          onBack={() => setView('home')}
          onStudyPattern={(pattern, cards) => {
            startStudy(`句式：${pattern}`, cards)
          }}
        />
      )}

      {view === 'edit' && activeScenario && (
        <ScenarioEditor
          scenario={activeScenario}
          onSave={handleSave}
          onBack={() => {
            setView('home')
            setActiveId(null)
          }}
        />
      )}

      {view === 'study' && studyCards && studyCards.length > 0 && (
        <FlashcardStudy
          scenarioName={studyTitle}
          cards={studyCards}
          onBack={exitStudy}
        />
      )}

      {view === 'study' && studyCards && studyCards.length === 0 && (
        <div className="panel empty-state">
          <p>没有可学习的闪卡</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={exitStudy}
          >
            返回
          </button>
        </div>
      )}
    </div>
  )
}
