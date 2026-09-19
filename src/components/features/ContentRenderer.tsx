import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2, Pause, Play, RefreshCw, Shuffle } from 'lucide-react'
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
}

interface AudioGraph {
  ctx: AudioContext
  videoGain: GainNode
  musicGain: GainNode
  destination: MediaStreamAudioDestinationNode
}

type VerticalAlign = 'top' | 'center' | 'bottom'
type HorizontalAlign = 'left' | 'center' | 'right'

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

/**
 * Best-effort check for an audio track. Returns null when the browser gives
 * no hint (Chrome only reveals it through `captureStream`).
 */
function detectVideoAudio(video: HTMLVideoElement): boolean | null {
  const element = video as HTMLVideoElement & {
    mozHasAudio?: boolean
    audioTracks?: { length: number }
    captureStream?: () => MediaStream
  }
  try {
    const stream = element.captureStream?.()
    if (stream) return stream.getAudioTracks().length > 0
  } catch {
    /* ignore */
  }
  if (typeof element.mozHasAudio === 'boolean') return element.mozHasAudio
  if (element.audioTracks) return element.audioTracks.length > 0
  return null
}

/**
 * 9:16 stage that plays the first Pexels video for the content's keywords,
 * overlays the saved text timeline, and renders a downloadable file with the
 * overlays burned in.
 */
export function ContentRenderer({ content }: ContentRendererProps) {
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
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [trackIndex, setTrackIndex] = useState(0)
  const [trackLoading, setTrackLoading] = useState(true)
  const [trackError, setTrackError] = useState<string | null>(null)
  const [videoVolume, setVideoVolume] = useState(0.5)
  const [musicVolume, setMusicVolume] = useState(0.8)
  const [videoHasAudio, setVideoHasAudio] = useState<boolean | null>(null)
  const [segments, setSegments] = useState<OverlaySegment[]>(savedSegments)
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(savedSegments),
  )
  const [savingTimings, setSavingTimings] = useState(false)
  const [timingsError, setTimingsError] = useState<string | null>(null)
  const [timingsSaved, setTimingsSaved] = useState(false)

  useEffect(() => {
    setSegments(savedSegments)
    setBaseline(JSON.stringify(savedSegments))
    setTimingsSaved(false)
    setTimingsError(null)
  }, [savedSegments])

  const dirty = JSON.stringify(segments) !== baseline

  const updateTiming = (
    segmentId: number,
    field: 'start_time_sec' | 'end_time_sec',
    rawValue: string,
  ) => {
    const value = Number(rawValue)
    if (Number.isNaN(value) || value < 0) return
    setTimingsSaved(false)
    setSegments((prev) =>
      prev.map((segment) => {
        if (segment.segment_id !== segmentId) return segment
        const start =
          field === 'start_time_sec' ? value : segment.start_time_sec
        const end = field === 'end_time_sec' ? value : segment.end_time_sec
        return {
          ...segment,
          start_time_sec: start,
          end_time_sec: end,
          duration_sec: Math.max(0, end - start),
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
  }

  const keywords = useMemo(
    () =>
      (content.videoKeywords ?? []).filter(
        (keyword): keyword is string => Boolean(keyword),
      ),
    [content.videoKeywords],
  )

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
      setVideoHasAudio(null)
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

  const resetPlayback = () => {
    setPlaying(false)
    setCurrentTime(0)
    setRenderedUrl(null)
    setVideoHasAudio(null)
  }

  /** Jumps to the next keyword every click, cycling all of them. */
  const nextVideo = () => {
    if (!keywords.length) return
    const nextIndex = (keywordIndex + 1) % keywords.length
    const nextPage = nextIndex === 0 ? page + 1 : 1
    void loadKeyword(nextIndex, nextPage)
  }

  /** Another clip for the current keyword, paging Pexels when exhausted. */
  const nextClip = () => {
    if (resultIndex + 1 < results.length) {
      setResultIndex(resultIndex + 1)
      resetPlayback()
      return
    }
    void loadKeyword(keywordIndex, page + 1)
  }

  const loadTracks = useCallback(async () => {
    setTrackLoading(true)
    setTrackError(null)
    try {
      if (!musicQuery) {
        throw new Error(
          'This content has no audio config to search music for.',
        )
      }
      const found = await searchTracks(musicQuery)
      setTracks(found)
      setTrackIndex(0)
      if (!found.length) {
        setTrackError(`No tracks found for "${musicQuery}".`)
      }
    } catch (err) {
      setTracks([])
      setTrackError(
        err instanceof Error ? err.message : 'Failed to load music',
      )
    } finally {
      setTrackLoading(false)
    }
  }, [musicQuery])

  useEffect(() => {
    void loadTracks()
  }, [loadTracks])

  const track = tracks[trackIndex] ?? null

  const nextTrack = () => {
    if (!tracks.length) {
      void loadTracks()
      return
    }
    setTrackIndex((trackIndex + 1) % tracks.length)
  }

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      const video = videoRef.current
      if (video) setCurrentTime(video.currentTime)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  /**
   * Builds a Web Audio graph once so the source video and the music track can
   * be mixed with independent volumes and captured into one recordable track.
   * Returns null when the browser refuses (e.g. a non-CORS media source).
   */
  const ensureAudioGraph = useCallback((): AudioGraph | null => {
    if (audioGraphRef.current) return audioGraphRef.current
    const video = videoRef.current
    const audio = audioRef.current
    if (!video || !audio) return null
    try {
      const ctx = new AudioContext()
      const videoGain = ctx.createGain()
      const musicGain = ctx.createGain()
      ctx.createMediaElementSource(video).connect(videoGain)
      ctx.createMediaElementSource(audio).connect(musicGain)
      videoGain.connect(ctx.destination)
      musicGain.connect(ctx.destination)
      const destination = ctx.createMediaStreamDestination()
      videoGain.connect(destination)
      musicGain.connect(destination)
      videoGain.gain.value = videoVolume
      musicGain.gain.value = musicVolume
      const graph: AudioGraph = { ctx, videoGain, musicGain, destination }
      audioGraphRef.current = graph
      return graph
    } catch {
      return null
    }
  }, [musicVolume, videoVolume])

  useEffect(() => {
    const graph = audioGraphRef.current
    if (graph) {
      graph.videoGain.gain.value = videoVolume
      graph.musicGain.gain.value = musicVolume
      return
    }
    if (videoRef.current) videoRef.current.volume = videoVolume
    if (audioRef.current) audioRef.current.volume = musicVolume
  }, [videoVolume, musicVolume])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    const audio = audioRef.current
    const graph = ensureAudioGraph()
    if (graph && graph.ctx.state === 'suspended') {
      void graph.ctx.resume()
    }
    if (video.paused) {
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
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    })

    const draw = () => {
      if (!videoRef.current) return
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#030303'
      ctx.fillRect(0, 0, width, height)
      drawCover(ctx, videoRef.current, width, height)
      const segment = segmentAt(segments, videoRef.current.currentTime)
      if (segment) drawOverlay(ctx, segment, width, height)
    }

    let frame = 0
    const loop = () => {
      draw()
      if (videoRef.current) {
        setRenderProgress(
          videoRef.current.duration
            ? videoRef.current.currentTime / videoRef.current.duration
            : 0,
        )
      }
      frame = requestAnimationFrame(loop)
    }

    const onEnded = () => {
      cancelAnimationFrame(frame)
      draw()
      audioRef.current?.pause()
      if (recorder.state !== 'inactive') recorder.stop()
    }

    try {
      const audio = audioRef.current
      video.pause()
      video.currentTime = 0
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
      video.addEventListener('ended', onEnded, { once: true })
      await video.play()
      if (audio && track) void audio.play()
      recorder.start(100)
      loop()

      await new Promise<void>((resolve) => {
        video.addEventListener('ended', () => resolve(), { once: true })
      })
      const blob = await stopped
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
      setRendering(false)
    }
  }, [content.title, ensureAudioGraph, segments, track])

  const activeSegment = segmentAt(segments, currentTime)
  const progress = duration ? Math.min(currentTime / duration, 1) : 0

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div>
        <div className="relative aspect-9/16 w-full overflow-hidden rounded-lg border border-hairline bg-ink">
          {pick ? (
            <>
              <video
                ref={videoRef}
                src={pick.file.link}
                poster={pick.video.image}
                crossOrigin="anonymous"
                playsInline
                className="size-full object-cover"
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration)
                  setVideoHasAudio(detectVideoAudio(e.currentTarget))
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                  setPlaying(false)
                  audioRef.current?.pause()
                }}
              />
              {activeSegment ? (
                <div className="pointer-events-none absolute inset-0 flex justify-center p-6">
                  <p
                    className={
                      activeSegment.screen_position
                        .toLowerCase()
                        .includes('top')
                        ? 'self-start max-w-[85%] rounded-md bg-[rgba(3,3,3,0.55)] px-5 py-3 text-center text-xl leading-snug font-semibold text-white'
                        : activeSegment.screen_position
                              .toLowerCase()
                              .includes('bottom')
                          ? 'self-end max-w-[85%] rounded-md bg-[rgba(3,3,3,0.55)] px-5 py-3 text-center text-xl leading-snug font-semibold text-white'
                          : 'self-center max-w-[85%] rounded-md bg-[rgba(3,3,3,0.55)] px-5 py-3 text-center text-xl leading-snug font-semibold text-white'
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
        />

        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={togglePlay}
            disabled={!pick}
            className="rounded-full"
          >
            {playing ? <Pause /> : <Play />}
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button
            type="button"
            onClick={() => void renderWithOverlays()}
            disabled={!pick || rendering}
            className="rounded-full"
          >
            {rendering ? <Loader2 className="animate-spin" /> : <Download />}
            {rendering ? 'Rendering…' : 'Render & download'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={nextVideo}
            disabled={loading || !keywords.length}
            className="rounded-full"
          >
            <RefreshCw /> New video
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={nextClip}
            disabled={loading || !pick}
            className="rounded-full"
          >
            <Shuffle /> Another clip
          </Button>
        </div>

        {keywords.length ? (
          <p className="mt-3 text-xs text-slate">
            Keyword {keywordIndex + 1}/{keywords.length} ·{' '}
            <span className="text-graphite">"{keywords[keywordIndex]}"</span>
            {page > 1 ? ` · page ${page}` : ''}
          </p>
        ) : null}

        {duration ? (
          <div className="mt-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full bg-ink transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate">
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </p>
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

      <div className="flex flex-col gap-8">
        <div>
          <p className="eyebrow text-slate">preview</p>
          <h2 className="text-heading-sm mt-4">{content.title}</h2>
        </div>

        <div>
          <p className="micro-caps text-slate">Caption</p>
          <p className="mt-3 text-base leading-relaxed whitespace-pre-wrap text-graphite">
            {content.caption ?? 'No caption.'}
          </p>
        </div>

        <div>
          <p className="micro-caps text-slate">Hashtags</p>
          <div className="mt-3 flex flex-wrap gap-2">
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
                  {savingTimings ? 'Saving…' : 'Save timings'}
                </Button>
              </div>
            ) : null}
          </div>

          {timingsError ? (
            <p className="mt-3 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {timingsError}
            </p>
          ) : null}

          <ul className="mt-3 flex flex-col gap-2">
            {segments.length ? (
              segments.map((segment, index) => (
                <li
                  key={segment.segment_id}
                  className="rounded-md border border-hairline px-4 py-3 text-sm text-graphite"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="micro-caps text-slate">
                      Segment {index + 1}
                    </span>
                    <span className="text-xs text-slate">
                      {segment.screen_position}
                    </span>
                  </div>
                  <span className="mt-2 block text-ink">{segment.text}</span>
                  <div className="mt-3 flex items-end gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate">Start (s)</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={segment.start_time_sec}
                        onChange={(e) =>
                          updateTiming(
                            segment.segment_id,
                            'start_time_sec',
                            e.target.value,
                          )
                        }
                        className="h-9 w-24 rounded-md border-hairline-soft"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-slate">End (s)</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={segment.end_time_sec}
                        onChange={(e) =>
                          updateTiming(
                            segment.segment_id,
                            'end_time_sec',
                            e.target.value,
                          )
                        }
                        className="h-9 w-24 rounded-md border-hairline-soft"
                      />
                    </label>
                    <span className="pb-2 text-xs text-slate">
                      {segment.duration_sec.toFixed(1)}s
                    </span>
                    {duration ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateTiming(
                            segment.segment_id,
                            'end_time_sec',
                            String(duration),
                          )
                        }
                        className="pb-2 text-xs text-graphite underline underline-offset-2 hover:text-ink"
                      >
                        to end
                      </button>
                    ) : null}
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-graphite">
                No overlay text saved for this content.
              </li>
            )}
          </ul>
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
            <p className="mt-2 text-xs text-slate">
              Query: {musicQuery} · mixed with the source audio
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate">
              No audio config saved for this content.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="flex items-center justify-between text-xs text-slate">
                <span>Video volume</span>
                <span>{Math.round(videoVolume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={videoVolume}
                disabled={videoHasAudio === false}
                onChange={(e) => setVideoVolume(Number(e.target.value))}
                className="w-full cursor-pointer accent-ink disabled:cursor-not-allowed disabled:opacity-40"
              />
            </label>
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
            {videoHasAudio === false ? (
              <p className="text-xs text-slate">
                This clip has no audio track — Pexels stock videos are silent.
                Use the music track instead.
              </p>
            ) : null}
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
            {keywords[keywordIndex] ? ` · "${keywords[keywordIndex]}"` : ''}
          </p>        ) : null}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
