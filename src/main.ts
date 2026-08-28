import './style.css'
import { startAnalytics } from './analytics'
import { renderEvolution } from './evolution'
import { installWebMcpTools } from './webmcp'
import { renderBusinessPage, renderNotFound } from './pages'
import { renderPitch } from './pitch'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('The application root is missing.')

startAnalytics()
const path = window.location.pathname.replace(/\/$/, '') || '/'
const businessPaths = new Set(['/pricing', '/assessment', '/method', '/agents', '/cases', '/cases/first-client', '/book', '/about', '/agency', '/ai'])
if (path === '/evolution') {
  void renderEvolution(root)
} else if (path === '/') {
  renderPitch(root)
} else if (businessPaths.has(path)) {
  renderBusinessPage(root, path)
} else {
  renderNotFound(root)
}
void installWebMcpTools()
