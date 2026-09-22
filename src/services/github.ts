import { local } from './local.ts'

/**
 * GitHub-as-database, against a PRIVATE repo.
 *
 * FTrack uses a public repo so its dashboard can read without a token. That is
 * not available here: this file carries both people's body weight and waist
 * measurements. The repo is private, so reads are authenticated too, and each
 * phone pastes a fine-grained token once. The token lives in that browser and
 * is never bundled into the build.
 */

const owner = import.meta.env.VITE_GH_OWNER
const repo = import.meta.env.VITE_GH_REPO
const branch = import.meta.env.VITE_GH_BRANCH || 'main'
const path = import.meta.env.VITE_GH_PATH || 'data.json'

export const githubConfigured = Boolean(owner && repo)

const API = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

export const getToken = () => local.getSnapshot().ghToken ?? ''
export const setToken = (t: string) => local.setToken(t)
export const clearToken = () => local.clearToken()
/** Both a token and repo coordinates are needed before syncing can start. */
export const githubReady = () => githubConfigured && Boolean(getToken())

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' }
  const t = getToken()
  if (t) h.Authorization = `Bearer ${t}`
  return h
}

// UTF-8 safe base64 — the file contains names and notes, not just ASCII.
function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

/** The blob sha of the file as last seen. Required to write it. */
let currentSha: string | undefined
/** ETag, so an unchanged poll costs a 304 rather than a full download. */
let etag: string | undefined

export class GithubError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface ReadResult {
  /** null when the file does not exist yet; undefined when unchanged (304). */
  text: string | null | undefined
}

export async function readFile(useEtag = true): Promise<ReadResult> {
  const h = headers()
  if (useEtag && etag) h['If-None-Match'] = etag

  const res = await fetch(`${API}?ref=${branch}`, { headers: h, cache: 'no-store' })

  if (res.status === 304) return { text: undefined }
  if (res.status === 404) {
    currentSha = undefined
    return { text: null }
  }
  if (res.status === 401 || res.status === 403) {
    throw new GithubError(
      res.status === 401 ? 'Token rejected. Check it in Settings.' : 'Token lacks access to this repo.',
      res.status,
    )
  }
  if (!res.ok) throw new GithubError(`Read failed (${res.status})`, res.status)

  const tag = res.headers.get('etag')
  if (tag) etag = tag
  const json = await res.json()
  currentSha = json.sha
  return { text: decodeBase64(json.content) }
}

/**
 * Write the file. Returns false on a sha conflict, which means someone else
 * wrote it since our last read — the caller re-reads, merges and tries again
 * rather than forcing its own copy over theirs.
 */
export async function writeFile(text: string, message: string): Promise<boolean> {
  const res = await fetch(API, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: encodeBase64(text),
      branch,
      ...(currentSha ? { sha: currentSha } : {}),
    }),
  })

  // 409 is the documented conflict; 422 comes back when the sha is stale or
  // missing on an existing file, which is the same situation.
  if (res.status === 409 || res.status === 422) {
    etag = undefined
    return false
  }
  if (!res.ok) throw new GithubError(`Write failed (${res.status})`, res.status)

  const json = await res.json()
  currentSha = json.content?.sha
  // The content changed, so the old ETag is meaningless.
  etag = undefined
  return true
}

/** Validates a token and that it can actually see the repo. */
export async function verifyToken(token: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
    })
    if (res.ok) return { ok: true }
    if (res.status === 404) return { ok: false, reason: 'Repo not found, or the token cannot see it.' }
    if (res.status === 401) return { ok: false, reason: 'Token rejected by GitHub.' }
    return { ok: false, reason: `GitHub said ${res.status}.` }
  } catch {
    return { ok: false, reason: 'Could not reach GitHub.' }
  }
}

export const repoLabel = `${owner ?? '—'}/${repo ?? '—'}`
