import { dataClient, type Schema } from '@/lib/amplify'
import { deleteMedia, uploadMedia } from '@/services/storage'

export type ViralVideo = Schema['ViralVideo']['type']

export interface ViralInput {
  title: string
  keywords: string[]
  durationSeconds: number
}

export async function listViralVideos(): Promise<ViralVideo[]> {
  const { data, errors } = await dataClient.models.ViralVideo.list({ limit: 1000 })
  if (errors?.length) throw new Error(errors[0].message)
  return [...data].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
}

/** Reads the duration of a local video file in the browser. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const done = (value: number) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    video.addEventListener('loadedmetadata', () =>
      done(Number.isFinite(video.duration) ? video.duration : 0),
    )
    video.addEventListener('error', () => done(0))
    video.src = url
  })
}

/** Uploads the clip to S3 under media/viral/, then records it in the library. */
export async function createViralVideo(
  file: File,
  input: ViralInput,
): Promise<ViralVideo> {
  const videoKey = await uploadMedia(file, 'viral')
  const { data, errors } = await dataClient.models.ViralVideo.create({
    ...input,
    videoKey,
  })
  if (errors?.length || !data) {
    await deleteMedia(videoKey).catch(() => undefined)
    throw new Error(errors?.[0]?.message ?? 'Video was not saved.')
  }
  return data
}

export async function updateViralVideo(
  id: string,
  input: Pick<ViralInput, 'title' | 'keywords'>,
): Promise<ViralVideo> {
  const { data, errors } = await dataClient.models.ViralVideo.update({
    id,
    ...input,
  })
  if (errors?.length || !data) {
    throw new Error(errors?.[0]?.message ?? 'Video was not saved.')
  }
  return data
}

export async function deleteViralVideo(video: ViralVideo): Promise<void> {
  const { errors } = await dataClient.models.ViralVideo.delete({ id: video.id })
  if (errors?.length) throw new Error(errors[0].message)
  await deleteMedia(video.videoKey).catch(() => undefined)
}
