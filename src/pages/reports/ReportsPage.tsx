import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

const reports = [
  { title: '생성형 AI 업무 오류·배상책임', decision: 'HOLD', tone: 'hold', owner: '미지정', updated: '2026.07.18', evidence: 12 },
  { title: '가정용 ESS·충전설비 화재', decision: 'ADVANCE', tone: 'advance', owner: '재물상품팀', updated: '2026.07.17', evidence: 9 },
  { title: '생활로봇 오작동·대인 사고', decision: 'OBSERVE', tone: 'observe', owner: '장기상품팀', updated: '2026.07.16', evidence: 7 },
]

export function ReportsPage() {
  return (
    <div className="page reports-page">
      <PageHeader
        step="04"
        eyebrow="DECISION REPORTS"
        title="종합 리포트"
        description="위험 신호와 상품성 평가를 Advance·Hold·Drop 의사결정과 후속 과제로 압축합니다."
      />
      <div className="sample-notice"><span>SAMPLE</span>보고서 구조 검증을 위한 예시이며 실제 내부 의사결정이 아닙니다.</div>
      <section className="report-summary-grid">
        <article><span>검토 중 리포트</span><strong>8</strong><small>이번 분기</small></article>
        <article><span>ADVANCE</span><strong>2</strong><small>상품 콘셉트 단계</small></article>
        <article><span>HOLD</span><strong>4</strong><small>추가 근거 필요</small></article>
        <article><span>OBSERVE / DROP</span><strong>2</strong><small>관찰 또는 종료</small></article>
      </section>
      <section className="report-list surface-card">
        <div className="panel-heading"><div><p className="eyebrow">REPORT LIBRARY</p><h2>최근 의사결정 문서</h2></div><button type="button" className="primary-small" disabled title="리포트 저장 API 연동 후 사용할 수 있습니다.">+ 새 리포트 · 미연동</button></div>
        {reports.map((report) => (
          <article className="report-row" key={report.title}>
            <span className={`decision-mark ${report.tone}`}>{report.decision.slice(0, 1)}</span>
            <div><strong>{report.title}</strong><small>{report.owner} · 근거 {report.evidence}건</small></div>
            <em data-tone={report.tone}>{report.decision}</em>
            <span>{report.updated}</span>
            <button type="button" aria-label={`${report.title} 리포트 열기 · 미연동`} title="리포트 상세 화면 연동 예정" disabled><AppIcon name="arrow" size={17} /></button>
          </article>
        ))}
      </section>
      <section className="report-contract surface-card">
        <div><p className="eyebrow">REQUIRED OUTPUT</p><h2>리포트에 반드시 남길 것</h2></div>
        <ol>
          <li><span>01</span><strong>결정</strong><p>Advance / Hold / Drop와 결정일</p></li>
          <li><span>02</span><strong>판단 근거</strong><p>평가 문장별 evidenceId와 상충 근거</p></li>
          <li><span>03</span><strong>상품 가설</strong><p>가입 대상·보험사고·담보·면책의 초안</p></li>
          <li><span>04</span><strong>다음 검증</strong><p>필요 데이터·담당자·기한·승인 이력</p></li>
        </ol>
      </section>
    </div>
  )
}
