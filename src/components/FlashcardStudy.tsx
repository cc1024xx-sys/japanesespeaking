import { useCallback, useEffect, useState } from 'react'
import type { Flashcard } from '../types'
import {
  loadAutoSpeakPreference,
  preloadVoices,
  saveAutoSpeakPreference,
  speakJapanese,
  stopSpeaking,
} from '../utils/tts'

interface FlashcardStudyProps {
  scenarioName: string
  cards: Flashcard[]
  onBack: () => void
}

export default function FlashcardStudy({ scenarioName, cards, onBack }: FlashcardStudyProps) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffled, setShuffled] = useState(cards)
  const [showList, setShowList] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(loadAutoSpeakPreference)

  const current = shuffled[index]

  useEffect(() => {
    preloadVoices()
    return () => stopSpeaking()
  }, [])

  useEffect(() => {
    if (flipped && autoSpeak) {
      speakJapanese(current.japanese)
    } else {
      stopSpeaking()
    }
  }, [flipped, autoSpeak, current.id, current.japanese])

  const goTo = useCallback((nextIndex: number) => {
    stopSpeaking()
    setFlipped(false)
    setIndex(nextIndex)
  }, [])

  const goNext = useCallback(() => {
    stopSpeaking()
    setFlipped(false)
    setIndex((i) => (i + 1) % shuffled.length)
  }, [shuffled.length])

  const goPrev = useCallback(() => {
    stopSpeaking()
    setFlipped(false)
    setIndex((i) => (i - 1 + shuffled.length) % shuffled.length)
  }, [shuffled.length])

  const toggleFlip = useCallback(() => {
    setFlipped((f) => !f)
  }, [])

  const handleReplay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      speakJapanese(current.japanese)
    },
    [current.japanese],
  )

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => {
      const next = !prev
      saveAutoSpeakPreference(next)
      if (!next) stopSpeaking()
      else if (flipped) speakJapanese(current.japanese)
      return next
    })
  }, [flipped, current.japanese])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        toggleFlip()
      } else if (e.key === 'ArrowRight') {
        goNext()
      } else if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === 'r' || e.key === 'R') {
        if (flipped) {
          e.preventDefault()
          speakJapanese(current.japanese)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFlip, goNext, goPrev, flipped, current.japanese])

  function handleShuffle() {
    stopSpeaking()
    setFlipped(false)
    setIndex(0)
    setShuffled([...cards].sort(() => Math.random() - 0.5))
  }

  function handleResetOrder() {
    stopSpeaking()
    setFlipped(false)
    setIndex(0)
    setShuffled(cards)
  }

  function handleBack() {
    stopSpeaking()
    onBack()
  }

  return (
    <div className="study-page">
      <div className="toolbar">
        <button type="button" className="toolbar-back" onClick={handleBack}>
          ← 返回
        </button>
        <div className="study-toolbar-actions">
          <span className="badge">{scenarioName}</span>
          <button
            type="button"
            className={`btn btn-ghost${autoSpeak ? ' active' : ''}`}
            onClick={toggleAutoSpeak}
            title={autoSpeak ? '关闭自动朗读' : '开启自动朗读'}
          >
            🔊 朗读
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleShuffle}>
            随机
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleResetOrder}>
            顺序
          </button>
          <button
            type="button"
            className={`btn btn-ghost${showList ? ' active' : ''}`}
            onClick={() => setShowList((v) => !v)}
          >
            列表
          </button>
        </div>
      </div>

      <div className="study-container">
        <div className="study-progress">
          <span>
            {index + 1} / {shuffled.length}
          </span>
          <div className="study-progress-bar">
            <div
              className="study-progress-fill"
              style={{ width: `${((index + 1) / shuffled.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flashcard-scene">
          <div
            key={current.id}
            className={`flashcard${flipped ? ' flipped' : ''}`}
            onClick={toggleFlip}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                toggleFlip()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={flipped ? '点击返回中文面' : '点击翻转查看日语'}
          >
            {!flipped ? (
              <div className="flashcard-face flashcard-front flashcard-single">
                <span className="flashcard-label">中文</span>
                <p className="flashcard-text">{current.chinese}</p>
                <span className="flashcard-hint">点击翻转查看日语</span>
              </div>
            ) : (
              <div className="flashcard-face flashcard-back flashcard-single flashcard-revealed">
                <span className="flashcard-label">日本語</span>
                <p className="flashcard-text">{current.japanese}</p>
                <button
                  type="button"
                  className="flashcard-speak-btn"
                  onClick={handleReplay}
                  title="重新朗读"
                  aria-label="重新朗读日语"
                >
                  🔊 再听一遍
                </button>
                <span className="flashcard-hint">点击返回中文面 · R 键重播</span>
              </div>
            )}
          </div>
        </div>

        {current.notes.trim() && (
          <div className="flashcard-notes">
            <span className="flashcard-notes-label">备注</span>
            <p className="flashcard-notes-text">{current.notes}</p>
          </div>
        )}

        {current.patterns.length > 0 && (
          <div className="flashcard-patterns">
            {current.patterns.map((p) => (
              <span key={p} className="pattern-tag pattern-tag-sm">
                {p}
              </span>
            ))}
          </div>
        )}

        <div className="study-dots" role="tablist" aria-label="闪卡切换">
          {shuffled.map((card, i) => (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`第 ${i + 1} 张：${card.chinese}`}
              className={`study-dot${i === index ? ' active' : ''}${i < index ? ' done' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div className="study-nav">
          <button type="button" className="btn btn-secondary" onClick={goPrev}>
            ← 上一张
          </button>
          <button type="button" className="btn btn-primary" onClick={goNext}>
            下一张 →
          </button>
        </div>

        <p className="form-hint study-hint">
          翻转后自动朗读日语 · 点击「🔊 朗读」开关 · R 键重播
        </p>
      </div>

      {showList && (
        <div className="panel study-card-list">
          <div className="panel-title">场景闪卡 · 点击跳转</div>
          <div className="study-card-list-items">
            {shuffled.map((card, i) => (
              <button
                key={card.id}
                type="button"
                className={`study-card-list-item${i === index ? ' active' : ''}`}
                onClick={() => {
                  goTo(i)
                  setShowList(false)
                }}
              >
                <span className="study-card-list-num">{i + 1}</span>
                <span className="study-card-list-cn">{card.chinese}</span>
                <span className="study-card-list-jp">{card.japanese}</span>
                {card.notes.trim() && (
                  <span className="study-card-list-notes">{card.notes}</span>
                )}
                {card.patterns.length > 0 && (
                  <span className="study-card-list-patterns">
                    {card.patterns.map((p) => (
                      <span key={p} className="pattern-tag pattern-tag-sm">
                        {p}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
