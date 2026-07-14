import { FormEvent, useState } from 'react'

type Task = { id: number; label: string; done: boolean }

const initialTasks: Task[] = [
  { id: 1, label: '페이지 구조 살펴보기', done: true },
  { id: 2, label: '나만의 컴포넌트 만들기', done: false },
]

export function TaskPractice() {
  const [tasks, setTasks] = useState(initialTasks)
  const [value, setValue] = useState('')

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const label = value.trim()
    if (!label) return
    setTasks((current) => [...current, { id: Date.now(), label, done: false }])
    setValue('')
  }

  const toggleTask = (id: number) => {
    setTasks((current) => current.map((task) => (
      task.id === id ? { ...task, done: !task.done } : task
    )))
  }

  const removeTask = (id: number) => {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  return (
    <section className="practice-panel task-panel">
      <form className="task-form" onSubmit={addTask}>
        <label htmlFor="new-task">새 연습 항목</label>
        <div>
          <input
            id="new-task"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="할 일을 입력하세요"
          />
          <button className="button" type="submit">추가</button>
        </div>
      </form>
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={task.done ? 'done' : ''}>
            <button type="button" className="task-check" onClick={() => toggleTask(task.id)}>
              <span aria-hidden="true">{task.done ? '✓' : ''}</span>
              <span>{task.label}</span>
            </button>
            <button type="button" className="delete-button" onClick={() => removeTask(task.id)} aria-label={`${task.label} 삭제`}>×</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
