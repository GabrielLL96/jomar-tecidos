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
      <GoogleTagManager />
      <UtilityBar />
      <Header />
      <Outlet />
      <Footer />
      <WhatsAppButton />
      <ConsentBanner />
    </div>
  )
}
