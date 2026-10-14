/**
 * Seeds the FormatDef and PromptSnippet models through the GraphQL API, signed
 * in as an admin user. Works the same for a sandbox and for production: it
 * only needs the matching amplify outputs file.
 *
 * Run it yourself, only when you mean to write to the cloud:
 *   npm run seed:formats -- --dry-run
 *   npm run seed:formats                                  # ./amplify_outputs.json
 *   npm run seed:formats -- --outputs outputs/main/amplify_outputs.json
 *
 * Credentials: SEED_EMAIL and SEED_PASSWORD env vars, or you are prompted.
 * The user must be in the Cognito `admin` group.
 *
 * Insert-only by default: rows that already exist (and may have been edited
 * by an admin) are left alone. Pass --overwrite to replace them.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  connectAsAdmin,
  disconnect,
  failure,
  outputsPathFrom,
} from './lib/admin-client'
import type { AdminClient } from './lib/admin-client'

type Json = Record<string, unknown>

interface SeedFormat {
  id: number
  name: string
  group: string
  igFormat: string
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

interface FormatOverride {
  layout?: string
  lineCount?: number
  sharpen?: string
  slideRange?: [number, number]
  variant?: string
  stockPolicy?: string
}

interface SeedPrompt {
  key: string
  label: string
  description: string
  value: string
  required: boolean
}

const CONTENT_TYPE: Record<string, string> = {
  REEL: 'reel',
  CAROUSEL: 'carousel',
  IMAGE: 'image',
  STORY: 'story',
}

const root = resolve(import.meta.dirname, '..')
const dir = resolve(root, 'scripts/seed-data')
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as T

const argv = process.argv.slice(2)
const args = new Set(argv)
const dryRun = args.has('--dry-run')
const overwrite = args.has('--overwrite')
const outputsPath = outputsPathFrom(argv)

const catalog = read<{ systemPrompt: string; formats: SeedFormat[] }>('formats.json')
const overrides = read<Record<string, FormatOverride>>('format-overrides.json')
const prompts = read<SeedPrompt[]>('prompts.json')

function formatItems(): Json[] {
  const rows: Json[] = catalog.formats.map((format, index) => {
    const extra = overrides[String(format.id)] ?? {}
    const stockDefault =
      format.igFormat === 'CAROUSEL' || format.igFormat === 'IMAGE'
        ? 'never'
        : undefined
    return {
      id: `format-${format.id}`,
      formatId: format.id,
      name: format.name,
      groupName: format.group,
      igFormat: format.igFormat,
      igFormatLabel: format.igFormatLabel,
      repostAs: format.repostAs,
      kind: 'standard',
      isMeme: format.isMeme,
      enabled: true,
      structure: format.structure,
      visual: format.visual,
      cta: format.cta,
      shareTrigger: format.shareTrigger,
      promptTemplate: format.promptTemplate,
      extraRules: format.extraRules,
      sharpen: extra.sharpen,
      hooks: format.hooks,
      requiredInputs: format.requiredInputs,
      layout: extra.layout,
      variant: extra.variant,
      lineCount: extra.lineCount,
      slideMin: extra.slideRange?.[0],
      slideMax: extra.slideRange?.[1],
      stockPolicy: extra.stockPolicy ?? stockDefault,
      sortOrder: index + 1,
      contentType: CONTENT_TYPE[format.igFormat],
      subtype: format.igFormat === 'REEL' ? 'reel.video-beats' : undefined,
    }
  })
  const special = (
    formatId: number,
    kind: 'meme' | 'viral',
    name: string,
    structure: string,
    visual: string,
    order: number,
  ): Json => ({
    id: `format-${formatId}`,
    formatId,
    name,
    groupName: 'Meme and Relatable',
    igFormat: 'REEL',
    igFormatLabel: 'Reel',
    repostAs: '',
    kind,
    isMeme: true,
    enabled: true,
    structure,
    visual,
    cta: '',
    shareTrigger: '',
    promptTemplate: '',
    extraRules: '',
    hooks: [],
    requiredInputs: [],
    sortOrder: order,
    contentType: 'reel',
    subtype: kind === 'meme' ? 'reel.green-screen' : 'reel.tweet-style',
    assetCategory: kind === 'meme' ? 'green-screen' : 'viral-clip',
  })
  rows.push(
    special(
      9001,
      'meme',
      'Meme Reel (Green Screen)',
      'One meme line over a looping green screen meme video.',
      'Green screen meme video over a stock photo or solid colour.',
      1001,
    ),
    special(
      9002,
      'viral',
      'Viral Clip Reel (Tweet Style)',
      'A tweet-style line on top of a viral video playing below it.',
      'Viral video under a black header with one line of text.',
      1002,
    ),
  )
  return rows
}

function promptItems(): Json[] {
  return prompts.map((prompt) => ({
    id: `snippet-${prompt.key}`,
    key: prompt.key,
    label: prompt.label,
    description: prompt.description,
    value: prompt.value,
    enabled: true,
    required: prompt.required,
  }))
}

interface Counts {
  created: number
  updated: number
  skipped: number
}

type Client = AdminClient

async function seedFormats(client: Client, items: Json[]): Promise<Counts> {
  const counts: Counts = { created: 0, updated: 0, skipped: 0 }
  const existing = new Set<string>()
  let nextToken: string | null | undefined
  do {
    const page = await client.models.FormatDef.list({ limit: 500, nextToken })
    if (page.errors?.length) throw new Error(failure(page.errors))
    for (const row of page.data) existing.add(row.id)
    nextToken = page.nextToken
  } while (nextToken)

  for (const item of items) {
    const id = item.id as string
    if (existing.has(id)) {
      if (!overwrite) {
        counts.skipped += 1
        continue
      }
      const result = await client.models.FormatDef.update(
        item as Parameters<typeof client.models.FormatDef.update>[0],
      )
      if (result.errors?.length) throw new Error(failure(result.errors))
      counts.updated += 1
      continue
    }
    const result = await client.models.FormatDef.create(
      item as Parameters<typeof client.models.FormatDef.create>[0],
    )
    if (result.errors?.length) throw new Error(failure(result.errors))
    counts.created += 1
  }
  return counts
}

async function seedPrompts(client: Client, items: Json[]): Promise<Counts> {
  const counts: Counts = { created: 0, updated: 0, skipped: 0 }
  const existing = new Set<string>()
  let nextToken: string | null | undefined
  do {
    const page = await client.models.PromptSnippet.list({
      limit: 500,
      nextToken,
    })
    if (page.errors?.length) throw new Error(failure(page.errors))
    for (const row of page.data) existing.add(row.id)
    nextToken = page.nextToken
  } while (nextToken)

  for (const item of items) {
    const id = item.id as string
    if (existing.has(id)) {
      if (!overwrite) {
        counts.skipped += 1
        continue
      }
      const result = await client.models.PromptSnippet.update(
        item as Parameters<typeof client.models.PromptSnippet.update>[0],
      )
      if (result.errors?.length) throw new Error(failure(result.errors))
      counts.updated += 1
      continue
    }
    const result = await client.models.PromptSnippet.create(
      item as Parameters<typeof client.models.PromptSnippet.create>[0],
    )
    if (result.errors?.length) throw new Error(failure(result.errors))
    counts.created += 1
  }
  return counts
}

async function main() {
  const formats = formatItems()
  const snippets = promptItems()
  console.log(`Formats: ${formats.length}  Prompt snippets: ${snippets.length}`)
  if (dryRun) {
    console.log('Dry run, nothing written.')
    return
  }

  console.log(overwrite ? 'Mode: overwrite existing rows' : 'Mode: insert only')
  const client = await connectAsAdmin(outputsPath)
  const f = await seedFormats(client, formats)
  const p = await seedPrompts(client, snippets)
  console.log(
    `Formats: created ${f.created}, updated ${f.updated}, skipped ${f.skipped}`,
  )
  console.log(
    `Prompts: created ${p.created}, updated ${p.updated}, skipped ${p.skipped}`,
  )
  await disconnect()
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
