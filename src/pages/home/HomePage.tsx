import { RoomLink } from '../../shared/components/RoomLink'
import { rooms } from '../../shared/config/rooms'

export function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">TEAM PRACTICE SPACE / 001</p>
          <h1>
            네 개의 방,<br />
            <em>하나의 실험실.</em>
          </h1>
          <p>
            각자 맡은 페이지에서 자유롭게 실험하세요. 페이지와 기능 폴더는 분리되어 있고,
            공통 레이아웃만 함께 사용합니다.
          </p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-ring" />
          <span className="orbit-center">4</span>
          <span className="orbit-label">MAKERS</span>
        </div>
      </section>

      <section className="rooms-section" aria-labelledby="rooms-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CHOOSE YOUR ROOM</p>
            <h2 id="rooms-title">작업 공간</h2>
          </div>
          <p>담당 카드를 선택하면 각자의 독립된 연습 페이지로 이동합니다.</p>
        </div>
        <div className="room-grid">
          {rooms.map((room) => <RoomLink key={room.id} room={room} />)}
        </div>
      </section>

      <section className="workflow-strip" aria-label="작업 흐름">
        <span>01 / PAGE</span>
        <i>→</i>
        <span>02 / FEATURE</span>
        <i>→</i>
        <span>03 / REVIEW</span>
        <i>→</i>
        <span>04 / MERGE</span>
      </section>
    </div>
  )
}
