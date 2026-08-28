import { capture } from './analytics'

export function renderHome(root: HTMLElement): void {
  root.innerHTML = `
    <main class="shell home-page">
      <p class="eyebrow">The Living Pitch</p>
      <h1>Grow without hiring.</h1>
      <p class="lede">An organism is waking up.</p>
      <p class="body-copy">We are entering the OpenAI WebMCP Challenge with a B2B site that learns in public. It will pitch differently to each human and each visiting agent, with a human approval ledger between an idea and anything that ships.</p>
      <div class="actions">
        <a class="button button-primary" href="/evolution">Watch the organism evolve</a>
        <a class="button button-quiet" href="https://github.com/B-AI-bot/living-pitch" rel="noreferrer">Open the repo</a>
      </div>
      <p class="status-line"><span class="pulse" aria-hidden="true"></span> Metabolism v0 is being assembled in public.</p>
    </main>
  `
  capture('home_view')
}
