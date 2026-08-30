// GENERATED-THEN-CURATED from The Approval Ledger v2.dc.html (Claude Design, Loic).
// Faithful conversion: markup preserved, dc bindings replaced by data-lp hooks.
export const LANDING_STYLE = `
:root {
  --sc-canvas: #F3EADA; --sc-surface: #FCF8F0;
  --sc-ink: #3A2A1E; --sc-ink-soft: #6A5443;
  --sc-accent: #456B49; --sc-accent-ink: #F1E7D6;
  --sc-font-display: 'Fraunces', serif;
  --sc-font-text: 'Instrument Sans', system-ui, sans-serif;
}
body{margin:0;background:#F3EADA;color:#3A2A1E;font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:#456B49}a:hover{color:#5C8460}
::selection{background:rgba(69,107,73,.28)}
:focus-visible{outline:2px solid #5C8460;outline-offset:2px}
@keyframes aijStamp{0%{transform:scale(1.15)}100%{transform:scale(1)}}
.lp-enter{opacity:0;animation:lpEnter .6s cubic-bezier(0.22,1,0.36,1) forwards}
.lp-enter:nth-of-type(2){animation-delay:.12s}.lp-enter:nth-of-type(3){animation-delay:.24s}
@keyframes lpEnter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.lp-enter{animation:none;opacity:1}}
@keyframes aijCaret{0%,49%{opacity:1}50%,100%{opacity:0}}
@media (prefers-reduced-motion: reduce){.aij-anim *{animation:none !important;transition:none !important}}
@media (max-width:820px){
.v2-hero{grid-template-columns:1fr !important;gap:30px !important;padding:96px 20px 60px 20px !important;height:auto !important;min-height:100vh}
.v2-phone{max-width:300px !important;margin:0 auto !important}
.v2-cols2{display:block !important}
.v2-cols2 > *{margin-bottom:20px}
.v2-close{grid-template-columns:1fr !important;gap:36px !important;padding:0 20px !important}
.v2-cell{width:80vw !important;min-width:80vw !important}
.v2-steps{display:block !important}
.v2-steps > *{margin-bottom:18px}
.aij-ledger-d{display:none !important}
.aij-ledger-m{display:block !important}
.v2-pad{padding-left:20px !important;padding-right:20px !important}
.aij-cols{display:block !important}
.aij-cols > div{margin-bottom:28px}
}
@media (max-height:720px){
.v2-h1{font-size:34px !important}
.v2-sub{margin-top:10px !important;font-size:14.5px !important;line-height:1.5 !important}
.v2-ctas{margin-top:14px !important}
.v2-proof{margin-top:10px !important;font-size:10px !important}
.v2-week{margin-top:12px !important;padding:10px 16px !important}
.v2-wl{padding:4px 0 !important}
}
`
export const LANDING_HTML = `<nav id="ledgerD" class="aij-ledger-d" aria-label="Approval ledger" style="position:fixed;right:20px;bottom:20px;z-index:40;width:250px;background:rgba(11,9,6,0.85);border:1px solid rgba(241,231,214,0.16);border-radius:10px;backdrop-filter:blur(8px);opacity:0;pointer-events:none">
    <button style="display:flex;width:100%;align-items:baseline;gap:8px;background:none;border:none;padding:9px 12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#F1E7D6;text-align:left;cursor:pointer">
      <span style="letter-spacing:0.2em;color:#9A876F">LEDGER</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#C6B49C"><span data-lp="latest">no claims verified yet</span></span>
      <span style="color:#9A876F"><span data-lp="chevD">▴</span></span>
    </button>
    <div data-lp="dPanel" hidden>
      <div style="display:flex;flex-direction:column;padding:0 12px 10px 12px;border-top:1px solid rgba(241,231,214,0.12)">
        <span data-lp="rows"></span>
        <span data-lp="empty"><div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6E6455;padding:6px 0">no claims verified yet</div></span>
      </div>
    </div>
  </nav><div class="aij-ledger-m" style="display:none;position:fixed;left:0;right:0;bottom:0;z-index:50;background:rgba(11,9,6,0.95);border-top:1px solid rgba(241,231,214,0.14)">
    <button style="display:flex;width:100%;min-height:44px;align-items:center;gap:10px;background:none;border:none;padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#F1E7D6;text-align:left;cursor:pointer">
      <span style="letter-spacing:0.2em;color:#9A876F">LEDGER</span>
      <span style="flex:1;color:#C6B49C"><span data-lp="latest">no claims verified yet</span></span>
      <span style="color:#9A876F"><span data-lp="chevM">▴</span></span>
    </button>
    <div data-lp="mPanel" hidden>
      <div style="padding:0 16px 14px 16px;display:flex;flex-direction:column">
        <span data-lp="rows"></span>
      </div>
    </div>
  </div><main>

    <section id="act1" data-sc-act="pin" data-sc-span="2.3" data-acts="001" data-screen-label="Act 1 · The two weeks" style="background:radial-gradient(120% 130% at 22% 40%, #15100a 0%, #0c0907 60%, #080605 100%)">
      <div data-sc-stage>
        <video id="heroFilm" muted="muted" playsInline="playsInline" preload="auto" data-film-src="/video/intro-film.v2.mp4" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s"></video>
        <div id="heroFilmShade" aria-hidden="true" style="position:absolute;inset:0;background:linear-gradient(90deg, rgba(8,6,5,0.92) 0%, rgba(8,6,5,0.78) 46%, rgba(8,6,5,0.5) 100%);opacity:0"></div>
        <div class="v2-hero" style="display:grid;grid-template-columns:1.12fr 0.88fr;gap:52px;align-items:center;max-width:1180px;margin:0 auto;padding:0 32px;height:100%">
          <div>
            <div data-sc-cue="0 0.94 0">
              <div style="display:flex;align-items:center;gap:11px;margin-bottom:22px">
                <span style="display:flex;height:38px;width:38px;align-items:center;justify-content:center;overflow:hidden;border-radius:11px;background:#0c0a07;box-shadow:inset 0 0 0 1px rgba(124,168,104,0.3)"><img src="brand/aij-logo-icon.png" alt="" style="height:120%;width:120%;object-fit:cover"></span>
                <span style="font-family:'Fraunces',serif;font-size:20px;color:#F1E7D6">AI <em style="color:#7A9B6E">Jungle</em></span>
              </div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.24em;color:#9A876F;margin-bottom:14px">FOR FIRMS OF 5 TO 50 WHERE EVERYTHING STILL RUNS THROUGH YOU</div>
              <h1 class="v2-h1" style="margin:0;font-family:'Fraunces',serif;font-weight:400;font-size:clamp(38px,4.6vw,64px);line-height:1.04;letter-spacing:-0.02em;color:#F1E7D6">Grow <em style="color:#7A9B6E">without hiring.</em></h1>
              <p class="v2-sub" style="margin:18px 0 0 0;max-width:46ch;font-size:16.5px;line-height:1.6;color:#C6B49C">We rethink your strategy with AI. We build the system on your processes. We operate it every day. We train your team to run it. You keep your voice, your methods, and the final word: nothing ships without your yes.</p>
              <div class="v2-ctas" style="display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-top:26px">
                <a href="/assessment" data-lp="cta" style="display:inline-flex;align-items:center;height:50px;padding:0 28px;border-radius:999px;background:#456B49;color:#F1E7D6;font-family:'Instrument Sans',sans-serif;font-size:15px;font-weight:600;text-decoration:none;box-shadow:0 14px 30px -14px rgba(69,107,73,0.55)">Get your 3 installable opportunities</a>
              </div>
              <p data-proof="001" class="v2-proof" style="margin:16px 0 0 0;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.6;color:#9A876F;max-width:46ch">Every client from day one is still a client. And nothing, ever, ships without your yes.</p>
            </div>
            <div class="v2-week" style="margin-top:28px;background:#FCF8F0;border:1px solid rgba(74,53,38,0.14);border-radius:14px;padding:16px 20px;max-width:460px;box-shadow:0 18px 40px -24px rgba(0,0,0,0.6)">
              <div data-sc-cue="0 0.94 0" style="font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:0.24em;color:#9A8773;margin-bottom:6px">YOUR WEEK, AS IT RUNS</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.55;color:#4E3E2E">
                <div class="v2-wl lp-enter" style="padding:7px 0;border-bottom:1px dashed rgba(58,42,30,0.18)">The proposal, still open</div>
                <div class="v2-wl lp-enter" style="padding:7px 0;border-bottom:1px dashed rgba(58,42,30,0.18)">Three follow-ups that never went out</div>
                <div class="v2-wl lp-enter" style="padding:7px 0;border-bottom:1px dashed rgba(58,42,30,0.18)">The perfect candidate, never called back</div>
                <div data-sc-cue="0.30 0.94" class="v2-wl" style="padding:7px 0;border-bottom:1px dashed rgba(58,42,30,0.18)">The CRM, updated on Sunday night</div>
                <div data-sc-cue="0.38 0.97" class="v2-wl" style="padding:7px 0;color:#3A2A1E">Fifteen hours leak out of your week, and you know exactly where</div>
              </div>
            </div>
          </div>
          <div class="v2-phone" style="width:100%;max-width:340px;justify-self:center">
            <div data-sc-cue="0 0.96 0" style="font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:0.24em;color:#9A876F;margin-bottom:10px;text-align:center">YOUR WEEK, OPERATED</div>
            <div data-sc-tilt="5" style="border-radius:30px;border:1px solid rgba(124,168,104,0.2);background:#0c0a07;padding:12px;box-shadow:0 0 90px -25px rgba(124,168,104,0.45)">
              <div data-sc-cue="0 0.96 0" style="display:flex;align-items:center;gap:10px;padding:8px 10px 12px 10px">
                <span style="display:flex;height:38px;width:38px;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(135deg,#5C8460,#33522F);font-family:'Fraunces',serif;font-size:15px;color:#fff">B</span>
                <span>
                  <span style="display:block;font-size:14px;font-weight:600;color:#F1E7D6">Your approval ledger</span>
                  <span style="display:flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A9B6E"><i style="display:block;height:6px;width:6px;border-radius:999px;background:#7A9B6E"></i> holding until your yes</span>
                </span>
              </div>
              <div style="display:flex;flex-direction:column;gap:9px;border-radius:18px;background:#161109;padding:14px">
                <div class="lp-enter" style="align-self:flex-start;max-width:88%;border-radius:13px;border-bottom-left-radius:4px;background:#221a10;color:#F1E7D6;padding:8px 12px;font-size:12.5px;line-height:1.45"><small style="display:block;font-family:'JetBrains Mono',monospace;font-size:9px;opacity:0.6;margin-bottom:3px">06:40</small>A proposal draft, holding for your yes</div>
                <div class="lp-enter" style="align-self:flex-start;max-width:88%;border-radius:13px;border-bottom-left-radius:4px;background:#221a10;color:#F1E7D6;padding:8px 12px;font-size:12.5px;line-height:1.45"><small style="display:block;font-family:'JetBrains Mono',monospace;font-size:9px;opacity:0.6;margin-bottom:3px">07:15</small>Today's meeting briefs, ready. The CRM maintained itself overnight.</div>
                <div data-sc-cue="0.23 0.96" style="align-self:flex-start;max-width:88%;border-radius:13px;border-bottom-left-radius:4px;background:#221a10;color:#F1E7D6;padding:8px 12px;font-size:12.5px;line-height:1.45"><small style="display:block;font-family:'JetBrains Mono',monospace;font-size:9px;opacity:0.6;margin-bottom:3px">07:58</small>A polite reminder for the overdue invoice, holding for your yes</div>
                <div data-sc-cue="0.34 0.97" style="align-self:flex-end;max-width:88%;border-radius:13px;border-bottom-right-radius:4px;background:#456B49;color:#fff;padding:8px 12px;font-size:12.5px;line-height:1.45"><small style="display:block;font-family:'JetBrains Mono',monospace;font-size:9px;opacity:0.6;margin-bottom:3px">YOU · 08:04</small>You approved 14 items over coffee. Nothing shipped without your yes.</div>
                <span data-sc-cue="0.45 0.97" style="margin-top:2px;align-self:flex-start;border-radius:20px;border:1px solid rgba(124,168,104,0.4);padding:4px 10px;font-size:11px;color:#7A9B6E">Review · Approve · Done</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="act2" data-screen-label="Act 2 · The two failures" class="v2-pad" style="background:#F3EADA;padding:110px 32px 90px 32px">
      <div style="max-width:1180px;margin:0 auto">
        <h2 data-reveal="1" style="margin:0 0 44px 0;font-family:'Fraunces',serif;font-weight:400;font-size:clamp(30px,3.6vw,46px);line-height:1.08;letter-spacing:-0.02em;color:#3A2A1E;max-width:18ch">Both default answers fail owner-led firms.</h2>
        <div class="v2-cols2" style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div data-reveal="1" data-delay="100" style="border-radius:18px;border:1px solid rgba(74,53,38,0.12);background:#FFFDF8;padding:34px;box-shadow:0 14px 30px -18px rgba(60,42,28,0.25)">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.08em;color:#9A8773;margin-bottom:12px">DEFAULT 1 · STAND STILL</div>
            <h3 style="margin:0 0 12px 0;font-family:'Fraunces',serif;font-weight:500;font-size:24px;color:#3A2A1E">Do nothing, and the leak compounds.</h3>
            <p style="margin:0 0 14px 0;font-size:15.5px;line-height:1.65;color:#6A5443">Independent studies put "work about work" at 60 percent of the knowledge week. We only need to find your fifteen hours. Multiply them by your day rate: that is a salary you never hired, paid anyway.</p>
            <p style="margin:0;font-size:15.5px;line-height:1.65;color:#6A5443">And while the admin gets done, the network cools. Roughly a quarter of your contacts change roles every year. Each move is a mandate won, or a mandate you read about.</p>
          </div>
          <div data-reveal="1" data-delay="220" style="border-radius:18px;border:1px solid rgba(124,168,104,0.16);background:radial-gradient(130% 130% at 70% 20%, #15100a 0%, #0b0806 100%);padding:34px;box-shadow:0 20px 44px -20px rgba(20,14,8,0.7)">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.08em;color:#9A876F;margin-bottom:12px">DEFAULT 2 · AUTOPILOT</div>
            <h3 style="margin:0 0 12px 0;font-family:'Fraunces',serif;font-weight:500;font-size:24px;color:#F1E7D6">Automate blindly, and your name pays for it.</h3>
            <p style="margin:0 0 14px 0;font-size:15.5px;line-height:1.65;color:#C6B49C">The market's fix is autopilot. The AI circus sells you off-the-shelf AI employees: generic personas that write like no one and sign in your name. You're right not to trust them. The results are in: generic AI outreach now replies at under 1 percent, and half of buyers say they prefer brands that keep generative AI out of the conversation.</p>
            <p style="margin:0;font-size:15.5px;line-height:1.65;color:#C6B49C">In a firm where the product is your judgment, one robotic email costs more than it saves.</p>
          </div>
        </div>
        <p data-reveal="1" data-delay="320" style="margin:56px auto 0 auto;font-family:'Fraunces',serif;font-weight:400;font-size:clamp(23px,2.4vw,34px);line-height:1.3;color:#3A2A1E;text-align:center;max-width:30ch">Standing still costs the hours. Autopilot costs the name. You need a <em style="color:#456B49">third way.</em></p>
        <p data-reveal="1" data-delay="380" style="margin:52px 0 0 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#9A8773">Sources: Asana Anatomy of Work Index; UserGems and Champify job-change data; 2026 cold outreach benchmarks; Gartner 2026 consumer survey.</p>
      </div>
    </section>

    <section id="act3" data-sc-act="pin" data-sc-span="2.6" data-acts="002" data-screen-label="Act 3 · The rule" style="background:radial-gradient(120% 130% at 50% 45%, #15100a 0%, #0c0907 58%, #080605 100%)">
      <div data-sc-stage>
        <div data-sc-parallax="-0.9" aria-hidden="true" style="position:absolute;left:50%;top:50%;margin-left:-230px;margin-top:-230px;height:460px;width:460px;border-radius:999px;background:radial-gradient(circle, #0e0b07 52%, transparent 72%);box-shadow:0 0 120px -20px rgba(124,168,104,0.35);opacity:0.55;display:flex;align-items:center;justify-content:center"><img src="brand/aij-logo-icon.png" alt="" style="height:460px;width:460px;border-radius:999px;object-fit:cover;opacity:0.5"></div>
        <div style="position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:0 24px">
          <p data-sc-cue="0 0.36 0" style="margin:0 0 24px 0;font-size:17px;color:#C6B49C">The third way has one rule.</p>
          <div data-proof="002">
            <h2 style="margin:0;font-family:'Fraunces',serif;font-weight:400;font-size:clamp(46px,7.8vw,124px);line-height:1.04;letter-spacing:-0.025em;color:#F1E7D6;max-width:14ch">
              <span data-sc-cue="0.08 0.95" data-sc-kinetic="words" style="display:block">Nothing ships without</span>
              <em data-sc-cue="0.24 0.95" style="display:block;color:#7A9B6E">your yes.</em>
            </h2>
          </div>
          <p data-sc-cue="0.3 0.95" style="margin:34px 0 0 0;font-size:16.5px;line-height:1.7;color:#C6B49C;max-width:62ch">Agents watch your signals, draft your outreach, chase the invoices, prepare the briefs. Every message, quote and post holds in one approval ledger until you say go, in the messaging app you already use.</p>
          <p data-sc-cue="0.44 0.97" style="margin:16px 0 0 0;font-size:16.5px;line-height:1.7;color:#F1E7D6;max-width:62ch">It slows the machine down by ten minutes a day. It is the ten minutes that lets you sleep.</p>
        </div>
      </div>
    </section>

    <section id="act4" data-acts="003 004" data-screen-label="Act 4 · The receipts" class="v2-pad" style="background:#F3EADA;padding:110px 32px 90px 32px">
      <div style="max-width:1180px;margin:0 auto">
        <h2 data-reveal="1" style="margin:0 0 48px 0;font-family:'Fraunces',serif;font-weight:400;font-size:clamp(30px,3.6vw,46px);line-height:1.08;letter-spacing:-0.02em;color:#3A2A1E">Verified numbers, <em style="color:#456B49">not vibes.</em></h2>
        <p data-reveal="1" style="margin:-30px 0 40px 0;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.18em;color:#9A8773">CASE 01 · ONE SYSTEM. ONE CLIENT. THREE MONTHS.</p>
        <div class="v2-cols2" style="display:grid;grid-template-columns:1fr 1.1fr;gap:44px;align-items:start">
          <div id="countHost" style="border-radius:18px;border:1px solid rgba(74,53,38,0.12);background:#FFFDF8;padding:10px 30px;box-shadow:0 14px 30px -18px rgba(60,42,28,0.25)">
            <div data-proof="003" data-reveal="1" data-delay="80" style="display:flex;align-items:baseline;gap:18px;padding:16px 0;border-bottom:1px dashed rgba(74,53,38,0.15)"><span data-count="24" data-suffix="%" style="font-family:'JetBrains Mono',monospace;font-size:40px;color:#456B49;min-width:120px;text-align:right">0</span><span style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.06em;color:#9A8773">replied</span></div>
            <div data-reveal="1" data-delay="160" style="display:flex;align-items:baseline;gap:18px;padding:16px 0;border-bottom:1px dashed rgba(74,53,38,0.15)"><span data-count="139" style="font-family:'JetBrains Mono',monospace;font-size:40px;color:#3A2A1E;min-width:120px;text-align:right">0</span><span style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.06em;color:#9A8773">qualified meetings booked</span></div>
            <div data-proof="004" data-reveal="1" data-delay="240" style="display:flex;align-items:baseline;gap:18px;padding:16px 0;border-bottom:1px dashed rgba(74,53,38,0.15)"><span data-count="90" style="font-family:'JetBrains Mono',monospace;font-size:40px;color:#3A2A1E;min-width:120px;text-align:right">0</span><span style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.06em;color:#9A8773">meetings held</span></div>
            <div data-reveal="1" data-delay="320" style="display:flex;align-items:baseline;gap:18px;padding:16px 0"><span data-count="0" style="font-family:'JetBrains Mono',monospace;font-size:40px;color:#456B49;min-width:120px;text-align:right">0</span><span style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.06em;color:#9A8773">messages sent without approval</span></div>
            <p data-reveal="1" data-delay="400" style="margin:0;padding:0 0 18px 0;font-size:13.5px;color:#9A8773">First client, first three months. In production, not in a deck. For scale: cold outreach averages a 3.4 percent reply rate across billions of sends (Instantly 2026 benchmark).</p>
          </div>
          <div>
            <figure data-reveal="1" data-delay="150" style="margin:0;padding:28px;background:#FFFDF8;border:1px solid rgba(74,53,38,0.12);border-radius:18px;box-shadow:0 14px 30px -18px rgba(60,42,28,0.25)">
              <blockquote style="margin:0;font-family:'Fraunces',serif;font-size:19px;line-height:1.5;color:#3A2A1E">"In the last three months, the agent helped me to book more than 90 qualified meetings with executives I would never have had time to reach, and I approved every single message before it went out. It works while I am in meetings."</blockquote>
              <figcaption style="display:flex;align-items:center;gap:14px;margin-top:20px">
                <span style="display:flex;width:52px;height:52px;flex:none;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(135deg,#5C8460,#33522F);font-family:'Fraunces',serif;font-size:18px;color:#fff">FE</span>
                <span style="font-size:13.5px;line-height:1.5;color:#6A5443">Franck Euvrard, Partner, Asia-Connect Executive Partners<br><a href="https://www.trustpilot.com/review/welcometotheaijungle.com" style="font-size:12.5px">Verified review on Trustpilot →</a></span>
              </figcaption>
            </figure>
            <div data-reveal="1" data-delay="250" style="margin-top:20px;padding:22px 26px;border:1px solid rgba(74,53,38,0.14);border-radius:14px">
              <p style="margin:0;font-size:14.5px;line-height:1.7;color:#6A5443">We run on the workforce we sell. This site and the businesses around it are built, checked and operated by the same agents we install. When you buy from us, you are buying the system we trust our own revenue to.</p>
            </div>
            
          </div>
        </div>
      </div>
    </section>

    <section id="act5" data-sc-act="pan" data-sc-span="5" data-screen-label="Act 5 · The twelve" style="background:#F7F0E2">
      <div data-sc-stage>
        <div id="rail" data-sc-pan="0.05" style="display:flex;align-items:center;gap:30px;height:100%;padding:0 7vw;width:max-content">
          <div class="v2-cell" style="width:380px;min-width:380px;flex:none">
            <h2 style="margin:0;font-family:'Fraunces',serif;font-weight:400;font-size:clamp(30px,3.4vw,44px);line-height:1.1;letter-spacing:-0.02em;color:#3A2A1E">What we install. <em style="color:#456B49">Not what we imagine.</em></h2>
            <p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#6A5443;max-width:34ch">The names stay private until our clients approve their numbers. The shapes are real, running, and yours to steal ideas from.</p>
          </div>
          <span data-lp="pairs"></span>
          <div class="v2-cell" style="width:420px;min-width:420px;flex:none">
            <p style="margin:0;font-family:'Fraunces',serif;font-size:clamp(20px,2vw,27px);line-height:1.45;color:#3A2A1E">Not another team of generic personas. Off-the-shelf AI employees ship someone else's process with your logo on it. We map yours first. That is why the results compound instead of plateauing.</p>
            <p style="margin:22px 0 0 0"><a href="/agents" style="font-size:15px;text-decoration:none;border-bottom:1px solid rgba(69,107,73,0.4)">Find your first install →</a></p>
          </div>
        </div>
      </div>
    </section>

    <section id="act6" data-acts="005 006" data-screen-label="Act 6 · The path" class="v2-pad" style="background:#F3EADA;padding:110px 32px 90px 32px">
      <div style="max-width:1180px;margin:0 auto">
        <h2 data-reveal="1" style="margin:0 0 44px 0;font-family:'Fraunces',serif;font-weight:400;font-size:clamp(30px,3.6vw,46px);line-height:1.08;letter-spacing:-0.02em;color:#3A2A1E;max-width:16ch">Installed in 45 days. <em style="color:#456B49">Approved by you.</em></h2>
        <div class="v2-steps" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
          <div data-reveal="1" style="border-radius:14px;border:1px solid rgba(74,53,38,0.12);background:#FFFDF8;padding:26px;box-shadow:0 14px 30px -18px rgba(60,42,28,0.25)">
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:12px;color:#456B49"><span>01 · LEVERAGE ASSESSMENT</span></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#9A8773;margin-top:3px">2 TO 3 WEEKS</div>
            <p style="margin:12px 0 0 0;font-size:14.5px;line-height:1.65;color:#6A5443">An expert-led audit of where your senior hours actually leak. You get the Leverage Map: your top three agent opportunities ranked by dollar impact, with an install scope. Three installable opportunities or it is free, and the fee is credited toward your install.</p>
          </div>
          <div data-reveal="1" data-delay="120" style="border-radius:14px;border:1px solid rgba(69,107,73,0.55);background:#FFFDF8;padding:26px;box-shadow:0 0 0 1px rgba(69,107,73,0.4), 0 18px 36px -18px rgba(60,42,28,0.3)">
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:12px;color:#456B49"><span>02 · FIRST INSTALL</span></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#9A8773;margin-top:3px">30 TO 45 DAYS</div>
            <p data-proof="005" style="margin:12px 0 0 0;font-size:14.5px;line-height:1.65;color:#6A5443">Your number one leverage point goes live: one agent built on your processes, your team trained, the approval ledger running, and thirty days operated by us. Every install carries a written success gate agreed before we build: a number, not a vibe. Fixed scope, fixed price, signed before we start.</p>
          </div>
          <div data-reveal="1" data-delay="240" style="border-radius:14px;border:1px solid rgba(74,53,38,0.12);background:#FFFDF8;padding:26px;box-shadow:0 14px 30px -18px rgba(60,42,28,0.25)">
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:12px;color:#456B49"><span>03 · THE PARTNERSHIP</span></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#9A8773;margin-top:3px">6-MONTH MINIMUM</div>
            <p style="margin:12px 0 0 0;font-size:14.5px;line-height:1.65;color:#6A5443">We operate the system: daily runs with human review, a monthly working session on the numbers, and a new agent installed every quarter. Private environment, your data, your models if you prefer, no lock-in. Part of our pay rides on your results.</p>
          </div>
        </div>
        <p data-proof="006" data-reveal="1" data-delay="320" style="margin:26px 0 0 4px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#9A8773">Every client we have started with is still with us.</p>
      </div>
    </section>

    <section id="act7wrap" data-sc-act="pin" data-sc-span="2" data-screen-label="Act 7 · The stamp" style="background:radial-gradient(120% 130% at 78% 50%, #15100a 0%, #0c0907 60%, #080605 100%)">
      <div data-sc-stage>
        <div class="v2-close" style="display:grid;grid-template-columns:minmax(280px,370px) 1fr;gap:6vw;align-items:center;max-width:1180px;height:100%;margin:0 auto;padding:0 32px">
          <div data-sc-cue="0 1 0 0" style="background:rgba(11,9,6,0.72);border:1px solid rgba(241,231,214,0.16);border-radius:12px;padding:22px 24px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:0.26em;color:#9A876F;padding-bottom:10px;border-bottom:1px solid rgba(241,231,214,0.14)">APPROVAL LEDGER · TOTALLED</div>
            <div style="display:flex;flex-direction:column;padding-top:8px">
              <span data-lp="receiptRows"></span>
              <div style="border-top:1px solid rgba(241,231,214,0.14);margin-top:8px;padding-top:10px;display:flex;gap:10px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.6">
                <span data-lp="l7num" style="color:#6E6455;min-width:26px">007</span>
                <span data-lp="l7" style="color:#C6B49C;flex:1"><span data-lp="typed"></span><span data-lp="caret" style="color:#90C08A;animation:aijCaret 1s steps(1) infinite">▌</span></span>
              </div>
            </div>
          </div>
          <div style="max-width:560px">
            <h2 data-sc-cue="0.04" data-sc-kinetic="lines" style="margin:0;font-family:'Fraunces',serif;font-weight:400;font-size:clamp(34px,3.6vw,56px);line-height:1.06;letter-spacing:-0.02em;color:#F1E7D6">Get your 3 installable opportunities.</h2>
            <p data-sc-cue="0.08" style="margin:20px 0 28px 0;font-size:16.5px;line-height:1.7;color:#C6B49C;max-width:52ch">The Leverage Assessment finds the first work worth installing. If we cannot identify three, it is free. We take a handful of firms at a time.</p>
            <div data-sc-magnet="0.24" style="display:inline-block">
              <a href="/assessment" data-lp="cta" style="display:inline-flex;align-items:center;height:50px;padding:0 28px;border-radius:999px;background:#456B49;color:#F1E7D6;font-family:'Instrument Sans',sans-serif;font-size:15px;font-weight:600;text-decoration:none;box-shadow:0 14px 30px -14px rgba(69,107,73,0.55)">Get your 3 installable opportunities</a>
            </div>
            <div data-lp="stampedNote" hidden>
              <p style="margin:14px 0 0 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#7A9B6E">stamped · continues to /assessment</p>
            </div>
            <p data-sc-cue="0.08" style="margin:44px 0 0 0;font-size:14px;line-height:1.7;color:#9A876F">Prefer to talk first? <a href="https://cal.welcometotheaijungle.com/loic/intro" style="color:#C6B49C">Book a 30-minute call.</a> No slides, no pitch deck. Come with your 15-hour problem. hello@welcometotheaijungle.com</p>
          </div>
        </div>
      </div>
    </section>

    <footer data-screen-label="Footer" style="background:#2E2015;padding:80px 32px 40px 32px;color:#C6B49C" class="v2-pad">
      <div class="aij-cols" style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:48px;max-width:1180px;margin:0 auto">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
            <span style="display:flex;height:34px;width:34px;align-items:center;justify-content:center;overflow:hidden;border-radius:10px;background:#0c0a07;box-shadow:inset 0 0 0 1px rgba(124,168,104,0.3)"><img src="brand/aij-logo-icon.png" alt="AI Jungle" style="height:120%;width:120%;object-fit:cover"></span>
            <span style="font-family:'Fraunces',serif;font-size:19px;color:#F1E7D6">AI <em style="color:#7A9B6E">Jungle</em></span>
          </div>
          <p style="font-size:13.5px;line-height:1.6;color:#9A876F;margin:0 0 16px 0">Weekly insights. No spam, no fluff.</p>
          <form style="display:flex;gap:8px;max-width:340px">
            <input type="email" required="required" placeholder="you@yourfirm.com" style="flex:1;min-width:0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:11px;padding:11px 14px;font-family:'Instrument Sans',sans-serif;font-size:13.5px;color:#F1E7D6">
            <button type="submit" style="background:#456B49;color:#F1E7D6;border:none;border-radius:11px;padding:11px 18px;font-family:'Instrument Sans',sans-serif;font-size:13.5px;font-weight:600;cursor:pointer">Subscribe</button>
          </form>
          <p style="font-size:12px;margin:10px 0 0 0"><a href="https://welcometotheaijungle.substack.com/subscribe" style="color:#9A876F">Or subscribe directly on Substack →</a></p><div data-lp="subNote" hidden><p style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#7A9B6E;margin:10px 0 0 0">subscribed · first issue Friday</p></div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.16em;color:#9A876F;margin-bottom:13px">PRODUCT</div>
          <div style="display:flex;flex-direction:column;gap:9px;font-size:14px"><a href="/assessment" style="color:#C6B49C;text-decoration:none">The Leverage Assessment</a><a href="/agents" style="color:#C6B49C;text-decoration:none">The agents</a><a href="/evolution" style="color:#C6B49C;text-decoration:none">The approval ledger</a><a href="/pricing" style="color:#C6B49C;text-decoration:none">Pricing</a><a href="/expedition" style="color:#C6B49C;text-decoration:none">Play the expedition</a><a href="/roast" style="color:#C6B49C;text-decoration:none">Roast my site</a><a href="/evolution" style="color:#C6B49C;text-decoration:none">The public ledger</a><a href="/board" style="color:#C6B49C;text-decoration:none">The board</a></div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.16em;color:#9A876F;margin-bottom:13px">COMPANY</div>
          <div style="display:flex;flex-direction:column;gap:9px;font-size:14px"><a href="/about" style="color:#C6B49C;text-decoration:none">About</a><a href="/blog" style="color:#C6B49C;text-decoration:none">Journal</a><a href="mailto:hello@welcometotheaijungle.com" style="color:#C6B49C;text-decoration:none">Contact</a></div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.16em;color:#9A876F;margin-bottom:13px">VENTURES</div>
          <div style="display:flex;flex-direction:column;gap:9px;font-size:14px"><a href="https://aiagentspitstop.com" style="color:#C6B49C;text-decoration:none">AI Agents Pitstop</a><a href="/os" style="color:#C6B49C;text-decoration:none">AI Jungle OS</a><a href="/roots" style="color:#C6B49C;text-decoration:none">Jungle Roots</a><a href="/learnaithing" style="color:#C6B49C;text-decoration:none">LearnAIThing</a></div>
        </div>
      </div>
      <div style="max-width:1180px;margin:56px auto 0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:26px 28px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.16em;color:#9A876F;margin-bottom:14px">THE OFFER, IN PLAIN TERMS</div>
        <div class="aij-cols" style="display:grid;grid-template-columns:1fr 1fr;gap:14px 40px;font-size:13px;line-height:1.65;color:#9A876F">
          <p style="margin:0"><strong style="color:#C6B49C;font-weight:600">What:</strong> a business performance system for owner-led firms. We install and operate agents built on your firm's own processes. They fill your pipeline and absorb the grunt work.</p>
          <p style="margin:0"><strong style="color:#C6B49C;font-weight:600">How:</strong> three steps. Leverage Assessment, Install (typically $7,500 to $15,000), Partnership (from $5,000/month plus performance share).</p>
          <p style="margin:0"><strong style="color:#C6B49C;font-weight:600">Who:</strong> owner-led consulting, advisory, search, wealth and professional services firms, 5 to 50 people, where growth still runs on the founder's hours.</p>
          <p style="margin:0"><strong style="color:#C6B49C;font-weight:600">Control:</strong> nothing ships without your yes. Every message, quote and post holds in one approval ledger until the owner approves, in the messaging app you already use.</p>
          <p style="margin:0"><strong style="color:#C6B49C;font-weight:600">Proof:</strong> Every client from day one is still a client. Six systems in production across pipeline, operations, research and brand. Case level: 139 qualified meetings booked in 3 months, 24 percent reply rate, 90 held, 0 messages without approval.</p>
          <p style="margin:0"><strong style="color:#C6B49C;font-weight:600">Privacy:</strong> each client runs in a private, secured environment. Your data stays yours, your models if you prefer, no lock-in.</p>
          <p style="margin:0;grid-column:1 / -1"><strong style="color:#C6B49C;font-weight:600">Start:</strong> the Leverage Assessment, or a 30-minute call if you already know the work you want scoped.</p>
        </div>
      </div>
      <div style="max-width:1180px;margin:40px auto 0 auto;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#8A7660">
        <span>© 2026 AI Jungle · welcometotheaijungle.com</span>
        <span style="display:flex;gap:18px"><a href="/privacy" style="color:#8A7660;text-decoration:none">Privacy</a><a href="/terms" style="color:#8A7660;text-decoration:none">Terms</a><a href="/legal" style="color:#8A7660;text-decoration:none">Legal</a></span>
      </div>
    </footer>
  </main>`
