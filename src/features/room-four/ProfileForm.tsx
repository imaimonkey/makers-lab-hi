import { FormEvent, useState } from 'react'

export function ProfileForm() {
  const [name, setName] = useState('새로운 메이커')
  const [role, setRole] = useState('Frontend Explorer')
  const [saved, setSaved] = useState(false)

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <section className="practice-panel profile-panel">
      <form onSubmit={saveProfile}>
        <label htmlFor="profile-name">이름</label>
        <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required />
        <label htmlFor="profile-role">역할</label>
        <input id="profile-role" value={role} onChange={(event) => setRole(event.target.value)} required />
        <button type="submit" className="button">프로필 저장</button>
        <span className="save-message" role="status">{saved ? '저장되었습니다.' : ''}</span>
      </form>
      <article className="profile-preview">
        <span className="panel-label">LIVE PREVIEW</span>
        <div className="avatar" aria-hidden="true">{name.trim().charAt(0) || '?'}</div>
        <h2>{name || '이름을 입력하세요'}</h2>
        <p>{role || '역할을 입력하세요'}</p>
      </article>
    </section>
  )
}
