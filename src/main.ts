import './style.css'
import { startAnalytics } from './analytics'
import { renderEvolution } from './evolution'
import { installWebMcpTools } from './webmcp'
import { renderBusinessPage, renderNotFound } from './pages'
import { renderPitch } from './pitch'
import { renderLanding } from './landing'
import { renderRoast } from './roast'
import { wireMutationAffordance } from './colony'
import { renderBoard } from './board.ts'
import { renderRules } from './rules.ts'
import { recordShareVisit } from './share.ts'
import { setRouteMetadata } from './seo.ts'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('The application root is missing.')

startAnalytics()
const path = window.location.pathname.replace(/\/$/, '') || '/'
setRouteMetadata(path)
void recordShareVisit()
const businessPaths = new Set(['/pricing', '/assessment', '/method', '/agents', '/cases', '/cases/first-client', '/book', '/about', '/agency', '/ai'])
if (path === '/roast') {
  renderRoast(root)
} else if (path === '/evolution') {
  void renderEvolution(root)
} else if (path === '/board') {
  void renderBoard(root)
} else if (path === '/rules') {
  renderRules(root)
} else if (path === '/') {
  renderLanding(root)
} else if (path === '/expedition') {
  renderPitch(root, new URLSearchParams(window.location.search).get('roast_domain') ?? '')
} else if (businessPaths.has(path)) {
  renderBusinessPage(root, path)
} else {
  renderNotFound(root)
}
wireMutationAffordance(root)
void installWebMcpTools(path)
