import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export interface StockAsset {
  source: string;
  sourceUrl: string;
  licence: string;
  type: 'VIDEO' | 'IMAGE';
  url: string;
  previewUrl: string;
  query: string;
}

interface PexelsVideoFile {
  link: string;
  file_type: string;
  width: number;
  height: number;
}

interface PexelsVideo {
  url: string;
  image: string;
  duration: number;
  video_files: PexelsVideoFile[];
}

interface PexelsPhoto {
  url: string;
  src: { large2x: string; portrait: string; medium: string };
}

const LICENCE = 'Pexels License (free for commercial use)';

let cachedKey: string | null = null;

async function loadKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const param = process.env.PEXELS_API_KEY_PARAM;
  if (!param) throw new Error('PEXELS_API_KEY_PARAM is not set on the function.');
  let value: string | undefined;
  try {
    const result = await new SSMClient({}).send(
      new GetParameterCommand({ Name: param, WithDecryption: true }),
    );
    value = result.Parameter?.Value;
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error';
    throw new Error(
      `Cannot read SSM parameter ${param} (${name}). Create it as a SecureString in this region.`,
    );
  }
  if (!value) throw new Error(`SSM parameter ${param} is empty.`);
  cachedKey = value;
  return value;
}

function broaderQueries(query: string): string[] {
  const parts = query.trim().split(/\s+/).filter(Boolean);
  const out = [query.trim()];
  if (parts.length > 2) out.push(parts.slice(-2).join(' '));
  if (parts.length > 1) out.push(parts[parts.length - 1]);
  return [...new Set(out)];
}

function bestFile(video: PexelsVideo): PexelsVideoFile | null {
  const files = video.video_files.filter(
    (f) => f.file_type === 'video/mp4' && f.height >= f.width && f.height <= 1920,
  );
  if (!files.length) return null;
  return files.reduce((best, f) => (f.height > best.height ? f : best));
}

async function pexelsGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: await loadKey() } });
  console.log(
    JSON.stringify({
      scope: 'generate-content',
      step: 'pexels.response',
      status: response.status,
      path: new URL(url).pathname,
    }),
  );
  if (!response.ok) {
    throw new Error(`Pexels request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

/** Portrait stock videos, longest-enough first. Exposed for the swap UI. */
export async function searchVideos(
  query: string,
  page = 1,
  minSeconds = 0,
): Promise<StockAsset[]> {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
    query,
  )}&orientation=portrait&per_page=15&page=${page}`;
  const data = await pexelsGet<{ videos: PexelsVideo[] }>(url);
  const results: StockAsset[] = [];
  for (const video of data.videos) {
    const file = bestFile(video);
    if (!file) continue;
    results.push({
      source: 'pexels',
      sourceUrl: video.url,
      licence: LICENCE,
      type: 'VIDEO',
      url: file.link,
      previewUrl: video.image,
      query,
    });
  }
  const long = data.videos
    .filter((v) => v.duration >= minSeconds)
    .map((v) => v.url);
  return results.sort(
    (a, b) => Number(long.includes(b.sourceUrl)) - Number(long.includes(a.sourceUrl)),
  );
}

export async function searchImages(query: string, page = 1): Promise<StockAsset[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
    query,
  )}&orientation=portrait&per_page=15&page=${page}`;
  const data = await pexelsGet<{ photos: PexelsPhoto[] }>(url);
  return data.photos.map((photo) => ({
    source: 'pexels',
    sourceUrl: photo.url,
    licence: LICENCE,
    type: 'IMAGE' as const,
    url: photo.src.large2x,
    previewUrl: photo.src.medium,
    query,
  }));
}

/** First result for the query, retrying with broader queries (FR-3.7). */
export async function findAsset(
  query: string,
  type: 'VIDEO' | 'IMAGE',
  minSeconds = 0,
  skip = 0,
): Promise<StockAsset | null> {
  for (const candidate of broaderQueries(query)) {
    const results =
      type === 'VIDEO'
        ? await searchVideos(candidate, 1, minSeconds)
        : await searchImages(candidate, 1);
    if (results.length) return results[skip % results.length];
  }
  return null;
}
