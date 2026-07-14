import { CounterPractice } from '../../features/room-one/CounterPractice'
import { PageIntro } from '../../shared/components/PageIntro'

export function RoomOnePage() {
  return (
    <div className="room-page">
      <PageIntro
        eyebrow="ROOM 01 / MEMBER 01"
        title="State Lab"
        description="컴포넌트의 상태와 클릭 이벤트를 실험하는 첫 번째 작업 공간입니다. 아래 기능은 자유롭게 확장하거나 교체하세요."
        accent="#ff6b35"
      />
      <CounterPractice />
      <aside className="owner-note">
        <span>YOUR WORKSPACE</span>
        <code>src/pages/room-one</code>
        <code>src/features/room-one</code>
      </aside>
    </div>
  )
}
