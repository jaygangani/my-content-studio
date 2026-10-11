import JSZip from 'jszip'
import { loadExportMedia } from '@/lib/export/media'
import { ensureOverlayFonts } from '@/lib/overlayText'
import { buildFrames, drawFrame, pieceStyles, surfaceFor } from '@/lib/render'
import type { Frame } from '@/lib/render'
import type { AssetItem } from '@/services/assets'
import type { PieceScript } from '@/types/script'

async function frameToPng(
  frame: Frame,
  width: number,
  height: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available.')
  const media = frame.media ? await loadExportMedia(frame.media) : null
  drawFrame(ctx, width, height, media, frame.segments, frame.scrim)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed.'))),
      'image/png',
    )
  })
}

/** One PNG per frame: 1080x1350 for carousels/images, 1080x1920 for stories. */
export async function renderPngs(
  script: PieceScript,
  assets: AssetItem[],
  onProgress: (fraction: number) => void,
): Promise<Blob[]> {
  const { width, height } = surfaceFor(script.schema)
  const frames = buildFrames(script, assets)
  await ensureOverlayFonts(pieceStyles(script))
  const out: Blob[] = []
  for (const [index, frame] of frames.entries()) {
    out.push(await frameToPng(frame, width, height))
    onProgress((index + 1) / frames.length)
  }
  return out
}

export async function zipFiles(
  files: Array<{ name: string; data: Blob | string }>,
): Promise<Blob> {
  const zip = new JSZip()
  for (const file of files) zip.file(file.name, file.data)
  return zip.generateAsync({ type: 'blob' })
}
