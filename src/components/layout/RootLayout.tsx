import { Outlet } from 'react-router-dom'
import { UtilityBar } from './UtilityBar'
import { Header } from './Header'
import { Footer } from './Footer'
import { WhatsAppButton } from './WhatsAppButton'
import { ConsentBanner } from '@/features/consent/ConsentBanner'
import { GoogleTagManager } from '@/features/consent/GoogleTagManager'

export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-sm focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <GoogleTagManager />
      <UtilityBar />
      <Header />
      {/* display:contents na Outlet quebraria foco via tabIndex -- por isso
          o alvo do skip link é este span, não um wrapper em volta da Outlet. */}
      <span id="main-content" tabIndex={-1} />
      <Outlet />
      <Footer />
      <WhatsAppButton />
      <ConsentBanner />
    </div>
  )
}
