import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type IgFormat = 'REEL' | 'CAROUSEL' | 'IMAGE' | 'STORY'

interface FormatEntry {
  id: number
  name: string
  group: string
  igFormat: IgFormat
  igFormatLabel: string
  repostAs: string
  isMeme: boolean
  structure: string
  hooks: string[]
  visual: string
  cta: string
  shareTrigger: string
  promptTemplate: string
  extraRules: string
  requiredInputs: string[]
}

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'docs/72-short-form-content-formats (2).md')
const target = resolve(root, 'scripts/seed-data/formats.json')

const text = readFileSync(source, 'utf8')

function toIgFormat(label: string): IgFormat {
  const l = label.toLowerCase()
  if (l.startsWith('reel')) return 'REEL'
  if (l.startsWith('story')) return 'STORY'
  if (l.startsWith('single image')) return 'IMAGE'
  if (l.startsWith('carousel')) return 'CAROUSEL'
  throw new Error(`Unknown Instagram format: ${label}`)
}

const mapSection = text.slice(text.indexOf('## Instagram Format Map'))
const mapRows = new Map<number, { ig: string; repost: string }>()
for (const line of mapSection.split('\n')) {
  const m = /^\|\s*(\d+)\s*\|[^|]*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/.exec(line)
  if (m) mapRows.set(Number(m[1]), { ig: m[2], repost: m[3] })
}

const systemPromptMatch = /\*\*System prompt \(same for every format\)\*\*\s*```text\n([\s\S]*?)```/.exec(
  text,
)
if (!systemPromptMatch) throw new Error('System prompt not found')

const groups: { start: number; name: string }[] = []
const groupRe = /^## ([A-K])\. (.+?) \(\d+-\d+\)$/gm
for (let g = groupRe.exec(text); g; g = groupRe.exec(text)) {
  groups.push({ start: g.index, name: `${g[1]}. ${g[2]}` })
}

function groupFor(index: number): string {
  let name = ''
  for (const g of groups) if (g.start <= index) name = g.name
  return name
}

function inputsFor(extra: string, id: number): string[] {
  const out = new Set<string>()
  if (/proof\.stats/.test(extra)) out.add('proof.stats')
  if (/proof\.comments/.test(extra)) out.add('proof.comments')
  if (/proof\.reviews/.test(extra)) out.add('proof.reviews')
  if (/proof\.milestones/.test(extra)) out.add('proof.milestones')
  if (/offers listed/.test(extra)) out.add('proof.offers')
  if (/news input/.test(extra)) out.add('proof.news')
  if (/competitors data/.test(extra)) out.add('competitors')
  if (/supplied screenshots/.test(extra)) out.add('features.screenshot')
  if (/images supplied as licensed or owned/.test(extra)) out.add('proof.images')
  if (id === 30) out.add('proof.stats')
  return [...out]
}

const entryRe = /^### (\d+)\. (.+)$/gm
const heads: { id: number; name: string; index: number; end: number }[] = []
for (let m = entryRe.exec(text); m; m = entryRe.exec(text)) {
  heads.push({
    id: Number(m[1]),
    name: m[2].trim(),
    index: m.index,
    end: m.index + m[0].length,
  })
}

const formats: FormatEntry[] = heads.map((head, i) => {
  const stop = i + 1 < heads.length ? heads[i + 1].index : text.indexOf('## Instagram Format Map')
  const nextGroup = groups.find((g) => g.start > head.index)
  const bodyEnd = nextGroup && nextGroup.start < stop ? nextGroup.start : stop
  const body = text.slice(head.end, bodyEnd)

  const mapRow = mapRows.get(head.id)
  if (!mapRow) throw new Error(`Format ${head.id} missing from map`)

  const field = (label: string): string => {
    const m = new RegExp(`- \\*\\*${label}:\\*\\* ([^\\n]+)`).exec(body)
    return m ? m[1].trim() : ''
  }
  const hooksBlock = /- \*\*Hooks:\*\*\n((?: {2}- [^\n]+\n?)+)/.exec(body)
  const hooks = hooksBlock
    ? hooksBlock[1]
        .split('\n')
        .map((l) => l.replace(/^ {2}- /, '').trim())
        .filter(Boolean)
    : []
  const prompt = /\*\*Prompt\*\*\s*```text\n([\s\S]*?)```/.exec(body)
  if (!prompt) throw new Error(`Format ${head.id} has no prompt`)
  const extra = /^Extra rules: (.+)$/m.exec(prompt[1])?.[1] ?? ''

  return {
    id: head.id,
    name: head.name,
    group: groupFor(head.index),
    igFormat: toIgFormat(mapRow.ig),
    igFormatLabel: mapRow.ig,
    repostAs: mapRow.repost,
    isMeme: /\(meme\)/i.test(head.name) || head.id >= 61 || (head.id >= 17 && head.id <= 21),
    structure: field('Structure'),
    hooks,
    visual: field('Visual'),
    cta: field('CTA'),
    shareTrigger: field('Why it gets shared'),
    promptTemplate: prompt[1].trim(),
    extraRules: extra,
    requiredInputs: inputsFor(extra, head.id),
  }
})

const counts = formats.reduce<Record<string, number>>((acc, f) => {
  acc[f.igFormat] = (acc[f.igFormat] ?? 0) + 1
  return acc
}, {})

if (formats.length !== 72) throw new Error(`Expected 72 formats, got ${formats.length}`)

writeFileSync(
  target,
  `${JSON.stringify({ systemPrompt: systemPromptMatch[1].trim(), formats }, null, 2)}\n`,
)
console.log(`Wrote ${formats.length} formats`, counts)
console.log(
  'Required inputs:',
  formats.filter((f) => f.requiredInputs.length).map((f) => `${f.id}:${f.requiredInputs.join('+')}`).join(' '),
)
