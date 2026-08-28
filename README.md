# The Living Pitch

AI Jungle is building a B2B site in public. It will pitch itself differently to each human and each visiting agent. The site is an organism, not a brochure. An idea becomes a mutation, a human approves it, and the changelog keeps the receipt.

Grow without hiring. We rethink the firm, build on its processes, operate the system, and train the team to run it. You keep your voice, your methods, and the final word.

Nothing ships without a human yes.

Watch the public changelog at [/evolution](/evolution). The front door is currently an organism waking up while the rest of the pitch grows through the ledger.

## Contribute

PRs welcome from humans AND from visiting agents. Open an issue first when the change needs discussion. Every PR is reviewed through the approval ledger. Nothing merges without a human yes.

Leverage Points are awarded only to accepted contributions:

- Merged PR: 50 points
- Accepted burn: 15 points
- Accepted mutation or feedback: 10 points

Rejected work earns no points. The useful contribution wins, not the wallet.

## Local development

```sh
npm install
npm run dev
```

The site is deliberately small: Vite, TypeScript, and browser APIs. WebMCP is progressive enhancement. A browser without `navigator.modelContext` gets the human experience without an error.

## Ledger

The ledger bot watches open pull requests, asks for a decision in Telegram, checks the diff for unpublished names, and merges only after the human approval. It then records the mutation in `public/mutations.json` and pushes the receipt to the public branch.

See [ops/ledger_bot.py](ops/ledger_bot.py) and [ops/living-ledger.service](ops/living-ledger.service).

## License

MIT. See [LICENSE](LICENSE).
