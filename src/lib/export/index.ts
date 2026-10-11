import { exportReel } from '@/lib/export/reel'
import { renderPngs, zipFiles } from '@/lib/export/images'
import type { AssetItem } from '@/services/assets'
import { scriptCaption, scriptHashtags } from '@/types/script'
import type { PieceScript } from '@/types/script'

export interface ExportResult {
  blob: Blob
  filename: string
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app'
  )
}

function datePart(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}${m}${d}`
}

/** Caption, hashtags and Instagram sticker notes as one copyable block. */
export function captionBlock(script: PieceScript): string {
  const parts = [scriptCaption(script)]
  const tags = scriptHashtags(script)
  if (tags.length) parts.push(tags.join(' '))
  if (script.schema === 'STORY') {
    const stickers = script.payload.frames
      .map((frame, index) =>
        frame.sticker && frame.sticker !== 'none'
          ? `Frame ${index + 1}: ${frame.sticker} sticker, "${frame.sticker_text}"${
              frame.options.length ? ` (${frame.options.join(' / ')})` : ''
            }`
          : null,
      )
      .filter((line): line is string => line !== null)
    if (stickers.length) parts.push(`Stickers to add in Instagram:\n${stickers.join('\n')}`)
  }
  return parts.filter(Boolean).join('\n\n')
}

export function exportBaseName(appName: string, script: PieceScript): string {
  return `${slug(appName)}-format${script.formatId}-${datePart()}`
}

/** Exports one approved piece in its native format. */
export async function exportPiece(
  appName: string,
  script: PieceScript,
  assets: AssetItem[],
  onProgress: (fraction: number) => void,
): Promise<ExportResult> {
  const base = exportBaseName(appName, script)

  if (script.schema === 'REEL') {
    return {
      blob: await exportReel(script, assets, onProgress),
      filename: `${base}.mp4`,
    }
  }

  const pngs = await renderPngs(script, assets, onProgress)
  if (script.schema === 'IMAGE') {
    return { blob: pngs[0], filename: `${base}.png` }
  }

  const files: Array<{ name: string; data: Blob | string }> = pngs.map(
    (data, index) => ({
      name: `${base}-${String(index + 1).padStart(2, '0')}.png`,
      data,
    }),
  )
  files.push({ name: `${base}-caption.txt`, data: captionBlock(script) })
  return { blob: await zipFiles(files), filename: `${base}.zip` }
}
