// Build-time generator: renders every business page's copy as semantic HTML so
// the worker can serve real per-route content to agents and crawlers without JS.
// Output: src/static-routes.json, imported by src/worker.js.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const { businessPagePaths, staticPageHtml } = await import(join(here, '../src/pages.ts'))

const routes = {}
for (const path of businessPagePaths) {
  const html = staticPageHtml(path)
  if (html) routes[path] = html
}

// The organs are dynamic; a one-paragraph static summary still beats the home
// body they used to serve.
routes['/evolution'] = '<main><h1>The approval ledger</h1><p>This is the organism’s public memory. Every mutation has a proposal, a human decision, and a receipt. Nothing ships without a human yes. The live ledger is rendered from /mutations.json.</p></main>'
routes['/board'] = '<main><h1>The Board</h1><p>The public leaderboard for useful contributions to The Living Pitch. Merged community PRs, accepted burns, accepted mutations and shared visits earn Leverage Points. Rules at /rules.</p></main>'
routes['/rules'] = '<main><h1>Useful work earns rank.</h1><p>You cannot pay to rank here. You can only be useful. 50 LP for a merged community PR, 15 LP for an accepted burn, 10 LP for an accepted mutation or feedback, 1 LP per visitor brought by a share. Categories: dev, copy, seo, design, business, qa. Oldest acceptance wins ties.</p></main>'
routes['/roast'] = '<main><h1>Drop your URL. Get the receipt.</h1><p>A roast of what your website actually says, shows, and loads. Every burn comes with the exact observation behind it. No screenshot. No invented claims. Just the page and its receipts.</p></main>'
routes['/expedition'] = '<main><h1>The Expedition</h1><p>Play the pitch. A guided, adaptive walk through how AI Jungle installs and operates agent systems for owner-led firms, tuned to your industry and reading style. Your agent can play it with you through the WebMCP tools exposed on the home page.</p></main>'

writeFileSync(join(here, '../src/static-routes.json'), JSON.stringify(routes, null, 1))
console.log(`static routes written: ${Object.keys(routes).length}`)
