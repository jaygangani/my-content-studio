/**
 * Seeds the FormatDef and PromptSnippet tables straight into DynamoDB.
 *
 * Run it yourself, only when you mean to write to the cloud:
 *   AWS_PROFILE=jaygangani AWS_REGION=ap-south-1 npm run seed:formats -- --dry-run
 *   AWS_PROFILE=jaygangani AWS_REGION=ap-south-1 npm run seed:formats
 *
 * Insert-only by default: rows that already exist (and may have been edited
 * by an admin) are left alone. Pass --overwrite to replace them.
 *
 * Table names are discovered by prefix (FormatDef-, PromptSnippet-). When more
 * than one environment exists, set FORMAT_TABLE and PROMPT_TABLE.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  ListTablesCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'

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

const root = resolve(import.meta.dirname, '..')
const dir = resolve(root, 'scripts/seed-data')
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as T

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const overwrite = args.has('--overwrite')

const catalog = read<{ systemPrompt: string; formats: SeedFormat[] }>('formats.json')
const overrides = read<Record<string, FormatOverride>>('format-overrides.json')
const prompts = read<SeedPrompt[]>('prompts.json')

function formatItems(): Json[] {
  const now = new Date().toISOString()
  const rows: Json[] = catalog.formats.map((format, index) => {
    const extra = overrides[String(format.id)] ?? {}
    const stockDefault =
      format.igFormat === 'CAROUSEL' || format.igFormat === 'IMAGE'
        ? 'never'
        : undefined
    return {
      id: `format-${format.id}`,
      __typename: 'FormatDef',
      createdAt: now,
      updatedAt: now,
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
    __typename: 'FormatDef',
    createdAt: now,
    updatedAt: now,
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
  const now = new Date().toISOString()
  return prompts.map((prompt) => ({
    id: `snippet-${prompt.key}`,
    __typename: 'PromptSnippet',
    createdAt: now,
    updatedAt: now,
    key: prompt.key,
    label: prompt.label,
    description: prompt.description,
    value: prompt.value,
    enabled: true,
    required: prompt.required,
  }))
}

async function findTable(
  client: DynamoDBClient,
  prefix: string,
  envName: string,
): Promise<string> {
  const fromEnv = process.env[envName]
  if (fromEnv) return fromEnv
  const names: string[] = []
  let start: string | undefined
  do {
    const page = await client.send(
      new ListTablesCommand({ ExclusiveStartTableName: start }),
    )
    names.push(...(page.TableNames ?? []))
    start = page.LastEvaluatedTableName
  } while (start)
  const matches = names.filter((name) => name.startsWith(prefix))
  if (matches.length === 1) return matches[0]
  if (matches.length === 0) {
    throw new Error(
      `No table starting with ${prefix} found. Deploy the backend first, or set ${envName}.`,
    )
  }
  throw new Error(
    `Several tables start with ${prefix}:\n  ${matches.join('\n  ')}\nSet ${envName} to the one you want.`,
  )
}

async function write(
  client: DynamoDBClient,
  table: string,
  items: Json[],
): Promise<{ written: number; skipped: number }> {
  let written = 0
  let skipped = 0
  for (const item of items) {
    try {
      await client.send(
        new PutItemCommand({
          TableName: table,
          Item: marshall(item, { removeUndefinedValues: true }),
          ConditionExpression: overwrite ? undefined : 'attribute_not_exists(id)',
        }),
      )
      written += 1
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) skipped += 1
      else throw error
    }
  }
  return { written, skipped }
}

async function main() {
  const formats = formatItems()
  const snippets = promptItems()
  console.log(`Formats: ${formats.length}  Prompt snippets: ${snippets.length}`)
  if (dryRun) {
    console.log('Dry run, nothing written.')
    return
  }
  const client = new DynamoDBClient({})
  const formatTable = await findTable(client, 'FormatDef-', 'FORMAT_TABLE')
  const promptTable = await findTable(client, 'PromptSnippet-', 'PROMPT_TABLE')
  console.log(`Writing to ${formatTable} and ${promptTable}`)
  console.log(overwrite ? 'Mode: overwrite existing rows' : 'Mode: insert only')
  const f = await write(client, formatTable, formats)
  const p = await write(client, promptTable, snippets)
  console.log(`Formats written ${f.written}, skipped ${f.skipped}`)
  console.log(`Prompts written ${p.written}, skipped ${p.skipped}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
