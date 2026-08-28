import type { Industry, ObjectionLog, SceneId, Skin, Tone } from './types.ts'
import { firstClientCase } from './copy/case.ts'

export type SceneCopy = {
  eyebrow: string
  title: string
  narration: string
  proof: string
  offerSteps?: readonly string[]
  caseCard?: readonly string[]
  quote?: string
  attribution?: string
}

const industryLabels: Record<Industry, string> = {
  'saas-recruiting': 'SaaS and recruiting',
  'wealth-advisory': 'wealth and advisory',
  'other-services': 'other services',
}

const industryCopy: Record<Industry, { pipeline: string; proof: string }> = {
  'saas-recruiting': {
    pipeline: 'The pipeline leak is not a hiring problem. It is the Tuesday-afternoon silence after a good conversation, when the next useful move stays in someone\'s head.',
    proof: 'Bob opens doors in your voice. SoFI watches role changes and signals worth a call. Memo holds the relationship context.',
  },
  'wealth-advisory': {
    pipeline: 'Your network is the asset. The hours are the constraint. The people who could sign your next three deals cannot wait for the week when the partner has time.',
    proof: 'The visibility and network engine watches the signals, keeps the context, and drafts the approach. You decide who to reach and when.',
  },
  'other-services': {
    pipeline: 'The workflow everyone complains about on Fridays is usually the one your growth depends on. It does not need a louder tool. It needs an owner and a next step.',
    proof: 'The system maps how work actually flows, then shapes the right agent to your process. The partner validates every finding.',
  },
}

function toneCopy(tone: Tone): { eyebrow: string; title: string; narration: string; proof: string } {
  if (tone === 'evidence-first') {
    return {
      eyebrow: 'TERRITORY 01 · PIPELINE',
      title: 'A number, not a vibe.',
      narration: 'Cold outreach averages a 3.4% reply rate across billions of sends (Instantly 2026 benchmark). The point is not volume. The point is a specific person, a real signal, and a message you approve.',
      proof: 'Fewer messages. Real context. Your voice. A hard gate before anything leaves.',
    }
  }
  return {
    eyebrow: 'TERRITORY 01 · PIPELINE',
    title: 'The silence tells you where to look.',
    narration: 'Tuesday afternoon. The thread is open, the next step is obvious, and it still waits because your judgment is carrying too much of the system.',
    proof: 'The machine does the work. You keep the name and the final word.',
  }
}

function speedProof(skin: Skin): string {
  if (skin.generic || skin.industry === 'other-services') return '#4 the website that adapts to how you read.'
  if (skin.industry === 'saas-recruiting') return '#1 visibility and #3 VIP radar.'
  return '#2 process mapper and #5 desk research.'
}

export function getIndustryLabel(industry: Industry): string {
  return industryLabels[industry]
}

export function getSceneCopy(scene: SceneId, skin: Skin): SceneCopy {
  const profile = industryCopy[skin.industry]
  if (scene === 'basecamp') {
    return skin.tone === 'evidence-first'
      ? {
          eyebrow: 'TERRITORY 00 · BASECAMP',
          title: 'Grow without hiring.',
          narration: 'Fifteen hours leak out of a week before the work that matters gets a turn. We will find the system problem underneath it, then show you what is worth installing.',
          proof: 'The Leverage Assessment finds three installable opportunities or it is free.',
        }
      : {
          eyebrow: 'TERRITORY 00 · BASECAMP',
          title: 'Sunday, 9:40pm.',
          narration: 'The proposal is still open. Three follow-ups never went out. The perfect candidate never got called back. Fifteen hours leak out of your week, and you know exactly where.',
          proof: 'It is not a courage problem. It is a system problem.',
        }
  }
  if (scene === 'pipeline') {
    const tone = toneCopy(skin.tone)
    return {
      eyebrow: tone.eyebrow,
      title: tone.title,
      narration: `${profile.pipeline} ${tone.narration}`,
      proof: `${profile.proof} ${tone.proof}`,
    }
  }
  if (scene === 'follow-through') {
    return skin.tone === 'evidence-first'
      ? {
          eyebrow: 'TERRITORY 02 · FOLLOW-THROUGH',
          title: 'Nothing ships without your yes.',
          narration: 'Rethink. Build. Operate. Train. Every message, quote, and post lands in one approval ledger. It is a queue. You read it, tap yes, and it ships. You tap no, it dies.',
          proof: 'Who & why: MBA & Engineer. 10 years abroad leading ToT programs up to $25M across automotive, aero, space, defense, consulting, and software.',
        }
      : {
          eyebrow: 'TERRITORY 02 · FOLLOW-THROUGH',
          title: 'It is a queue.',
          narration: 'The first employee who shows you everything before doing anything. Eva turns meetings into follow-through. Every draft waits in one approval ledger inside the messaging app you already use.',
          proof: 'Who & why: MBA & Engineer. 10 years abroad leading ToT programs up to $25M. The machine did the work. The human kept the name.',
        }
  }
  if (scene === 'speed') {
    return {
      eyebrow: 'TERRITORY 03 · SPEED',
      title: 'Nestor moves while you are in the room.',
      narration: 'A fast first response matters because the right moment is short. the same discipline runs on the site you are playing right now.',
      proof: speedProof(skin),
      caseCard: firstClientCase.card,
      quote: firstClientCase.quote,
      attribution: firstClientCase.attribution,
    }
  }
  if (scene === 'memory-cash') {
    return {
      eyebrow: 'TERRITORY 04 · MEMORY & CASH',
      title: 'The context and the cash are already there.',
      narration: 'Assessment (credited). First Install $7,500-15,000 fixed. Partnership from $5,000/month plus performance share.',
      proof: 'Three installable opportunities. Or you pay nothing. the fee comes off your first install',
      offerSteps: [
        'Assessment (credited)',
        'First Install $7,500-15,000 fixed',
        'Partnership from $5,000/month plus performance share',
      ],
    }
  }
  return {
    eyebrow: 'THE SUMMIT',
    title: 'A number, not a vibe.',
    narration: 'Your Leverage Score is a directional planning result from the answers you gave. We can take the next step only when the work and the success gate are clear.',
    proof: 'Get my 3 installable opportunities. Three, or it is free.',
  }
}

export const sceneQuestions: Record<'pipeline' | 'follow-through' | 'speed' | 'memory-cash', string[]> = {
  pipeline: ['pipeline_visibility'],
  'follow-through': ['follow_through', 'memory_access'],
  speed: ['speed_to_lead', 'actual_response_time'],
  'memory-cash': ['memory_access', 'cash_control'],
}

export const objections: Array<{ id: string; label: string; answer: string; scenes: SceneId[] }> = [
  {
    id: 'sales-pitch',
    label: 'Is this a sales pitch in disguise?',
    answer: 'It is a diagnostic with a guarantee attached. If the map is weak, you pay nothing and keep it anyway. The assessment sells the install only if the numbers do.',
    scenes: ['basecamp', 'summit'],
  },
  {
    id: 'not-technical',
    label: "We are not technical. At all.",
    answer: 'Good. Neither are your clients, and you still manage to be indispensable to them. You bring the process knowledge, we bring the build. Your team needs zero code, one messaging app, and opinions.',
    scenes: ['basecamp', 'follow-through'],
  },
  {
    id: 'data',
    label: 'Where does our data sit?',
    answer: 'In a private, secured environment per client. Your data stays yours, your models if you prefer, no lock-in. We will put it in writing before we see a single file.',
    scenes: ['follow-through', 'summit'],
  },
  {
    id: 'tried-ai',
    label: 'We already tried AI. It wrote like a robot.',
    answer: 'You tried a tool. Nobody operated it, so it died in three weeks, like every unowned system does. That is not an AI failure, that is an orphan failure. Operating is literally the third phase of our method.',
    scenes: ['pipeline', 'follow-through'],
  },
  {
    id: 'chatgpt',
    label: 'Why not just ChatGPT?',
    answer: 'You can, the way you can do your own legal work. The question is whether the founder of the firm should spend evenings prompt-engineering, or approving finished work in ten minutes a day.',
    scenes: ['pipeline', 'summit'],
  },
  {
    id: 'generic-spam',
    label: 'AI employees are generic spam.',
    answer: 'The market is full of off-the-shelf AI employees that write like no one and sign in your name. We map your process first, shape the agent to it, and weld in the covenant: nothing ships without your yes.',
    scenes: ['basecamp', 'pipeline'],
  },
  {
    id: 'volume',
    label: 'I want volume, unsupervised.',
    answer: 'We are not for you if you want AI to replace your judgment instead of multiplying it, or volume spam with your signature on it. We will save us both the call.',
    scenes: ['pipeline', 'summit'],
  },
  {
    id: 'misses-number',
    label: 'What if it misses the number?',
    answer: 'Then we fix it on our time until it passes, or we say plainly that we were wrong, and the partnership does not start. The gate exists to protect both of us from politeness.',
    scenes: ['follow-through', 'summit'],
  },
]

export function findObjection(topic: string): (typeof objections)[number] | undefined {
  const normalized = topic.toLowerCase()
  return objections.find((item) => item.id === topic || item.label.toLowerCase() === normalized || item.label.toLowerCase().includes(normalized))
}

export function objectionLog(item: (typeof objections)[number], detail?: string): ObjectionLog {
  return { topic: item.label, detail, answer: item.answer, at: new Date().toISOString() }
}
