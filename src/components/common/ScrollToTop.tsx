import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Reseta o scroll pro topo a cada troca de rota (React Router não faz isso sozinho). */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
