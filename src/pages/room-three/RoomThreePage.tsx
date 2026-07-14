import { TaskPractice } from '../../features/room-three/TaskPractice'
import { PageIntro } from '../../shared/components/PageIntro'

export function RoomThreePage() {
  return (
    <div className="room-page">
      <PageIntro
        eyebrow="ROOM 03 / MEMBER 03"
        title="Task Workshop"
        description="입력, 목록 추가, 완료 처리, 삭제 흐름을 연습하는 세 번째 작업 공간입니다. 저장 기능까지 연결해 보세요."
        accent="#7b4dff"
      />
      <TaskPractice />
      <aside className="owner-note">
        <span>YOUR WORKSPACE</span>
        <code>src/pages/room-three</code>
        <code>src/features/room-three</code>
      </aside>
    </div>
  )
}
