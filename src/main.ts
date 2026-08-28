import './style.css'
import { startAnalytics } from './analytics'
import { renderHome } from './home'
import { installWebMcpTools } from './webmcp'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('The application root is missing.')

startAnalytics()
renderHome(root)
void installWebMcpTools()
