import { capture } from './analytics.ts'

export type MutationType = 'copy' | 'objection' | 'burn' | 'bug' | 'idea'

export type MutationInput = {
  type: MutationType
  content: string
  rationale: string
  handle?: string
}

export type MutationResult = { issue_url: string }

const API_BASE = 'https://api.welcometotheaijungle.com'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMutationType(value: unknown): value is MutationType {
  return value === 'copy' || value === 'objection' || value === 'burn' || value === 'bug' || value === 'idea'
}

export async function proposeMutation(input: MutationInput): Promise<MutationResult> {
  const response = await fetch(`${API_BASE}/mutations/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30000),
  })
  const payload: unknown = await response.json()
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'The colony channel is unavailable.'
    throw new Error(message)
  }
  if (!isRecord(payload) || typeof payload.issue_url !== 'string' || !payload.issue_url.startsWith('https://github.com/B-AI-bot/living-pitch/issues/')) {
    throw new Error('The colony channel returned an invalid issue URL.')
  }
  return { issue_url: payload.issue_url }
}

function composerMarkup(): string {
  return `<section class="mutation-composer" role="dialog" aria-labelledby="mutation-title">
    <div class="mutation-composer-head"><p class="eyebrow">COLONY CHANNEL</p><button type="button" class="modal-close" data-action="close-mutation" aria-label="Close improvement form">×</button></div>
    <h2 id="mutation-title">Improve this.</h2>
    <p class="muted">A better line, a missing objection, a burn, a bug, or an idea. It enters the approval ledger as data. Nothing ships without a human yes.</p>
    <form data-mutation-form>
      <label>Type<select name="type"><option value="copy">Better copy</option><option value="objection">Missing objection</option><option value="burn">Burn</option><option value="bug">Bug</option><option value="idea">Idea</option></select></label>
      <label>Proposal<textarea name="content" maxlength="2000" required></textarea></label>
      <label>Why it helps<textarea name="rationale" maxlength="2000" required></textarea></label>
      <label>Handle (optional)<input name="handle" maxlength="160" autocomplete="nickname"></label>
      <p class="mutation-status" data-mutation-status></p>
      <div class="actions"><button class="button button-primary" type="submit">Send to the colony</button><button class="button button-quiet" type="button" data-action="close-mutation">Cancel</button></div>
    </form>
  </section>`
}

export function stageAgentMutation(result: MutationResult): void {
  const root = document.querySelector<HTMLElement>('#app')
  if (!root) return
  root.querySelector('.agent-stage')?.remove()
  root.insertAdjacentHTML('beforeend', `<section class="agent-stage"><p class="eyebrow">AGENT CHANNEL</p><h2>Your agent proposed an improvement.</h2><p>It is waiting in the human approval ledger.</p><a href="${escapeHtml(result.issue_url)}" target="_blank" rel="noreferrer">Open the community issue ↗</a></section>`)
}

export function wireMutationAffordance(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('[data-action="improve"]').forEach((button) => {
    if (button.dataset.wired === 'true') return
    button.dataset.wired = 'true'
    button.addEventListener('click', () => {
      if (!root.querySelector('.mutation-composer')) root.insertAdjacentHTML('beforeend', `<div class="modal-backdrop mutation-backdrop">${composerMarkup()}</div>`)
      const form = root.querySelector<HTMLFormElement>('[data-mutation-form]')
      const close = () => root.querySelector('.mutation-backdrop')?.remove()
      root.querySelectorAll<HTMLElement>('[data-action="close-mutation"]').forEach((item) => item.addEventListener('click', close, { once: true }))
      form?.addEventListener('submit', (event) => {
        event.preventDefault()
        if (form.dataset.busy === 'true') return
        const data = new FormData(form)
        const type = data.get('type')
        const content = data.get('content')
        const rationale = data.get('rationale')
        const handle = data.get('handle')
        if (!isMutationType(type) || typeof content !== 'string' || typeof rationale !== 'string' || !content.trim() || !rationale.trim()) return
        form.dataset.busy = 'true'
        const status = form.querySelector<HTMLElement>('[data-mutation-status]')
        if (status) status.textContent = 'Sending the proposal to the ledger...'
        capture('mutation_propose_start', { type })
        void proposeMutation({ type, content: content.trim(), rationale: rationale.trim(), handle: typeof handle === 'string' && handle.trim() ? handle.trim() : undefined })
          .then((result) => {
            capture('mutation_propose_done', { type, ok: true })
            if (status) status.innerHTML = `Logged. <a href="${escapeHtml(result.issue_url)}" target="_blank" rel="noreferrer">Review the issue ↗</a>`
            form.reset()
          })
          .catch((error: unknown) => {
            capture('mutation_propose_done', { type, ok: false })
            if (status) status.textContent = error instanceof Error ? error.message : 'Could not send the proposal.'
          })
          .finally(() => { form.dataset.busy = 'false' })
      }, { once: true })
    })
  })
}
