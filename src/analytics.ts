type PostHog = {
  init: (key: string, options: Record<string, unknown>) => void
  capture: (event: string, properties?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    posthog?: PostHog
  }
}

const POSTHOG_KEY = 'phc_xKVyzqM1nsxcnkVwh6r9XmMSHYwGv78wOnHF5DBbqTT'
const POSTHOG_HOST = 'https://eu.i.posthog.com'
const POSTHOG_ASSET = 'https://eu-assets.i.posthog.com/static/array.js'

export function capture(event: string, properties: Record<string, unknown> = {}): void {
  window.posthog?.capture(event, {
    ...properties,
    pathname: window.location.pathname,
  })
}

export function startAnalytics(): void {
  const init = () => {
    window.posthog?.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      autocapture: true,
      persistence: 'memory',
      disable_session_recording: true,
    })
    capture('pageview')
  }

  const existing = document.querySelector<HTMLScriptElement>('script[data-posthog="true"]')
  if (existing) {
    init()
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = POSTHOG_ASSET
  script.dataset.posthog = 'true'
  script.addEventListener('load', init, { once: true })
  document.head.appendChild(script)
}
