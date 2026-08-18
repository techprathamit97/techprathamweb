/**
 * Robust parsing helpers for BigBlueButton `getRecordings` XML.
 *
 * The previous inline parsers used `/<url>(.*?)<\/url>/`, where `.` does not
 * match newlines. Any recording whose XML puts the URL on its own line parsed to
 * `videoUrl: null`, which hid the Play/Download buttons in the UI even though the
 * recording was published and playable. Recordings created outside our LMS (e.g.
 * directly through Greenlight) are the common case for that formatting
 * difference.
 *
 * These helpers are newline-tolerant, CDATA-tolerant, handle multiple
 * `<format>` blocks, and can derive a standard playback URL from the recordID as
 * a last resort.
 */

/** Preference order when a recording exposes several playback formats. */
const FORMAT_PRIORITY = ['presentation', 'video', 'screenshare', 'podcast'];

/**
 * Reads a single XML tag's text, tolerating CDATA, surrounding whitespace and
 * newlines inside the element.
 */
export function readTag(xml: string, tag: string): string | null {
  if (!xml) return null;

  const cdata = xml.match(
    new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`)
  );
  if (cdata?.[1]) return cdata[1].trim();

  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (plain?.[1]) {
    const value = plain[1].trim();
    return value.length > 0 ? value : null;
  }

  return null;
}

/**
 * Turns the BBB API base URL into the playback host.
 * `https://host/bigbluebutton` -> `https://host`
 */
export function toPlaybackOrigin(bbbServerUrl: string): string {
  return bbbServerUrl
    .replace(/\/$/, '')
    .replace(/\/api$/, '')
    .replace(/\/bigbluebutton$/, '');
}

export interface PlaybackInfo {
  videoUrl: string | null;
  previewUrl: string | null;
  /** Every playable format found, useful for offering alternate links. */
  formats: Array<{ type: string; url: string }>;
  /** True when the URL was derived from recordID rather than read from XML. */
  derived: boolean;
}

/**
 * Extracts playback information from a single `<recording>...</recording>` block.
 */
export function extractPlaybackInfo(
  recordingXml: string,
  options: { bbbServerUrl: string; recordId?: string | null; published?: boolean }
): PlaybackInfo {
  const playbackBlock = recordingXml.match(/<playback>([\s\S]*?)<\/playback>/)?.[1] || '';

  const formats: Array<{ type: string; url: string }> = [];

  // A recording can expose several <format> blocks (presentation, video, ...).
  const formatBlocks = playbackBlock.match(/<format>[\s\S]*?<\/format>/g) || [];
  const blocksToScan = formatBlocks.length > 0 ? formatBlocks : [playbackBlock];

  for (const block of blocksToScan) {
    const url = readTag(block, 'url');
    if (!url) continue;
    formats.push({
      type: (readTag(block, 'type') || 'unknown').toLowerCase(),
      url
    });
  }

  // Pick the most useful format rather than whichever appeared first.
  let videoUrl: string | null = null;
  for (const preferred of FORMAT_PRIORITY) {
    const match = formats.find(f => f.type === preferred);
    if (match) {
      videoUrl = match.url;
      break;
    }
  }
  if (!videoUrl && formats.length > 0) {
    videoUrl = formats[0].url;
  }

  // Preview thumbnail (image element carries attributes, so match it loosely).
  let previewUrl: string | null = null;
  const previewBlock = playbackBlock.match(/<preview>([\s\S]*?)<\/preview>/)?.[1];
  if (previewBlock) {
    const imagesBlock = previewBlock.match(/<images>([\s\S]*?)<\/images>/)?.[1];
    if (imagesBlock) {
      const image = imagesBlock.match(/<image[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/image>/);
      if (image?.[1]) previewUrl = image[1].trim();
    }
  }

  // Last resort: BBB serves published recordings at a predictable playback path,
  // so a published recording with an unparseable <playback> block is still
  // viewable. This is what keeps Play available for Greenlight recordings.
  let derived = false;
  if (!videoUrl && options.recordId && options.published) {
    const origin = toPlaybackOrigin(options.bbbServerUrl);
    videoUrl = `${origin}/playback/presentation/2.3/${options.recordId}`;
    derived = true;
  }

  return { videoUrl, previewUrl, formats, derived };
}
