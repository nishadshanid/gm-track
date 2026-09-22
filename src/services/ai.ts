import type { AiContext } from '../utils/aiContext.ts'
import { local } from './local.ts'

/**
 * The AI layer, behind one swappable seam — the same shape as StorageAdapter in
 * `storage.ts`, for the same reason.
 *
 * What crosses this boundary is a whitelisted `AiContext` (see aiContext.ts) and
 * the person's own sentence. What comes back is a typed intent, never a write:
 * the app resolves names against its own library and asks for confirmation
 * before anything is stored.
 */

export type AiIntent =
  | { kind: 'log_meal'; slot?: string; items: { food: string; qty?: number; unit?: string }[] }
  | { kind: 'log_sets'; exercise: string; sets: { weightKg?: number; reps?: number; seconds?: number }[] }
  | { kind: 'log_body'; weightKg?: number; waistCm?: number; hipCm?: number }
  | { kind: 'log_water'; ml: number }
  | { kind: 'log_steps'; steps: number }
  | { kind: 'ask'; metric: string; days: number }
  | { kind: 'skip_workout'; day?: string; reason?: string }
  | { kind: 'unclear'; message: string }

export interface AiProvider {
  name: string
  available(): boolean
  interpret(input: string, ctx: AiContext): Promise<AiIntent>
}

/** The function declarations the model chooses between. */
const TOOLS = [
  {
    type: 'function',
    name: 'log_meal',
    description:
      'Record food that was eaten. Use for anything describing food, e.g. "two idli and two eggs", "had dosa with sambar".',
    parameters: {
      type: 'object',
      properties: {
        slot: {
          type: 'string',
          description:
            'Which meal slot, matched from the mealSlots list. Omit if the person did not say.',
        },
        items: {
          type: 'array',
          description: 'One entry per distinct food mentioned.',
          items: {
            type: 'object',
            properties: {
              food: {
                type: 'string',
                description:
                  'The food name, copied from the foods list where possible. Never invent a food that is not in the list; if it is genuinely absent, use the words the person said.',
              },
              qty: { type: 'number', description: 'How many, in the unit given.' },
              unit: { type: 'string', description: 'One of: g, ml, piece.' },
            },
            required: ['food'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    type: 'function',
    name: 'log_sets',
    description:
      'Record sets of an exercise, e.g. "bench forty by eight, eight, seven" or "plank three by forty-five seconds".',
    parameters: {
      type: 'object',
      properties: {
        exercise: { type: 'string', description: 'Exercise name, copied from the exercises list.' },
        sets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              weightKg: { type: 'number' },
              reps: { type: 'number' },
              seconds: { type: 'number', description: 'For time-based exercises instead of reps.' },
            },
          },
        },
      },
      required: ['exercise', 'sets'],
    },
  },
  {
    type: 'function',
    name: 'log_body',
    description:
      'Record a weight or tape measurement, e.g. "weighed myself this morning", "waist is down".',
    parameters: {
      type: 'object',
      properties: {
        weightKg: { type: 'number' },
        waistCm: { type: 'number' },
        hipCm: { type: 'number' },
      },
    },
  },
  {
    type: 'function',
    name: 'log_water',
    description: 'Record water drunk, e.g. "two glasses", "500ml water".',
    parameters: {
      type: 'object',
      properties: { ml: { type: 'number', description: 'Millilitres. Treat one glass as 250 ml.' } },
      required: ['ml'],
    },
  },
  {
    type: 'function',
    name: 'log_steps',
    description: 'Record a step count for the day.',
    parameters: {
      type: 'object',
      properties: { steps: { type: 'number' } },
      required: ['steps'],
    },
  },
  {
    type: 'function',
    name: 'ask',
    description:
      'Answer a question about past logs. IMPORTANT: you do not have the data. Return only which metric and window to look up; the app computes the answer itself.',
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'One of: kcal, protein, water, steps, weight, sets, sessions.',
        },
        days: { type: 'number', description: 'Window in days ending today. "Last week" is 7.' },
      },
      required: ['metric', 'days'],
    },
  },
  {
    type: 'function',
    name: 'skip_workout',
    description: 'Mark a training day as skipped or not happening, e.g. "no gym Thursday, travelling".',
    parameters: {
      type: 'object',
      properties: {
        day: { type: 'string', description: 'Workout day name from workoutDays, or a weekday.' },
        reason: { type: 'string' },
      },
    },
  },
  {
    type: 'function',
    name: 'unclear',
    description:
      'Use when the message is not a log, a question or a plan change — or is too ambiguous to act on. Say what is missing.',
    parameters: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
]

function systemPrompt(ctx: AiContext): string {
  return [
    'You turn a short spoken or typed sentence into exactly one structured call for a gym and diet tracker. Always call exactly one function.',
    '',
    `Today is ${ctx.today}. The entry is for ${ctx.person}, who fills planned portion ranges at the "${ctx.portions}" end.`,
    '',
    'Rules:',
    '- Copy food and exercise names from the lists below wherever they plausibly match. Do not invent items that are not listed; if something genuinely is not there, pass through the person\'s own words and the app will flag it.',
    '- Quantities: "two idli" means qty 2 unit piece; "two hundred grams of rice" means qty 200 unit g. If no quantity is given, omit qty rather than guessing.',
    '- You have NO access to what was logged before. For any question about past data, call ask() with the metric and window; the app looks it up.',
    '- Indian and Malayalam food words are expected: puttu, kadala, thoran, chapathi, appam, sambar.',
    '',
    `Meal slots: ${ctx.mealSlots.join(', ')}`,
    `Meal options: ${ctx.mealOptions.join(' | ')}`,
    `Workout days: ${ctx.workoutDays.join(', ')}`,
    '',
    'Foods (name, unit, kcal per unit):',
    ctx.foods.map((f) => `${f.name} [${f.unit}${f.gramsEach ? `, ${f.gramsEach}g each` : ''}] ${f.kcal}`).join('; '),
    '',
    'Exercises (name, muscles, how logged):',
    ctx.exercises.map((e) => `${e.name} [${e.groups}, ${e.mode}]`).join('; '),
  ].join('\n')
}

/** Normalise a returned function call into our own intent union. */
function toIntent(name: string, args: Record<string, unknown>): AiIntent {
  switch (name) {
    case 'log_meal':
      return { kind: 'log_meal', slot: args.slot as string | undefined, items: (args.items as never) ?? [] }
    case 'log_sets':
      return { kind: 'log_sets', exercise: String(args.exercise ?? ''), sets: (args.sets as never) ?? [] }
    case 'log_body':
      return {
        kind: 'log_body',
        weightKg: args.weightKg as number | undefined,
        waistCm: args.waistCm as number | undefined,
        hipCm: args.hipCm as number | undefined,
      }
    case 'log_water':
      return { kind: 'log_water', ml: Number(args.ml) || 0 }
    case 'log_steps':
      return { kind: 'log_steps', steps: Number(args.steps) || 0 }
    case 'ask':
      return { kind: 'ask', metric: String(args.metric ?? 'kcal'), days: Number(args.days) || 7 }
    case 'skip_workout':
      return { kind: 'skip_workout', day: args.day as string | undefined, reason: args.reason as string | undefined }
    default:
      return { kind: 'unclear', message: String(args.message ?? 'I could not turn that into an entry.') }
  }
}

/**
 * The model, as data rather than a constant.
 *
 * Which models are free changes at Google's end, and a key is not guaranteed to
 * be served every model. Pinning one in code turns "Google retired that" into
 * an opaque API error and a redeploy; a Settings choice turns it into a
 * dropdown.
 */
export const DEFAULT_MODEL = 'gemini-3.8-flash'

/** Free of charge on Google's pricing page at the time of writing. */
export const FREE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
] as const

export function activeModel(): string {
  return local.getSnapshot().aiModel?.trim() || DEFAULT_MODEL
}

export const geminiProvider: AiProvider = {
  name: 'Gemini',
  available: () => Boolean(local.getSnapshot().aiKey),

  async interpret(input, ctx) {
    const apiKey = local.getSnapshot().aiKey
    if (!apiKey) throw new Error('No API key set. Add one in Settings.')

    // Imported lazily so the SDK is only downloaded by people who use the
    // feature — it is a large dependency for an optional extra.
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey })

    const interaction = await ai.interactions.create({
      model: activeModel(),
      input: `${systemPrompt(ctx)}\n\n---\nThe person said: ${input}`,
      tools: TOOLS as never,
    })

    for (const step of interaction.steps ?? []) {
      if (step.type === 'function_call') {
        return toIntent(step.name as string, (step.arguments as Record<string, unknown>) ?? {})
      }
    }
    return { kind: 'unclear', message: 'No structured result came back. Try rephrasing.' }
  },
}

/** The active provider. Swap the implementation by changing this line. */
export const ai: AiProvider = geminiProvider
