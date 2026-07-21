import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Keep new screen transitions at the start of the document while preserving
 * the browser's native scroll position when the user navigates back or forward.
 */
export function RouteScrollManager() {
  const { pathname, search, hash } = useLocation()
  const navigationType = useNavigationType()

  useLayoutEffect(() => {
    if (navigationType === 'POP' || hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [hash, navigationType, pathname, search])

  return null
}
