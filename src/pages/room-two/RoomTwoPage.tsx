import { ProjectFilter } from '../../features/room-two/ProjectFilter'
import { PageIntro } from '../../shared/components/PageIntro'

export function RoomTwoPage() {
  return (
    <div className="room-page">
      <PageIntro
        eyebrow="ROOM 02 / MEMBER 02"
        title="Filter Studio"
        description="배열 데이터와 조건부 렌더링을 연습하는 두 번째 작업 공간입니다. 카드 데이터와 필터 조건을 추가해 보세요."
        accent="#2864dc"
      />
      <ProjectFilter />
      <aside className="owner-note">
        <span>YOUR WORKSPACE</span>
        <code>src/pages/room-two</code>
        <code>src/features/room-two</code>
      </aside>
    </div>
  )
}
