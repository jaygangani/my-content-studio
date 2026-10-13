import { dataClient, type Schema } from '@/lib/amplify'
import { deleteMedia, uploadMedia } from '@/services/storage'

export type GreenScreenVideo = Schema['GreenScreenVideo']['type']

export interface GreenScreenInput {
  title: string
  keywords: string[]
  keyColor: string
}

export async function listGreenScreenVideos(): Promise<GreenScreenVideo[]> {
  const { data, errors } = await dataClient.models.GreenScreenVideo.list({
    limit: 1000,
  })
  if (errors?.length) throw new Error(errors[0].message)
  return [...data].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
}

/** Uploads the video to S3, then records it in the library. */
export async function createGreenScreenVideo(
  file: File,
  input: GreenScreenInput,
): Promise<GreenScreenVideo> {
  const videoKey = await uploadMedia(file, 'greenscreen')
  const { data, errors } = await dataClient.models.GreenScreenVideo.create({
    ...input,
    videoKey,
  })
  if (errors?.length || !data) {
    await deleteMedia(videoKey).catch(() => undefined)
    throw new Error(errors?.[0]?.message ?? 'Video was not saved.')
  }
  return data
}

export async function updateGreenScreenVideo(
  id: string,
  input: GreenScreenInput,
): Promise<GreenScreenVideo> {
  const { data, errors } = await dataClient.models.GreenScreenVideo.update({
    id,
    ...input,
  })
  if (errors?.length || !data) {
    throw new Error(errors?.[0]?.message ?? 'Video was not saved.')
  }
  return data
}

/** Deletes the library row and its S3 object. */
export async function deleteGreenScreenVideo(
  video: GreenScreenVideo,
): Promise<void> {
  const { errors } = await dataClient.models.GreenScreenVideo.delete({
    id: video.id,
  })
  if (errors?.length) throw new Error(errors[0].message)
  await deleteMedia(video.videoKey).catch(() => undefined)
}
