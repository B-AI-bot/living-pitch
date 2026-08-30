// The one site header. Every page renders this, no page rolls its own.
// Nav labels come from the copy master, section 11: Agency, Method, Agents,
// Cases, Assessment, Pricing, plus the call CTA.

const LINKS: Array<[string, string]> = [
  ['/agency', 'Agency'],
  ['/method', 'Method'],
  ['/agents', 'Agents'],
  ['/cases', 'Cases'],
  ['/assessment', 'Assessment'],
  ['/pricing', 'Pricing'],
]

export function siteNav(variant: 'light' | 'dark' = 'light'): string {
  const links = LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')
  return `<header class="aij-header aij-header-${variant}">
    <a class="aij-logo" href="/"><img src="/brand/aij-logo-icon.png" alt="" width="30" height="30"><span>AI <em>Jungle</em></span></a>
    <nav class="aij-nav" aria-label="Main">${links}</nav>
    <a class="aij-nav-cta" href="https://cal.welcometotheaijungle.com/loic/intro">Book a call</a>
    <button class="aij-burger" aria-label="Open menu" aria-expanded="false">Menu</button>
    <div class="aij-drawer" hidden>${links}<a href="https://cal.welcometotheaijungle.com/loic/intro">Book a call</a></div>
  </header>`
}

export function bindNav(root: HTMLElement): void {
  const burger = root.querySelector<HTMLButtonElement>('.aij-burger')
  const drawer = root.querySelector<HTMLElement>('.aij-drawer')
  if (!burger || !drawer) return
  burger.addEventListener('click', () => {
    const open = drawer.hidden
    drawer.hidden = !open
    burger.setAttribute('aria-expanded', String(open))
  })
}
