const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY as string | undefined

const PEXELS_SEARCH_URL = 'https://api.pexels.com/videos/search'

export interface PexelsVideoFile {
  id: number
  quality: string
  file_type: string
  width: number
  height: number
  link: string
}

export interface PexelsVideo {
  id: number
  width: number
  height: number
  duration: number
  image: string
  user: { name: string; url: string }
  video_files: PexelsVideoFile[]
}

export interface PexelsPick {
  video: PexelsVideo
  file: PexelsVideoFile
}

interface PexelsSearchResponse {
  videos: PexelsVideo[]
}

/** True when the Pexels key is configured for this build. */
export function hasPexelsKey(): boolean {
  return Boolean(PEXELS_API_KEY)
}

function isPortrait(file: PexelsVideoFile): boolean {
  return file.width > 0 && file.height > file.width
}

/**
 * Picks the best portrait MP4 for the 9:16 stage: prefer vertical files,
 * highest resolution up to 1920px tall, then the smallest acceptable one.
 */
function pickFile(video: PexelsVideo): PexelsVideoFile | null {
  const mp4s = video.video_files.filter((file) => file.file_type === 'video/mp4')
  const portrait = mp4s.filter(isPortrait)
  const candidates = portrait.length ? portrait : mp4s
  if (!candidates.length) return null

  const sorted = [...candidates].sort((a, b) => b.height - a.height)
  const notHuge = sorted.filter((file) => file.height <= 1920)
  return notHuge[0] ?? sorted[sorted.length - 1] ?? null
}

/**
 * Searches Pexels and returns every video that has a usable MP4 file, best
 * portrait file first per video.
 * Runs in the browser, so the API key is exposed to the client.
 */
export async function searchVideos(
  keyword: string,
  page = 1,
): Promise<PexelsPick[]> {
  if (!PEXELS_API_KEY) {
    throw new Error(
      'Pexels API key missing. Add VITE_PEXELS_API_KEY to your .env.local and restart the dev server.',
    )
  }

  const query = keyword.trim()
  if (!query) {
    throw new Error('This content has no video keywords to search Pexels.')
  }

  const params = new URLSearchParams({
    query,
    orientation: 'portrait',
    per_page: '15',
    page: String(page),
  })

  const response = await fetch(`${PEXELS_SEARCH_URL}?${params.toString()}`, {
    headers: { Authorization: PEXELS_API_KEY },
  })

  if (!response.ok) {
    throw new Error(`Pexels request failed (${response.status}).`)
  }

  const payload = (await response.json()) as PexelsSearchResponse
  const videos = Array.isArray(payload.videos) ? payload.videos : []

  return videos
    .map((video) => {
      const file = pickFile(video)
      return file ? { video, file } : null
    })
    .filter((pick): pick is PexelsPick => pick !== null)
}
