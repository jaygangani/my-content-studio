import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { RefObject } from 'react'
import { Loader2, Pause, Play, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { searchVideos } from '@/services/pexels'
import type { PexelsPick } from '@/services/pexels'
import { searchTracks } from '@/services/music'
import type { MusicTrack } from '@/services/music'
import { updateContent } from '@/services/content'
import type { ContentItem } from '@/services/content'
import { audioQuery, parseAudioConfig, parseOverlayTimeline, segmentAt } from '@/types/content'
import type { OverlaySegment } from '@/types/content'

interface ContentRendererProps {
  content: ContentItem
  ref?: RefObject<ContentRendererHandle | null>
  onRenderState?: (state: {
    canRender: boolean
    rendering: boolean
  }) => void
}

export interface ContentRendererHandle {
  render: () => void
}

interface AudioGraph {
  ctx: AudioContext
  musicGain: GainNode
  destination: MediaStreamAudioDestinationNode
}

type VerticalAlign = 'top' | 'center' | 'bottom'
type HorizontalAlign = 'left' | 'center' | 'right'

const VIDEO_LENGTH_PRESETS = [5, 10, 15, 20] as const

function alignment(position: string): {
  vertical: VerticalAlign
  horizontal: HorizontalAlign
} {
  const value = position.toLowerCase()
  const vertical: VerticalAlign = value.includes('top')
    ? 'top'
    : value.includes('bottom')
      ? 'bottom'
      : 'center'
  const horizontal: HorizontalAlign = value.includes('left')
    ? 'left'
    : value.includes('right')
      ? 'right'
      : 'center'
  return { vertical, horizontal }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
) {
  const vw = video.videoWidth || width
  const vh = video.videoHeight || height
  const scale = Math.max(width / vw, height / vh)
  const dw = vw * scale
  const dh = vh * scale
  ctx.drawImage(video, (width - dw) / 2, (height - dh) / 2, dw, dh)
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  segment: OverlaySegment,
  width: number,
  height: number,
) {
  const fontSize = Math.round(width * 0.055)
  const lineHeight = Math.round(fontSize * 1.28)
  const maxWidth = width * 0.82
  ctx.font = `600 ${fontSize}px "Geist Variable", system-ui, sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'

  const lines = wrapLines(ctx, segment.text, maxWidth)
  const padX = Math.round(fontSize * 0.75)
  const padY = Math.round(fontSize * 0.55)
  const boxWidth = Math.min(
    Math.max(...lines.map((line) => ctx.measureText(line).width)) + padX * 2,
    width - width * 0.06,
  )
  const boxHeight = lines.length * lineHeight + padY * 2 - (lineHeight - fontSize)

  const { vertical, horizontal } = alignment(segment.screen_position)
  const marginX = (width - boxWidth) / 2
  const marginY =
    vertical === 'top'
      ? height * 0.12
      : vertical === 'bottom'
        ? height - boxHeight - height * 0.16
        : (height - boxHeight) / 2
  const x =
    horizontal === 'left'
      ? width * 0.06
      : horizontal === 'right'
        ? width - boxWidth - width * 0.06
        : marginX
  const textCenterX =
    horizontal === 'left'
      ? x + boxWidth / 2
      : horizontal === 'right'
        ? x + boxWidth / 2
        : width / 2

  ctx.fillStyle = 'rgba(3, 3, 3, 0.55)'
  ctx.beginPath()
  ctx.roundRect(x, marginY, boxWidth, boxHeight, Math.round(width * 0.02))
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  lines.forEach((line, index) => {
    ctx.fillText(line, textCenterX, marginY + padY + index * lineHeight)
  })
}

function sanitizeFilePart(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'content'
  )
}

function parseVideoConfig(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {}
  let parsed: unknown = value
  if (typeof value === 'string') {
    if (!value.trim()) return {}
    try {
      parsed = JSON.parse(value)
    } catch {
      return {}
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return {}
  return parsed as Record<string, unknown>
}

/**
 * 9:16 stage that plays the first Pexels video for the content's keywords,
 * overlays the saved text timeline, and renders a downloadable file with the
 * overlays burned in.
 */
export function ContentRenderer({
  content,
  ref,
  onRenderState,
}: ContentRendererProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioGraphRef = useRef<AudioGraph | null>(null)
  const savedSegments = useMemo(
    () => parseOverlayTimeline(content.overlayText),
    [content.overlayText],
  )

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null)
  const [results, setResults] = useState<PexelsPick[]>([])
  const [resultIndex, setResultIndex] = useState(0)
  const [keywordIndex, setKeywordIndex] = useState(0)
  const [page, setPage] = useState(1)
  const [keywordList, setKeywordList] = useState<string[]>(() =>
    (content.videoKeywords ?? []).filter(
      (keyword): keyword is string => Boolean(keyword),
    ),
  )
  const [keywordInput, setKeywordInput] = useState('')
  const [keywordsError, setKeywordsError] = useState<string | null>(null)
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [trackIndex, setTrackIndex] = useState(0)
  const [musicPage, setMusicPage] = useState(1)
  const [trackLoading, setTrackLoading] = useState(true)
  const [trackError, setTrackError] = useState<string | null>(null)
  const [musicVolume, setMusicVolume] = useState(0.8)
  const initialVideoConfig = useMemo(
    () => parseVideoConfig(content.videoConfigurations),
    [content.videoConfigurations],
  )
  const [finalDuration, setFinalDurationState] = useState<number | null>(() => {
    const saved = initialVideoConfig.duration
    return typeof saved === 'number' && Number.isFinite(saved) && saved > 0
      ? Math.min(20, saved)
      : null
  })
  const [scrubbing, setScrubbing] = useState(false)
  const [scrubValue, setScrubValue] = useState<number | null>(null)
  const [segments, setSegments] = useState<OverlaySegment[]>(savedSegments)
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(savedSegments),
  )
  const [savingTimings, setSavingTimings] = useState(false)
  const [timingsError, setTimingsError] = useState<string | null>(null)
  const [timingsSaved, setTimingsSaved] = useState(false)
  const [newSegmentText, setNewSegmentText] = useState('')
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null)
  const [segmentEditText, setSegmentEditText] = useState('')
  const [durationError, setDurationError] = useState<string | null>(null)

  const totalLength = finalDuration ?? (duration || 0)

  useEffect(() => {
    setSegments(savedSegments)
    setBaseline(JSON.stringify(savedSegments))
    setTimingsSaved(false)
    setTimingsError(null)
  }, [savedSegments])

  useEffect(() => {
    if (!finalDuration || finalDuration <= 0) return
    setSegments((prev) => {
      let changed = false
      const next = prev.map((segment) => {
        const start = Math.min(
          segment.start_time_sec,
          Math.max(0, finalDuration - 0.5),
        )
        const end = Math.min(segment.end_time_sec, finalDuration)
        if (
          start === segment.start_time_sec &&
          end === segment.end_time_sec &&
          segment.duration_sec === Math.max(0, end - start)
        ) {
          return segment
        }
        changed = true
        return {
          ...segment,
          start_time_sec: start,
          end_time_sec: end,
          duration_sec: Math.max(0, end - start),
        }
      })
      return changed ? next : prev
    })
  }, [finalDuration])

  const setFinalDuration = (value: number | null) => {
    setFinalDurationState(value)
    setDurationError(null)
    const nextConfig = { ...initialVideoConfig }
    if (value === null) {
      delete nextConfig.duration
    } else {
      nextConfig.duration = value
    }
    void updateContent({
      id: content.id,
      videoConfigurations: JSON.stringify(nextConfig),
    }).catch((err) => {
      setDurationError(
        err instanceof Error ? err.message : 'Failed to save duration',
      )
    })
  }

  const dirty = JSON.stringify(segments) !== baseline

  const updateTiming = (
    segmentId: number,
    field: 'start_time_sec' | 'end_time_sec',
    rawValue: string,
  ) => {
    let value = Number(rawValue)
    if (Number.isNaN(value) || value < 0) return
    if (totalLength > 0) value = Math.min(value, totalLength)
    setTimingsSaved(false)
    setSegments((prev) =>
      prev.map((segment) => {
        if (segment.segment_id !== segmentId) return segment
        const start =
          field === 'start_time_sec' ? value : segment.start_time_sec
        const end = field === 'end_time_sec' ? value : segment.end_time_sec
        const safeEnd = Math.max(start, end)
        return {
          ...segment,
          start_time_sec: start,
          end_time_sec: safeEnd,
          duration_sec: Math.max(0, safeEnd - start),
        }
      }),
    )
  }

  const saveTimings = async () => {
    setSavingTimings(true)
    setTimingsError(null)
    try {
      const json = JSON.stringify({ overlay_text_timeline: segments })
      await updateContent({ id: content.id, overlayText: json })
      setBaseline(JSON.stringify(segments))
      setTimingsSaved(true)
    } catch (err) {
      setTimingsError(
        err instanceof Error ? err.message : 'Failed to save timings',
      )
    } finally {
      setSavingTimings(false)
    }
  }

  const resetTimings = () => {
    setSegments(savedSegments)
    setTimingsSaved(false)
    setTimingsError(null)
    setEditingSegmentId(null)
  }

  const addSegment = () => {
    const text = newSegmentText.trim()
    if (!text) return
    const nextId =
      segments.reduce((max, segment) => Math.max(max, segment.segment_id), 0) +
      1
    const lastEnd = segments.reduce(
      (max, segment) => Math.max(max, segment.end_time_sec),
      0,
    )
    const total = totalLength
    const start = total ? Math.min(lastEnd, total) : lastEnd
    const end = total
      ? Math.max(start + 1, Math.min(start + 3, total))
      : start + 3
    const segment: OverlaySegment = {
      segment_id: nextId,
      text,
      start_time_sec: start,
      end_time_sec: end,
      duration_sec: Math.max(0, end - start),
      screen_position: 'Center',
    }
    setTimingsSaved(false)
    setSegments((prev) =>
      [...prev, segment].sort((a, b) => a.start_time_sec - b.start_time_sec),
    )
    setNewSegmentText('')
  }

  const removeSegment = (segmentId: number) => {
    setTimingsSaved(false)
    setEditingSegmentId((current) =>
      current === segmentId ? null : current,
    )
    setSegments((prev) =>
      prev.filter((segment) => segment.segment_id !== segmentId),
    )
  }

  const updateSegmentText = (segmentId: number, text: string) => {
    const next = text.trim()
    setTimingsSaved(false)
    setSegments((prev) =>
      prev.map((segment) =>
        segment.segment_id === segmentId && next
          ? { ...segment, text: next }
          : segment,
      ),
    )
  }

  const commitSegmentEdit = () => {
    if (editingSegmentId === null) return
    if (segmentEditText.trim()) updateSegmentText(editingSegmentId, segmentEditText)
    setEditingSegmentId(null)
  }

  const keywords = useMemo(
    () =>
      keywordList.filter((keyword): keyword is string => Boolean(keyword)),
    [keywordList],
  )

  useEffect(() => {
    setKeywordList(
      (content.videoKeywords ?? []).filter(
        (keyword): keyword is string => Boolean(keyword),
      ),
    )
  }, [content.videoKeywords])

  const persistKeywords = async (next: string[]) => {
    setKeywordList(next)
    try {
      await updateContent({ id: content.id, videoKeywords: next })
      setKeywordsError(null)
    } catch (err) {
      setKeywordsError(
        err instanceof Error ? err.message : 'Failed to save keywords',
      )
    }
  }

  const addKeywords = () => {
    const items = keywordInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    if (!items.length) return
    void persistKeywords([...new Set([...keywords, ...items])])
    setKeywordInput('')
  }

  const removeKeyword = (keyword: string) => {
    void persistKeywords(keywords.filter((item) => item !== keyword))
  }

  const commitKeywordEdit = () => {
    if (editingKeyword === null) return
    const nextValue = editValue.trim()
    if (!nextValue) {
      removeKeyword(editingKeyword)
    } else if (nextValue !== editingKeyword) {
      void persistKeywords(
        keywords.map((item) => (item === editingKeyword ? nextValue : item)),
      )
    }
    setEditingKeyword(null)
  }

  const musicQuery = useMemo(
    () => audioQuery(parseAudioConfig(content.audioConfig)),
    [content.audioConfig],
  )

  const loadKeyword = useCallback(
    async (index: number, pageArg = 1) => {
      setLoading(true)
      setLoadError(null)
      setPlaying(false)
      setCurrentTime(0)
      setRenderedUrl(null)
      lastTimeRef.current = 0
      try {
        if (!keywords.length) {
          throw new Error('This content has no video keywords to search Pexels.')
        }
        const total = keywords.length
        const nextIndex = ((index % total) + total) % total
        const picks = await searchVideos(keywords[nextIndex], pageArg)
        setResults(picks)
        setResultIndex(0)
        setKeywordIndex(nextIndex)
        setPage(pageArg)
        if (!picks.length) {
          setLoadError(
            `No videos found for "${keywords[nextIndex]}" (page ${pageArg}).`,
          )
        }
      } catch (err) {
        setResults([])
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load video',
        )
      } finally {
        setLoading(false)
      }
    },
    [keywords],
  )

  useEffect(() => {
    void loadKeyword(0, 1)
  }, [loadKeyword])

  const pick = results[resultIndex] ?? null

  const playbackLimit = () =>
    finalDuration && finalDuration > 0
      ? duration
        ? Math.min(finalDuration, duration)
        : finalDuration
      : duration || null

  const seekTo = (raw: number) => {
    const video = videoRef.current
    if (!video) return
    const limit = playbackLimit()
    const value = limit !== null ? Math.min(Math.max(0, raw), limit) : Math.max(0, raw)
    setScrubbing(true)
    setScrubValue(value)
    video.currentTime = value
    if (video.paused) {
      lastTimeRef.current = value
      setCurrentTime(value)
    }
  }

  /** Jumps to the next keyword every click, cycling all of them. */
  const nextVideo = () => {
    if (!keywords.length) return
    const nextIndex = (keywordIndex + 1) % keywords.length
    const nextPage = nextIndex === 0 ? page + 1 : 1
    void loadKeyword(nextIndex, nextPage)
  }

  const loadTracks = useCallback(
    async (nextPage = 1) => {
      setTrackLoading(true)
      setTrackError(null)
      try {
        if (!musicQuery) {
          throw new Error(
            'This content has no audio config to search music for.',
          )
        }
        const found = await searchTracks(musicQuery, 10, nextPage)
        setTracks(found)
        setTrackIndex(0)
        setMusicPage(nextPage)
        if (!found.length) {
          setTrackError(
            `No tracks found for "${musicQuery}" (page ${nextPage}).`,
          )
        }
      } catch (err) {
        setTracks([])
        setTrackError(
          err instanceof Error ? err.message : 'Failed to load music',
        )
      } finally {
        setTrackLoading(false)
      }
    },
    [musicQuery],
  )

  useEffect(() => {
    void loadTracks()
  }, [loadTracks])

  const track = tracks[trackIndex] ?? null

  /** Next loaded track; once wrapped, fetches the next Jamendo page. */
  const nextTrack = () => {
    if (!tracks.length) {
      void loadTracks()
      return
    }
    if (trackIndex + 1 < tracks.length) {
      setTrackIndex(trackIndex + 1)
      return
    }
    void loadTracks(musicPage + 1)
  }

  const lastTimeRef = useRef(0)

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      const video = videoRef.current
      if (video) {
        const limit = finalDuration && finalDuration > 0 ? finalDuration : null
        const time = video.currentTime
        if (limit !== null && time >= limit) {
          video.pause()
          video.currentTime = limit
          audioRef.current?.pause()
          lastTimeRef.current = limit
          setCurrentTime(limit)
          setScrubbing(false)
          setScrubValue(null)
          frame = 0
          return
        }
        if (Math.abs(time - lastTimeRef.current) >= 0.1) {
          lastTimeRef.current = time
          setCurrentTime(time)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, finalDuration])

  /**
   * Builds a Web Audio graph once so only the music track is mixed and
   * captured into a recordable track. The source video plays as a silent
   * background visual. Returns null when the browser refuses (e.g. a
   * non-CORS media source).
   */
  const ensureAudioGraph = useCallback((): AudioGraph | null => {
    if (audioGraphRef.current) return audioGraphRef.current
    const audio = audioRef.current
    if (!audio) return null
    try {
      const ctx = new AudioContext()
      const musicGain = ctx.createGain()
      ctx.createMediaElementSource(audio).connect(musicGain)
      musicGain.connect(ctx.destination)
      const destination = ctx.createMediaStreamDestination()
      musicGain.connect(destination)
      musicGain.gain.value = musicVolume
      const graph: AudioGraph = { ctx, musicGain, destination }
      audioGraphRef.current = graph
      return graph
    } catch {
      return null
    }
  }, [musicVolume])

  useEffect(() => {
    const graph = audioGraphRef.current
    if (graph) {
      graph.musicGain.gain.value = musicVolume
      return
    }
    if (audioRef.current) audioRef.current.volume = musicVolume
  }, [musicVolume])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    const audio = audioRef.current
    const graph = ensureAudioGraph()
    if (graph && graph.ctx.state === 'suspended') {
      void graph.ctx.resume()
    }
    if (video.paused) {
      const limit = playbackLimit()
      if (limit !== null && video.currentTime >= limit) {
        video.currentTime = 0
        lastTimeRef.current = 0
        setCurrentTime(0)
      }
      if (audio && track) {
        audio.currentTime = 0
        void audio.play()
      }
      void video.play()
    } else {
      video.pause()
      audio?.pause()
    }
  }

  const renderWithOverlays = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    if (typeof MediaRecorder === 'undefined') {
      setRenderError('This browser cannot record video (MediaRecorder missing).')
      return
    }

    setRendering(true)
    setRenderError(null)
    setRenderProgress(0)
    setRenderedUrl(null)

    const width = 1080
    const height = 1920
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setRendering(false)
      setRenderError('Could not create a 2D canvas context.')
      return
    }

    const stream = canvas.captureStream(30)
    let audioCaptured = false
    const graph = ensureAudioGraph()
    if (graph) {
      if (graph.ctx.state === 'suspended') await graph.ctx.resume()
      const mixed = graph.destination.stream.getAudioTracks()
      mixed.forEach((track: MediaStreamTrack) => {
        stream.addTrack(track)
        audioCaptured = true
      })
    }
    if (!audioCaptured) {
      setRenderError(
        'Could not mix audio into the render (browser blocked media capture). The render will be silent.',
      )
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const chunks: BlobPart[] = []
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    })
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }

    const total = finalDuration && finalDuration > 0 ? finalDuration : duration
    if (!total || total <= 0) {
      setRendering(false)
      setRenderError('No usable duration. Load the video or set a final duration.')
      return
    }

    const draw = (atTime: number) => {
      if (!videoRef.current) return
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#030303'
      ctx.fillRect(0, 0, width, height)
      drawCover(ctx, videoRef.current, width, height)
      const segment = segmentAt(segments, atTime)
      if (segment) drawOverlay(ctx, segment, width, height)
    }

    let frame = 0
    const startTime = performance.now()
    const renderLoop = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed >= total) {
        cancelAnimationFrame(frame)
        draw(total)
        audioRef.current?.pause()
        if (videoRef.current) videoRef.current.pause()
        if (recorder.state !== 'inactive') recorder.stop()
        return
      }
      draw(elapsed)
      setRenderProgress(elapsed / total)
      frame = requestAnimationFrame(renderLoop)
    }

    try {
      const audio = audioRef.current
      video.pause()
      video.currentTime = 0
      if (audio) {
        audio.pause()
        audio.currentTime = 0
        audio.loop = true
      }
      await video.play()
      if (audio && track) void audio.play()
      recorder.start(100)
      renderLoop()

      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
      })
      const url = URL.createObjectURL(blob)
      setRenderedUrl(url)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${sanitizeFilePart(content.title)}-rendered.webm`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (err) {
      cancelAnimationFrame(frame)
      if (recorder.state !== 'inactive') recorder.stop()
      setRenderError(
        err instanceof Error
          ? `${err.message} The Pexels file may not allow canvas capture (CORS).`
          : 'Failed to render the video.',
      )
    } finally {
      if (audioRef.current) audioRef.current.loop = false
      setRendering(false)
    }
  }, [content.title, duration, ensureAudioGraph, finalDuration, segments, track])

  useImperativeHandle(
    ref,
    () => ({
      render: () => {
        void renderWithOverlays()
      },
    }),
    [renderWithOverlays],
  )

  useEffect(() => {
    onRenderState?.({ canRender: Boolean(pick) && !rendering, rendering })
  }, [onRenderState, pick, rendering])

  const overlayTime =
    finalDuration && finalDuration > 0
      ? Math.min(currentTime, finalDuration)
      : currentTime
  const activeSegment = segmentAt(segments, overlayTime)
  const displayTime = scrubbing && scrubValue !== null ? scrubValue : currentTime

  return (
    <div className="flex flex-col gap-8 lg:h-[calc(100dvh-9rem)] lg:flex-row-reverse lg:gap-8 lg:overflow-hidden">
      <div className="flex w-full flex-col lg:w-[420px] lg:shrink-0">
        <div
          className="relative mx-auto aspect-9/16 w-full overflow-hidden rounded-lg border border-hairline bg-ink [container-type:size]"
          style={{ width: 'min(420px, calc((100dvh - 16rem) * 9 / 16))' }}>
          {pick ? (
            <>
              <video
                ref={videoRef}
                src={pick.file.link}
                poster={pick.video.image}
                crossOrigin="anonymous"
                muted
                playsInline
                className="size-full object-cover"
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                  setPlaying(false)
                  audioRef.current?.pause()
                }}
              />
              {activeSegment ? (
                <div className="pointer-events-none absolute inset-0 flex justify-center p-[6cqw]">
                  <p
                    className={
                      activeSegment.screen_position
                        .toLowerCase()
                        .includes('top')
                        ? 'self-start w-fit max-w-[85cqw] rounded-md bg-[rgba(3,3,3,0.55)] px-[4.125cqw] py-[3.025cqw] text-center text-[5.5cqw] leading-[7.04cqw] font-semibold text-white'
                        : activeSegment.screen_position
                              .toLowerCase()
                              .includes('bottom')
                          ? 'self-end w-fit max-w-[85cqw] rounded-md bg-[rgba(3,3,3,0.55)] px-[4.125cqw] py-[3.025cqw] text-center text-[5.5cqw] leading-[7.04cqw] font-semibold text-white'
                          : 'self-center w-fit max-w-[85cqw] rounded-md bg-[rgba(3,3,3,0.55)] px-[4.125cqw] py-[3.025cqw] text-center text-[5.5cqw] leading-[7.04cqw] font-semibold text-white'
                    }
                  >
                    {activeSegment.text}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex size-full items-center justify-center p-6 text-center text-sm text-ash">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Finding a video…
                </span>
              ) : (
                <span>{loadError ?? 'No video.'}</span>
              )}
            </div>
          )}
        </div>

        <audio
          ref={audioRef}
          src={track?.audio ?? undefined}
          crossOrigin="anonymous"
          preload="auto"
          className="hidden"
          onError={() => {
            setTrackError('This track could not be loaded — fetching another.')
            if (track) nextTrack()
            else void loadTracks()
          }}
        />

        {duration ? (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={togglePlay}
                disabled={!pick}
                aria-label={playing ? 'Pause' : 'Play'}
                className="size-8 shrink-0 rounded-full"
              >
                {playing ? <Pause /> : <Play />}
              </Button>
              <input
                type="range"
                min={0}
                max={(finalDuration ?? duration).toFixed(1)}
                step={0.01}
                value={displayTime}
                onInput={(e) => seekTo(Number(e.currentTarget.value))}
                onPointerUp={() => setScrubbing(false)}
                onKeyUp={() => setScrubbing(false)}
                className="w-full cursor-pointer accent-ink"
                aria-label="Seek through the video"
              />
              <p className="w-16 shrink-0 text-right text-xs text-slate">
                {displayTime.toFixed(1)}s{' '}
                <span className="text-graphite">
                  /{(finalDuration ?? duration).toFixed(1)}s
                </span>
              </p>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate">
              <label className="flex items-center gap-1.5">
                Final duration
                <input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={finalDuration ?? ''}
                  placeholder={duration ? String(duration.toFixed(1)) : ''}
                  onChange={(e) =>
                    setFinalDuration(
                      e.target.value === ''
                        ? null
                        : Math.min(20, Math.max(0.5, Number(e.target.value))),
                    )
                  }
                  className="w-16 rounded-md border border-hairline bg-canvas px-2 py-0.5 text-sm text-ink outline-none focus:border-ink"
                />
                s
              </label>
              <span className="flex items-center gap-1">
                {VIDEO_LENGTH_PRESETS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setFinalDuration(seconds)}
                    className={
                      finalDuration === seconds
                        ? 'rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium text-white'
                        : 'rounded-full border border-hairline px-2.5 py-0.5 text-[11px] text-graphite transition-colors hover:border-ink hover:text-ink'
                    }
                  >
                    {seconds}s
                  </button>
                ))}
              </span>
              {finalDuration !== null ? (
                <span className="truncate text-graphite">
                  · text stops after {finalDuration.toFixed(1)}s
                  <button
                    type="button"
                    onClick={() => setFinalDuration(null)}
                    className="ml-1 underline underline-offset-2 hover:text-ink"
                  >
                    use video
                  </button>
                </span>
              ) : null}
              {durationError ? (
                <span className="text-ink">{durationError}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {renderError ? (
          <p className="mt-4 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
            {renderError}
          </p>
        ) : null}

        {rendering ? (
          <p className="mt-4 text-sm text-graphite">
            Rendering with overlays… {Math.round(renderProgress * 100)}%
          </p>
        ) : null}

        {renderedUrl ? (
          <a
            href={renderedUrl}
            download={`${sanitizeFilePart(content.title)}-rendered.webm`}
            className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-4"
          >
            Download again
          </a>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:overflow-hidden">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow text-slate">preview</p>
          <h2 className="text-heading-sm line-clamp-1">
            {content.title}
          </h2>
        </div>

        {content.caption ? (
          <div>
            <p className="micro-caps text-slate">Caption</p>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed whitespace-pre-wrap text-graphite">
              {content.caption}
            </p>
          </div>
        ) : null}

        <div>
          <p className="micro-caps text-slate">Hashtags</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {content.hashtags?.filter((tag): tag is string => Boolean(tag))
              .length ? (
              content.hashtags
                .filter((tag): tag is string => Boolean(tag))
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-hairline px-3 py-1 text-xs text-graphite"
                  >
                    #{tag.replace(/^#/, '')}
                  </span>
                ))
            ) : (
              <p className="text-sm text-graphite">No hashtags.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="micro-caps text-slate">Video keywords</p>
            <Button
              type="button"
              variant="outline"
              onClick={nextVideo}
              disabled={loading || !keywords.length}
              className="h-8 rounded-full px-4 text-xs"
            >
              <RefreshCw /> New video
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.length ? (
              keywords.map((keyword) =>
                editingKeyword === keyword ? (
                  <Input
                    key={keyword}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitKeywordEdit}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitKeywordEdit()
                      if (e.key === 'Escape') setEditingKeyword(null)
                    }}
                    className="h-7 w-32 rounded-full border-hairline-soft px-2 text-xs"
                  />
                ) : (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2 py-0.5 text-xs text-graphite"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKeyword(keyword)
                        setEditValue(keyword)
                      }}
                      title="Edit keyword"
                      className="transition-colors hover:text-ink"
                    >
                      {keyword}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      aria-label={`Remove ${keyword}`}
                      className="text-slate transition-colors hover:text-ink"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ),
              )
            ) : (
              <p className="text-sm text-graphite">No keywords yet.</p>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addKeywords()
                }
              }}
              placeholder="Add keyword (comma separated)"
              className="h-8 rounded-md border-hairline-soft px-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addKeywords}
              className="h-8 rounded-full px-4 text-xs"
            >
              Add
            </Button>
          </div>
          {keywordsError ? (
            <p className="mt-2 text-xs text-slate">{keywordsError}</p>
          ) : null}
          {keywordIndex > 0 ? (
            <p className="mt-2 text-xs text-slate">
              Keyword {keywordIndex + 1}/{keywords.length} ·{' '}
              <span className="text-graphite">
                "{keywords[keywordIndex % keywords.length]}"
              </span>
              {page > 1 ? ` · page ${page}` : ''}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="micro-caps text-slate">Overlay timeline</p>
            {dirty || timingsSaved ? (
              <div className="flex items-center gap-3">
                {timingsSaved && !dirty ? (
                  <span className="text-xs text-slate">Saved.</span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetTimings}
                  disabled={!dirty}
                  className="h-8 rounded-full px-4 text-xs"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveTimings()}
                  disabled={!dirty || savingTimings}
                  className="h-8 rounded-full px-4 text-xs"
                >
                  {savingTimings ? 'Saving…' : 'Save timeline'}
                </Button>
              </div>
            ) : null}
          </div>

          {timingsError ? (
            <p className="mt-3 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {timingsError}
            </p>
          ) : null}

          <ul className="mt-2 flex flex-col gap-1.5">
            {segments.length ? (
              segments.map((segment, index) => (
                <li
                  key={segment.segment_id}
                  className="flex items-center gap-2 rounded-md border border-hairline px-3 py-2 text-sm text-graphite"
                >
                  {editingSegmentId === segment.segment_id ? (
                    <Input
                      value={segmentEditText}
                      onChange={(e) => setSegmentEditText(e.target.value)}
                      onBlur={commitSegmentEdit}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitSegmentEdit()
                        if (e.key === 'Escape') setEditingSegmentId(null)
                      }}
                      aria-label={`Edit overlay text ${index + 1}`}
                      className="h-7 min-w-0 flex-1 border-hairline-soft px-2 text-xs text-ink"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSegmentId(segment.segment_id)
                        setSegmentEditText(segment.text)
                      }}
                      title="Edit text"
                      className="min-w-0 flex-1 truncate text-left text-ink transition-colors hover:text-graphite"
                    >
                      {segment.text}
                    </button>
                  )}
                  <span className="shrink-0 text-[10px] text-slate">
                    {segment.screen_position}
                  </span>
                  <label className="flex shrink-0 items-center gap-1">
                    <span className="text-[10px] text-slate">Start</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number(segment.start_time_sec.toFixed(2))}
                      onChange={(e) =>
                        updateTiming(
                          segment.segment_id,
                          'start_time_sec',
                          e.target.value,
                        )
                      }
                      className="h-7 w-14 rounded-md border-hairline-soft px-2 text-xs"
                    />
                  </label>
                  <label className="flex shrink-0 items-center gap-1">
                    <span className="text-[10px] text-slate">End</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number(segment.end_time_sec.toFixed(2))}
                      onChange={(e) =>
                        updateTiming(
                          segment.segment_id,
                          'end_time_sec',
                          e.target.value,
                        )
                      }
                      className="h-7 w-14 rounded-md border-hairline-soft px-2 text-xs"
                    />
                  </label>
                  <span className="w-10 shrink-0 text-xs text-slate">
                    {segment.duration_sec.toFixed(1)}s
                  </span>
                  {finalDuration ?? duration ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateTiming(
                          segment.segment_id,
                          'end_time_sec',
                          String(finalDuration ?? duration),
                        )
                      }
                      className="shrink-0 text-xs text-graphite underline underline-offset-2 hover:text-ink"
                    >
                      to end
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeSegment(segment.segment_id)}
                    aria-label={`Remove overlay text ${index + 1}`}
                    className="shrink-0 text-slate transition-colors hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))
            ) : (
              <li className="text-sm text-graphite">
                No overlay text saved for this content.
              </li>
            )}
          </ul>

          <div className="mt-2 flex gap-2">
            <Input
              value={newSegmentText}
              onChange={(e) => setNewSegmentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSegment()
                }
              }}
              placeholder="Add overlay text"
              aria-label="New overlay text"
              className="h-8 rounded-md border-hairline-soft px-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addSegment}
              disabled={!newSegmentText.trim()}
              className="h-8 rounded-full px-4 text-xs"
            >
              Add text
            </Button>
          </div>
          {dirty ? (
            <p className="mt-2 text-xs text-slate">
              Unsaved timeline changes.
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="micro-caps text-slate">Music</p>
            <Button
              type="button"
              variant="ghost"
              onClick={nextTrack}
              disabled={trackLoading}
              className="h-8 rounded-full px-4 text-xs"
            >
              <RefreshCw /> New track
            </Button>
          </div>

          <div className="mt-3">
            {trackLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-slate">
                <Loader2 className="size-4 animate-spin" /> Finding a track…
              </p>
            ) : track ? (
              <div className="flex items-center gap-4 rounded-md border border-hairline px-4 py-3">
                {track.image ? (
                  <img
                    src={track.image}
                    alt=""
                    className="size-12 rounded-md object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {track.name}
                  </p>
                  <p className="truncate text-xs text-slate">
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-graphite">
                {trackError ?? 'No track.'}
              </p>
            )}
          </div>

          {trackError && track ? (
            <p className="mt-2 text-xs text-slate">{trackError}</p>
          ) : null}

          {musicQuery ? (
            <p className="mt-2 text-xs text-slate">Query: {musicQuery}</p>
          ) : (
            <p className="mt-2 text-xs text-slate">
              No audio config saved for this content.
            </p>
          )}

          <div className="mt-4">
            <label className="flex flex-col gap-2">
              <span className="flex items-center justify-between text-xs text-slate">
                <span>Music volume</span>
                <span>{Math.round(musicVolume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={musicVolume}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                className="w-full cursor-pointer accent-ink"
              />
            </label>
          </div>
        </div>

        {pick ? (
          <p className="text-xs text-slate">
            Video by{' '}
            <a
              href={pick.video.user.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {pick.video.user.name}
            </a>{' '}
            on Pexels · {pick.file.width}×{pick.file.height}
            {keywords.length
              ? ` · "${keywords[keywordIndex % keywords.length]}"`
              : ''}
          </p>        ) : null}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
