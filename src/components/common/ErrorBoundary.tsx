import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportBoundaryError } from '@/lib/error-reporting'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Precisa ser class component — React não tem equivalente via hooks pra
// getDerivedStateFromError/componentDidCatch (nem na v19).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportBoundaryError(error, info.componentStack ?? '')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-navy-dark font-serif text-xl font-semibold">Algo deu errado</p>
          <p className="text-text-meta text-sm">
            Recarregue a página ou volte para o início.
          </p>
          <a href="/" className="text-brand-red text-sm underline">
            Voltar ao início
          </a>
        </div>
      )
    }

    return this.props.children
  }
}
