const AUDIO_CODEC = 'mp4a.40.2'
export const AUDIO_RATE = 48_000
export const AUDIO_CHANNELS = 2

/**
 * Decodes the clip's audio into a buffer of exactly `seconds`, optionally
 * looping it. Null when the clip has no audio, it is muted, or the browser
 * cannot encode AAC.
 */
export async function renderClipAudio(
  clipUrl: string,
  seconds: number,
  volume: number,
  loop: boolean,
): Promise<AudioBuffer | null> {
  if (
    volume <= 0 ||
    typeof AudioEncoder === 'undefined' ||
    typeof AudioData === 'undefined'
  ) {
    return null
  }
  const support = await AudioEncoder.isConfigSupported({
    codec: AUDIO_CODEC,
    sampleRate: AUDIO_RATE,
    numberOfChannels: AUDIO_CHANNELS,
    bitrate: 128_000,
  }).catch(() => ({ supported: false }))
  if (!support.supported) return null

  try {
    const response = await fetch(clipUrl)
    const data = await response.arrayBuffer()
    const decoder = new OfflineAudioContext(
      AUDIO_CHANNELS,
      AUDIO_RATE,
      AUDIO_RATE,
    )
    const decoded = await decoder.decodeAudioData(data)
    if (!decoded.length) return null
    const offline = new OfflineAudioContext(
      AUDIO_CHANNELS,
      Math.round(seconds * AUDIO_RATE),
      AUDIO_RATE,
    )
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.loop = loop
    const gain = offline.createGain()
    gain.gain.value = Math.min(1, volume)
    source.connect(gain).connect(offline.destination)
    source.start(0)
    return await offline.startRendering()
  } catch {
    return null
  }
}

export async function encodeAudio(
  buffer: AudioBuffer,
  onChunk: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => void,
): Promise<void> {
  let failure: Error | null = null
  const encoder = new AudioEncoder({
    output: onChunk,
    error: (error) => {
      failure = error
    },
  })
  encoder.configure({
    codec: AUDIO_CODEC,
    sampleRate: AUDIO_RATE,
    numberOfChannels: AUDIO_CHANNELS,
    bitrate: 128_000,
  })
  const block = 4096
  const left = buffer.getChannelData(0)
  const right =
    buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0)
  for (let offset = 0; offset < buffer.length; offset += block) {
    if (failure) throw failure
    const frames = Math.min(block, buffer.length - offset)
    const planar = new Float32Array(frames * 2)
    planar.set(left.subarray(offset, offset + frames), 0)
    planar.set(right.subarray(offset, offset + frames), frames)
    const audio = new AudioData({
      format: 'f32-planar',
      sampleRate: AUDIO_RATE,
      numberOfFrames: frames,
      numberOfChannels: AUDIO_CHANNELS,
      timestamp: Math.round((offset * 1_000_000) / AUDIO_RATE),
      data: planar,
    })
    encoder.encode(audio)
    audio.close()
    while (encoder.encodeQueueSize > 16) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
  }
  await encoder.flush()
  encoder.close()
  if (failure) throw failure
}
