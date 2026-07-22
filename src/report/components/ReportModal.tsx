import { useEffect, useRef, type PropsWithChildren } from 'react'

type ReportModalProps = PropsWithChildren<{
  title: string
  eyebrow?: string
  onClose: () => void
  variant?: 'dialog' | 'side-panel'
}>

export function ReportModal({
  title,
  eyebrow,
  onClose,
  variant = 'dialog',
  children,
}: ReportModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    dialog?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div
      className="report-page__modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`report-page__modal${variant === 'side-panel' ? ' report-page__modal--side-panel' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        tabIndex={-1}
      >
        <div className="report-page__modal-header">
          <div>
            {eyebrow ? <p className="report-page__eyebrow">{eyebrow}</p> : null}
            <h2 id="report-modal-title">{title}</h2>
          </div>
          <button
            className="report-page__icon-button"
            type="button"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            ×
          </button>
        </div>
        <div className="report-page__modal-body">{children}</div>
      </div>
    </div>
  )
}
