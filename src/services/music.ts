const JAMENDO_CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID as
  | string
  | undefined

const JAMENDO_SEARCH_URL = 'https://api.jamendo.com/v3.0/tracks/'

export interface MusicTrack {
  id: string
  name: string
  artist: string
  album: string
  audio: string
  duration: number
  image: string
}

interface JamendoTrack {
  id: string
  name: string
  artist_name: string
  album_name: string
  audio: string
  duration: number
  image: string
}

interface JamendoResponse {
  results: JamendoTrack[]
}

/** True when the Jamendo client id is configured for this build. */
export function hasMusicKey(): boolean {
  return Boolean(JAMENDO_CLIENT_ID)
}

/**
 * Searches Jamendo for tracks matching the content's audio config.
 * Runs in the browser, so the client id is exposed to the client.
 */
export async function searchTracks(
  query: string,
  limit = 10,
): Promise<MusicTrack[]> {
  if (!JAMENDO_CLIENT_ID) {
    throw new Error(
      'Jamendo client id missing. Add VITE_JAMENDO_CLIENT_ID to your .env.local and restart the dev server.',
    )
  }

  const search = query.trim()
  if (!search) {
    throw new Error('This content has no audio config to search music for.')
  }

  const params = new URLSearchParams({
    client_id: JAMENDO_CLIENT_ID,
    format: 'json',
    limit: String(limit),
    search,
    audioformat: 'mp32',
    include: 'musicinfo',
  })

  const response = await fetch(`${JAMENDO_SEARCH_URL}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Jamendo request failed (${response.status}).`)
  }

  const payload = (await response.json()) as JamendoResponse
  const results = Array.isArray(payload.results) ? payload.results : []

  return results
    .filter((track) => Boolean(track.audio))
    .map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artist_name,
      album: track.album_name,
      audio: track.audio,
      duration: track.duration,
      image: track.image,
    }))
}
