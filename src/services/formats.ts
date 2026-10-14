import { dataClient, type Schema } from '@/lib/amplify'

export type FormatDef = Schema['FormatDef']['type']

export type FormatKind = 'standard' | 'meme' | 'viral'

export const IG_FORMATS = ['REEL', 'CAROUSEL', 'IMAGE', 'STORY'] as const

export const FORMAT_LAYOUTS = ['card', 'grid', 'columns', 'stack'] as const

export const CAROUSEL_VARIANTS = [
  'steps',
  'checklist',
  'split',
  'stat',
  'quote',
  'tier',
  'cards',
  'chat',
  'level',
  'timeline',
  'grid',
  'flags',
  'editorial',
  'template',
  'poster',
] as const

export const STOCK_POLICIES = ['never', 'allowed', 'preferred'] as const

export const REQUIRED_INPUT_HINT = [
  'competitors',
  'features.screenshot',
  'proof.reviews',
  'proof.comments',
  'proof.stats',
  'proof.milestones',
  'proof.news',
  'proof.offers',
  'proof.images',
]

export type FormatInput = Omit<FormatDef, 'id' | 'createdAt' | 'updatedAt'>

export async function listFormats(): Promise<FormatDef[]> {
  const rows: FormatDef[] = []
  let nextToken: string | null | undefined
  do {
    const page = await dataClient.models.FormatDef.list({
      limit: 500,
      nextToken,
    })
    if (page.errors?.length) throw new Error(page.errors[0].message)
    rows.push(...page.data)
    nextToken = page.nextToken
  } while (nextToken)
  return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export async function saveFormat(
  id: string,
  patch: Partial<FormatInput>,
): Promise<FormatDef> {
  const { data, errors } = await dataClient.models.FormatDef.update({
    id,
    ...patch,
  })
  if (errors?.length || !data) {
    throw new Error(errors?.[0]?.message ?? 'Format was not saved.')
  }
  return data
}

export async function createFormat(input: FormatInput): Promise<FormatDef> {
  const { data, errors } = await dataClient.models.FormatDef.create(input)
  if (errors?.length || !data) {
    throw new Error(errors?.[0]?.message ?? 'Format was not created.')
  }
  return data
}

export async function deleteFormat(id: string): Promise<void> {
  const { errors } = await dataClient.models.FormatDef.delete({ id })
  if (errors?.length) throw new Error(errors[0].message)
}
