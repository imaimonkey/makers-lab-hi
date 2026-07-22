import { useState } from 'react'
import { llmUtilityDefinitions, runLlmUtility } from '../../features/llm-util'
import type { LlmRunResult, LlmUtilityId } from '../../features/llm-util'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

const defaultUtilityId: LlmUtilityId = 'util-1'
const isMockMode = import.meta.env.VITE_LLM_USE_MOCK !== 'false'

export function DeveloperTestPage() {
  const [selectedUtilityId, setSelectedUtilityId] = useState<LlmUtilityId>(defaultUtilityId)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<LlmRunResult | null>(null)
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  const selectedUtility = llmUtilityDefinitions.find((utility) => utility.id === selectedUtilityId)
    ?? llmUtilityDefinitions[0]

  const handleUtilitySelect = (utilityId: LlmUtilityId) => {
    const utility = llmUtilityDefinitions.find((item) => item.id === utilityId)
    if (!utility) return

    setSelectedUtilityId(utilityId)
    setPrompt('')
    setResult(null)
    setError('')
  }

  const handleRun = async () => {
    setError('')
    setResult(null)
    setIsRunning(true)

    try {
      const response = await runLlmUtility({ utilityId: selectedUtility.id, prompt })
      setResult(response)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="page developer-test-page">
      <PageHeader
        step="AI"
        eyebrow="DEVELOPER MODE / LLM UTILITIES"
        title="개발자 테스트"
        description="기능별 LLM 유틸리티를 선택하고 프롬프트와 결과를 한 화면에서 확인하는 테스트 워크벤치입니다."
        status="AI TEST MODE"
        updatedAt="로컬 개발환경 · 2026.07"
      />

      <div className="sample-notice developer-test-notice">
        <span>{isMockMode ? 'MOCK' : 'GEMINI'}</span>
        {isMockMode
          ? '현재 Mock 응답 모드입니다. 화면과 호출 흐름을 먼저 검증할 수 있습니다.'
          : '서버 전용 Gemini 프록시를 통해 응답을 요청합니다. 결과는 반드시 실무자가 검토합니다.'}
      </div>

      <section className="developer-test-grid" aria-label="LLM 유틸리티 테스트 워크벤치">
        <aside className="developer-utility-panel surface-card">
          <div className="developer-card-heading">
            <div>
              <p className="eyebrow">UTILITY DIRECTORY</p>
              <h2>기능 선택</h2>
            </div>
            <span className="developer-count">{llmUtilityDefinitions.length}개</span>
          </div>
          <div className="developer-utility-tabs" role="tablist" aria-label="LLM 기능 선택">
            {llmUtilityDefinitions.map((utility) => {
              const isActive = utility.id === selectedUtilityId
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={isActive ? 'developer-utility-tab active' : 'developer-utility-tab'}
                  onClick={() => handleUtilitySelect(utility.id)}
                  key={utility.id}
                >
                  <span className="developer-utility-icon"><AppIcon name={utility.icon} size={17} /></span>
                  <span>
                    <strong>{utility.label}</strong>
                    <small>{utility.caption}</small>
                  </span>
                  <em>{utility.id.replace('util-', '0')}</em>
                </button>
              )
            })}
          </div>
          <p className="developer-path-note">
            <code>src/features/llm-util/{selectedUtility.id}</code>
            <span>기능별 작업 경계</span>
          </p>
        </aside>

        <section className="developer-prompt-card surface-card">
          <div className="developer-card-heading">
            <div>
              <p className="eyebrow">PROMPT INPUT</p>
              <h2>{selectedUtility.label}</h2>
            </div>
            <span className="developer-status-dot"><i /> READY</span>
          </div>
          <p className="developer-utility-description">{selectedUtility.description}</p>
          <label className="developer-prompt-label" htmlFor="developer-prompt">
            프롬프트
            <small>테스트 입력은 개인정보나 실제 고객 식별정보를 포함하지 마세요.</small>
          </label>
          <textarea
            id="developer-prompt"
            className="developer-prompt-input"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="LLM에 전달할 내용을 입력하세요."
            rows={12}
          />
          <div className="developer-prompt-footer">
            <span>{prompt.length.toLocaleString('ko-KR')}자</span>
            <button type="button" className="primary-action developer-run-button" onClick={handleRun} disabled={isRunning}>
              <AppIcon name="spark" size={16} />
              {isRunning ? '실행 중...' : '실행'}
            </button>
          </div>
        </section>

        <section className="developer-result-card surface-card" aria-live="polite">
          <div className="developer-card-heading">
            <div>
              <p className="eyebrow">RESULT BOX</p>
              <h2>AI 응답 결과</h2>
            </div>
            {result && (
              <span className={`developer-mode-chip ${result.mode}`}>
                {result.mode === 'gemini' ? 'GEMINI API' : 'MOCK'}
              </span>
            )}
          </div>

          <div className={error ? 'developer-result-box has-error' : 'developer-result-box'}>
            {isRunning && <p className="developer-result-placeholder">응답을 생성하고 있습니다...</p>}
            {!isRunning && error && (
              <div className="developer-result-error">
                <strong>호출 실패</strong>
                <p>{error}</p>
              </div>
            )}
            {!isRunning && !error && !result && (
              <div className="developer-result-placeholder">
                <span><AppIcon name="spark" size={20} /></span>
                <strong>실행 결과가 여기에 표시됩니다.</strong>
                <p>왼쪽 기능을 선택하고 프롬프트를 실행해 보세요.</p>
              </div>
            )}
            {!isRunning && !error && result && (
              <>
                <pre>{result.text}</pre>
                <span className="developer-result-meta">
                  {result.model ? `${result.model} · ` : ''}
                  {new Date(result.generatedAt).toLocaleString('ko-KR')}
                </span>
              </>
            )}
          </div>
        </section>
      </section>

      <p className="developer-disclaimer">
        개발자 테스트 결과는 화면 구조와 LLM 호출 흐름 확인을 위한 초안이며, 신규위험 후보 승격이나 상품 판단을 자동으로 수행하지 않습니다.
      </p>
    </div>
  )
}
