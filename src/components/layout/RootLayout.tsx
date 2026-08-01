import { Outlet } from 'react-router-dom'
import { UtilityBar } from './UtilityBar'
import { Header } from './Header'
import { Footer } from './Footer'
import { WhatsAppButton } from './WhatsAppButton'

export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden">
      <UtilityBar />
      <Header />
      <Outlet />
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
