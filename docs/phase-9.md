# Phase 9 — The AI layer: language in, structured intent out

**Goal:** say what you ate or lifted instead of tapping it in.

**Demo:** type or dictate "2 idli and 2 eggs with sambar" on the Diet screen,
check the draft, tap Save. Ask "how much protein last week?" and get a real
answer.

## The decision that shaped it

The provider is **Google Gemini** (`@google/genai`, `gemini-3.8-flash`), not
Anthropic — a free tier was the requirement, and Gemini's needs no billing
account. The key lives in the browser like the GitHub token, pasted once per
phone at Settings.

Gemini's free tier uses what it receives to improve Google's products, and this
app holds two people's body measurements. So the boundary is the design, not a
setting on it: **the model sees the sentence and the vocabulary needed to
resolve it, and nothing from the logs.**

That single constraint removed the agent loop. With no history in context there
is nothing to iterate over, so this is one call returning one typed intent,
which the app executes locally. Simpler, cheaper, faster, and far more
predictable.

## Scope

| Sent | Withheld |
|---|---|
| The sentence you typed | Weight, waist, hip |
| Food library: name, unit, kcal, grams-per-piece | Every meal log — what was actually eaten |
| Exercise library: name, muscles, how it is logged | Every session — what was actually lifted |
| Meal slot, option and workout day **names** | Water, steps, targets, coaching rules, notes |
| Today's date, the person's display name and portion preference | The GitHub token, the PIN hash |

`src/utils/aiContext.ts` is the only place allowed to build a payload, and it is
a **whitelist** — every field is copied by name, so a field added to `AppData`
later cannot ride along.

## Answering questions without sending the answer

The model is told it has no data. A question compiles to a query spec —
`{ metric: 'protein', days: 7 }` — and `src/utils/aiQuery.ts` runs it locally
through the same `itemsMacros`, `weeklyRate` and `setsByMuscle` the screens use.
The figures are rendered by the app and never go back to the model, so there is
no second request. An answer here cannot disagree with the Diet or Body screen,
because it is the same function.

## Nothing is written on the model's say-so

Names come back as strings and are resolved against the real library by
`src/utils/aiResolve.ts`. An invented food does not become a food id — it is
listed as unrecognised and excluded from the total. A loose match is labelled
("matched from 'boiled egg' — check this") because a string matcher cannot tell
a preparation from a different dish. Every intent becomes a draft you approve,
and writes go through the existing store actions, so merge, tombstones and
per-set stamps keep working.

## Files

```
src/services/ai.ts              provider adapter + gemini, tool declarations
src/utils/aiContext.ts          the whitelist  ← the boundary
src/utils/aiResolve.ts          names → library, or unresolved
src/utils/aiQuery.ts            query spec → answer, computed locally
src/hooks/useAi.ts              turn → draft → apply
src/components/ai/AiBar.tsx     input + dictation (Web Speech API, no dependency)
src/components/ai/DraftSheet.tsx  what it understood, before it is written
test/aiContext.test.js          8 boundary tests
test/aiResolve.test.js          15 resolution and end-to-end macro tests
```

The SDK is imported lazily, so it lands in its own ~414 kB chunk that only
people who use the feature ever download. Without a key `AiBar` renders nothing
and the app is byte-for-byte what it was.

## Verified

- **The boundary, on the real outgoing bytes.** A store loaded with weights,
  measurements, logs, notes and the PIN hash; the request intercepted before it
  left the browser; 7,318 bytes captured and asserted to contain none of them —
  and none of the strings `bodyMetrics`, `mealLogs`, `workoutSessions`,
  `waterEntries`, `stepLogs`, `ghToken`. The vocabulary *was* present.
- **The numbers match the plan.** "2 idli and 2 eggs with sambar" drafts at
  350 kcal / 20.6 g — the figure hand-checked in Phase 3 — and applying it moves
  the Diet screen to the same total.
- **A hallucination cannot be logged.** "protein bar" is flagged and excluded;
  the total is the idli alone.
- **A question makes one request.** The answer is computed on the device.
- **Failure writes nothing.** A rejected key surfaces an error and leaves the
  store untouched.

## The model is data, not a constant

Which models are free changes at Google's end, and a key is not guaranteed to be
served every model, so pinning one in code turned "Google retired that" into an
opaque API error and a redeploy. `activeModel()` resolves it per call from
device state, Settings offers the free-tier list plus a free-text box, and the
default is unchanged — a device that has never chosen one still sends
`gemini-3.8-flash`, verified in the browser.

Worth recording alongside it: the free tier belongs to the **Google Cloud
project**, not the model. Google's wording is "Active project or free trial" for
Free and "Set up and link an active billing account" for Tier 1. The key must be
created in a project with no billing linked.

## A caveat worth keeping

One numeric example in a tool description ("62.4 this morning") once matched a
weight the boundary test had seeded, and the test reported a leak that was not
one. The examples are now worded without numbers, so anything data-shaped in a
payload is genuinely data. It is the kind of false positive worth keeping a
test honest enough to produce.
