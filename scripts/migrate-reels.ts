/**
 * Migrates existing data to the content type / subtype model (Reels first).
 * Writes through the GraphQL API as an admin user, like the seed script.
 *
 * What it does:
 *   1. FormatDef: sets contentType, subtype and assetCategory on every row
 *      (kind meme -> reel.green-screen, viral -> reel.tweet-style, other
 *      REEL rows -> reel.video-beats; carousel, image and story rows only get
 *      contentType).
 *   2. StockAsset: copies GreenScreenVideo and ViralVideo rows with the same
 *      ids and S3 keys, so ids stored in existing pieces still match.
 *
 * AppProfile rows are owner-scoped and cannot be read by an admin who does
 * not own them, so per-app reel settings are not copied here. The app and
 * the Lambda read the old memeConfig / viralConfig when reelConfig is empty.
 *
 * Idempotent. Old tables are left untouched.
 *   npm run migrate:reels -- --dry-run
 *   npm run migrate:reels -- --outputs outputs/main/amplify_outputs.json
 */
import {
  connectAsAdmin,
  disconnect,
  failure,
  outputsPathFrom,
} from './lib/admin-client'
import type { AdminClient } from './lib/admin-client'

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const outputsPath = outputsPathFrom(argv)

const CONTENT_TYPE: Record<string, string> = {
  REEL: 'reel',
  CAROUSEL: 'carousel',
  IMAGE: 'image',
  STORY: 'story',
}

interface FormatPlan {
  id: string
  contentType: string
  subtype: string
  assetCategory: string
}

function subtypeFor(
  igFormat: string | null | undefined,
  kind: string,
): { subtype: string; assetCategory: string } {
  if (igFormat !== 'REEL') return { subtype: '', assetCategory: '' }
  if (kind === 'meme') {
    return { subtype: 'reel.green-screen', assetCategory: 'green-screen' }
  }
  if (kind === 'viral') {
    return { subtype: 'reel.tweet-style', assetCategory: 'viral-clip' }
  }
  return { subtype: 'reel.video-beats', assetCategory: '' }
}

async function planFormats(client: AdminClient): Promise<FormatPlan[]> {
  const plans: FormatPlan[] = []
  let nextToken: string | null | undefined
  do {
    const page = await client.models.FormatDef.list({ limit: 500, nextToken })
    if (page.errors?.length) throw new Error(failure(page.errors))
    for (const row of page.data) {
      const contentType = CONTENT_TYPE[row.igFormat ?? ''] ?? ''
      const { subtype, assetCategory } = subtypeFor(row.igFormat, row.kind)
      if (
        row.contentType === contentType &&
        (row.subtype ?? '') === subtype &&
        (row.assetCategory ?? '') === assetCategory
      ) {
        continue
      }
      plans.push({ id: row.id, contentType, subtype, assetCategory })
    }
    nextToken = page.nextToken
  } while (nextToken)
  return plans
}

interface AssetPlan {
  id: string
  category: string
  title: string
  keywords: string[]
  assetKey: string
  durationSeconds?: number
  keyColor?: string
}

async function planAssets(client: AdminClient): Promise<AssetPlan[]> {
  const existing = new Set<string>()
  let nextToken: string | null | undefined
  do {
    const page = await client.models.StockAsset.list({ limit: 500, nextToken })
    if (page.errors?.length) throw new Error(failure(page.errors))
    for (const row of page.data) existing.add(row.id)
    nextToken = page.nextToken
  } while (nextToken)

  const plans: AssetPlan[] = []
  let greenToken: string | null | undefined
  do {
    const page = await client.models.GreenScreenVideo.list({
      limit: 500,
      nextToken: greenToken,
    })
    if (page.errors?.length) throw new Error(failure(page.errors))
    for (const row of page.data) {
      if (existing.has(row.id) || !row.videoKey) continue
      plans.push({
        id: row.id,
        category: 'green-screen',
        title: row.title,
        keywords: (row.keywords ?? []).filter((k): k is string => !!k),
        assetKey: row.videoKey,
        keyColor: row.keyColor,
      })
    }
    greenToken = page.nextToken
  } while (greenToken)

  let viralToken: string | null | undefined
  do {
    const page = await client.models.ViralVideo.list({
      limit: 500,
      nextToken: viralToken,
    })
    if (page.errors?.length) throw new Error(failure(page.errors))
    for (const row of page.data) {
      if (existing.has(row.id) || !row.videoKey) continue
      plans.push({
        id: row.id,
        category: 'viral-clip',
        title: row.title,
        keywords: (row.keywords ?? []).filter((k): k is string => !!k),
        assetKey: row.videoKey,
        durationSeconds: row.durationSeconds ?? undefined,
      })
    }
    viralToken = page.nextToken
  } while (viralToken)
  return plans
}

async function main() {
  const client = await connectAsAdmin(outputsPath)
  const formats = await planFormats(client)
  const assets = await planAssets(client)
  console.log(`Formats to update: ${formats.length}`)
  console.log(`Stock assets to copy: ${assets.length}`)
  if (dryRun) {
    console.log('Dry run, nothing written.')
    await disconnect()
    return
  }

  for (const plan of formats) {
    const result = await client.models.FormatDef.update({
      id: plan.id,
      contentType: plan.contentType,
      subtype: plan.subtype,
      assetCategory: plan.assetCategory,
    })
    if (result.errors?.length) throw new Error(failure(result.errors))
  }
  for (const plan of assets) {
    const result = await client.models.StockAsset.create({
      id: plan.id,
      category: plan.category,
      title: plan.title,
      keywords: plan.keywords,
      assetKey: plan.assetKey,
      mediaType: 'VIDEO',
      durationSeconds: plan.durationSeconds,
      keyColor: plan.keyColor,
      enabled: true,
    })
    if (result.errors?.length) throw new Error(failure(result.errors))
  }
  console.log(`Updated ${formats.length} formats, copied ${assets.length} assets.`)
  await disconnect()
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
