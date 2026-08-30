type RouteMetadata = { title: string; description: string }

const metadata: Record<string, RouteMetadata> = {
  '/': { title: 'The Living Pitch', description: 'A B2B site that evolves in public. See what your agent sees.' },
  '/board': { title: 'The Board | The Living Pitch', description: 'The public leaderboard for useful contributions to The Living Pitch.' },
  '/rules': { title: 'Board rules | The Living Pitch', description: 'How usefulness earns rank on The Living Pitch.' },
  '/evolution': { title: 'The approval ledger | The Living Pitch', description: 'Watch The Living Pitch change through approved public mutations.' },
  '/roast': { title: 'Roast my site | The Living Pitch', description: 'Get a receipt-first roast of what your website actually says, shows, and loads.' },
  '/pricing': { title: 'Pricing | The Living Pitch', description: 'Fixed prices, written success gates, and a performance partnership for owner-led firms.' },
  '/assessment': { title: 'Leverage Assessment | The Living Pitch', description: 'Find three installable opportunities in your firm, or pay nothing.' },
  '/method': { title: 'The method | The Living Pitch', description: 'Rethink the firm, build the right system, operate it daily, and train your team.' },
  '/agents': { title: 'The workforce | The Living Pitch', description: 'Twelve specialist agents, one approval ledger, and your processes.' },
  '/cases': { title: 'Proof | The Living Pitch', description: 'Verified numbers from AI agent systems built and operated in real firms.' },
  '/cases/first-client': { title: 'Case 01 | The Living Pitch', description: 'One system, one client, three months, and 139 qualified meetings.' },
  '/book': { title: 'Book a call | The Living Pitch', description: 'Thirty minutes with your real week on the table.' },
  '/about': { title: 'The operator | The Living Pitch', description: 'Why The Living Pitch exists and why every output stays human-directed.' },
  '/agency': { title: 'The agency | The Living Pitch', description: 'A business performance agency for owner-led firms of 5 to 50.' },
  '/ai': { title: 'AI automation consultant | The Living Pitch', description: 'AI automation built around your firm, operated daily, and measured against a gate.' },
}

function setMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

export function setRouteMetadata(route: string): void {
  const page = metadata[route] ?? { title: 'The Living Pitch', description: 'The Living Pitch, a B2B site that evolves in public.' }
  document.title = page.title
  setMeta('name', 'description', page.description)
  setMeta('property', 'og:title', page.title)
  setMeta('property', 'og:description', page.description)
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:url', `${window.location.origin}${route}`)
  void fetch('/og/default.png', { method: 'HEAD' }).then((response) => {
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) setMeta('property', 'og:image', `${window.location.origin}/og/default.png`)
  }).catch(() => undefined)
}
