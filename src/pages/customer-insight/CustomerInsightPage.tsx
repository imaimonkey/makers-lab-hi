import { CustomerInsightStudio } from '../../features/customer-insight/CustomerInsightStudio'
import { AppIcon } from '../../shared/components/AppIcon'

export function CustomerInsightPage() {
  return (
    <div className="customer-web-page">
      <section className="customer-web-hero">
        <div className="customer-hero-copy">
          <p className="customer-hero-kicker"><span /> 마음이 놓이는 보험 탐색</p>
          <h1>보험 이름 대신,<br /><em>지금 내 상황</em>으로 찾아보세요.</h1>
          <p>
            생활 속 걱정을 자연스럽게 적어주시면 관련 현대해상 상품 후보와
            계약 전에 확인할 내용을 한 번에 정리해 드려요.
          </p>
          <div className="customer-hero-actions">
            <a href="#situation-search" className="customer-hero-primary">
              내 상황으로 찾아보기 <AppIcon name="arrow" size={18} />
            </a>
            <button
              type="button"
              onClick={() => {
                document.querySelector<HTMLButtonElement>('.text-button')?.click()
                document.getElementById('situation-search')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              데모 예시 준비하기
            </button>
          </div>
          <ul className="customer-trust-list">
            <li><AppIcon name="check" size={16} /> 로그인 없이 체험</li>
            <li><AppIcon name="check" size={16} /> 개인정보 입력 없이 탐색</li>
            <li><AppIcon name="check" size={16} /> 공식 상품 페이지로 연결</li>
          </ul>
        </div>

        <div className="customer-hero-scene" aria-label="상황 검색에서 보험 후보 확인까지의 흐름">
          <div className="customer-search-mock">
            <span><AppIcon name="spark" size={18} /></span>
            <p>스마트홈 기기가 고장 나서<br />이웃집까지 피해가 생기면?</p>
            <i>찾기</i>
          </div>
          <div className="customer-result-mock">
            <p>내 상황과 가까운 확인 순서</p>
            <div><span>1</span><strong>관련 상품 후보</strong><em>3개</em></div>
            <div><span>2</span><strong>약관 확인 항목</strong><em>정리</em></div>
            <div className="new-risk"><span>3</span><strong>새로운 생활 위험</strong><em>발견</em></div>
          </div>
          <span className="floating-note"><AppIcon name="shield" size={17} /> 내 상황 중심으로 쉽게</span>
        </div>
      </section>

      <section className="customer-web-content" id="situation-search">
        <div className="customer-section-intro">
          <p>MY SITUATION SEARCH</p>
          <h2>어떤 점이 걱정되시나요?</h2>
          <span>보험 용어를 몰라도 괜찮아요. 사용하는 기술·제품과 걱정되는 피해를 함께 적어주세요.</span>
        </div>
        <CustomerInsightStudio />
      </section>

      <section className="customer-service-guide" id="service-guide">
        <div>
          <p>이용 방법</p>
          <h2>상황은 쉽게, 확인은 꼼꼼하게</h2>
        </div>
        <ol>
          <li><span>01</span><AppIcon name="user" size={23} /><strong>상황을 알려주세요</strong><p>생활 환경과 걱정되는 일을 자연스럽게 적습니다.</p></li>
          <li><span>02</span><AppIcon name="list" size={23} /><strong>후보를 비교해요</strong><p>관련 상품과 약관에서 볼 내용을 함께 확인합니다.</p></li>
          <li><span>03</span><AppIcon name="spark" size={23} /><strong>빈틈을 발견해요</strong><p>기존 설명이 어려운 위험은 동의 후 연구 의견이 됩니다.</p></li>
        </ol>
      </section>
    </div>
  )
}
