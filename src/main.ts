import './style.css'
import { startAnalytics } from './analytics'
import { renderEvolution } from './evolution'
import { renderHome } from './home'
import { installWebMcpTools } from './webmcp'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('The application root is missing.')

startAnalytics()
if (window.location.pathname === '/evolution' || window.location.pathname === '/evolution/') {
  void renderEvolution(root)
} else {
  renderHome(root)
}
void installWebMcpTools()
