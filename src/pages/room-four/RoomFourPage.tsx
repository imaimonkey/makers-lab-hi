import { ProfileForm } from '../../features/room-four/ProfileForm'
import { PageIntro } from '../../shared/components/PageIntro'

export function RoomFourPage() {
  return (
    <div className="room-page">
      <PageIntro
        eyebrow="ROOM 04 / MEMBER 04"
        title="Form Archive"
        description="제어 입력과 실시간 미리보기를 연습하는 네 번째 작업 공간입니다. 유효성 검사와 서버 전송을 붙여 보세요."
        accent="#0b8f70"
      />
      <ProfileForm />
      <aside className="owner-note">
        <span>YOUR WORKSPACE</span>
        <code>src/pages/room-four</code>
        <code>src/features/room-four</code>
      </aside>
    </div>
  )
}
