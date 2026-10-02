import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useConsent } from './ConsentContext'

const GTM_CONTAINER_ID = 'GTM-M4GCP7VG'
const GTM_SCRIPT_ID = 'gtm-script'
const GTM_NOSCRIPT_ID = 'gtm-noscript'

// Rotas onde o cliente digita número/CVV do cartão (CreditCardFields no
// checkout, RetryCardFields em OrderDetail). GTM injeta JS arbitrário
// configurado fora do repo — uma tag comprometida leria esses inputs.
const CARD_ENTRY_PATH_PREFIXES = ['/checkout', '/pedido/', '/conta/pedidos/']

function isCardEntryPath(pathname: string): boolean {
  return CARD_ENTRY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// Só injeta o script do GTM depois de consentimento explícito — nunca antes
// (LGPD, ver ConsentContext.tsx). Efeito legítimo de sincronizar sistema
// externo (injeta/remove elemento real do DOM), mesma categoria já
// documentada em skills/reactjs.md.
//
// Em SPA, script carregado não descarrega com navegação client-side — não
// montar o GTM na rota de cartão não basta. Se o GTM já rodou nesta página e
// o cliente entra numa rota de cartão, força reload completo: o documento
// novo nasce sem GTM, porque esta mesma checagem não injeta em rota de cartão.
export function GoogleTagManager() {
  const { hasAnalyticsConsent } = useConsent()
  const { pathname } = useLocation()
  const isCardEntryRoute = isCardEntryPath(pathname)

  useEffect(() => {
    const isGtmLoaded = Boolean(document.getElementById(GTM_SCRIPT_ID))
    if (isCardEntryRoute) {
      if (isGtmLoaded) window.location.reload()
      return
    }
    if (!hasAnalyticsConsent || isGtmLoaded) return

    const script = document.createElement('script')
    script.id = GTM_SCRIPT_ID
    script.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`
    document.head.appendChild(script)

    const noscript = document.createElement('noscript')
    noscript.id = GTM_NOSCRIPT_ID
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`
    iframe.height = '0'
    iframe.width = '0'
    iframe.style.display = 'none'
    iframe.style.visibility = 'hidden'
    noscript.appendChild(iframe)
    document.body.prepend(noscript)
  }, [hasAnalyticsConsent, isCardEntryRoute])

  return null
}
