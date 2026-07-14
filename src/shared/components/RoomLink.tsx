import { Link } from 'react-router-dom'
import type { Room } from '../config/rooms'

type RoomLinkProps = {
  room: Room
}

export function RoomLink({ room }: RoomLinkProps) {
  return (
    <Link
      to={room.path}
      className="room-card"
      style={{ '--room-color': room.color } as React.CSSProperties}
    >
      <div className="room-card-top">
        <span className="room-number">{room.number}</span>
        <span className="arrow" aria-hidden="true">↗</span>
      </div>
      <div>
        <p>{room.owner}</p>
        <h2>{room.title}</h2>
        <span className="room-subtitle">{room.subtitle}</span>
      </div>
      <ul className="tag-list" aria-label="연습 주제">
        {room.skills.map((skill) => <li key={skill}>{skill}</li>)}
      </ul>
    </Link>
  )
}
