import { NextRequest, NextResponse } from 'next/server';

/**
 * Streams a BigBlueButton recording's video back to the browser as a download.
 *
 * The LMS and the BBB server are separate machines, so we cannot read
 * /var/bigbluebutton/published/video/... from disk here. Instead we fetch the
 * published video over HTTPS from the BBB server and re-stream it with a
 * Content-Disposition: attachment header, so the browser saves a file rather
 * than opening the playback page.
 *
 * BBB's `video` playback format writes the combined recording as `video-0.m4v`
 * (an MP4 container). We treat .m4v exactly like .mp4 and download it as
 * `recording-<id>.mp4`.
 *
 * `id` is the BBB recordID, which is also the published directory name:
 *   /var/bigbluebutton/published/video/<id>/video-0.m4v
 */

// Base origin of the BBB server that serves published recordings over HTTP.
// Overridable via env so we can point at a dedicated recordings host/endpoint
// without a code change.
const BBB_ORIGIN = (process.env.BBB_RECORDING_ORIGIN || 'https://class.techpratham.com').replace(/\/$/, '');

// Candidate public URLs for the recording video, in priority order.
// The `video` format directory (video-0.m4v / video-1.m4v) is the combined
// recording. Both /video/ and /presentation/ prefixes are tried because the
// serving location differs between BBB versions/configs. Both .m4v and .mp4
// extensions are accepted since BBB currently emits .m4v.
function candidateVideoUrls(recordId: string): string[] {
  const urls: string[] = [];

  // BBB's combined `video` playback format, served publicly at:
  //   https://<bbb>/playback/video/<id>/video-0.m4v
  // backed by /var/bigbluebutton/published/video/<id>/video-0.m4v
  //
  // This is the composited recording (screen + webcam/person + audio). We only
  // ever serve this combined file — never the single-track webcams.mp4 /
  // deskshare.mp4, which would give an incomplete video (missing the shared
  // screen or the presenter).
  for (const n of [0, 1, 2]) {
    urls.push(`${BBB_ORIGIN}/playback/video/${recordId}/video-${n}.m4v`);
    urls.push(`${BBB_ORIGIN}/playback/video/${recordId}/video-${n}.mp4`);
  }

  return urls;
}

// A response is a real downloadable video (not an HTML playback page or an
// nginx 404 page) when it is 2xx and not text/html.
function isVideoResponse(res: Response): boolean {
  if (!res.ok) return false;
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/html') || ct.includes('application/xml')) return false;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Recording ID is required' },
        { status: 400 }
      );
    }

    console.log('⬇️  Download requested for recordId:', id);

    const debug = request.nextUrl.searchParams.get('debug') === '1';
    const urls = candidateVideoUrls(id);

    let upstream: Response | null = null;
    let matchedUrl = '';
    let sawProcessing = false;
    const attempts: Array<{ url: string; status: number | string; contentType: string }> = [];

    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'GET' });
        const contentType = res.headers.get('content-type') || '';
        attempts.push({ url, status: res.status, contentType });

        if (isVideoResponse(res)) {
          upstream = res;
          matchedUrl = url;
          break;
        }

        // A 403 on a video path often means the recording directory exists but
        // the file is still being written (processing) rather than truly absent.
        if (res.status === 403) sawProcessing = true;

        // Drain non-matching bodies so the socket can be reused
        try { await res.arrayBuffer(); } catch { /* ignore */ }
      } catch (e: any) {
        attempts.push({ url, status: `error: ${e?.message || 'fetch failed'}`, contentType: '' });
      }
    }

    if (!upstream || !upstream.body) {
      console.error('Recording download: no video found for', id, attempts);

      if (debug) {
        return NextResponse.json(
          { success: false, error: 'No downloadable video found', recordId: id, attempts },
          { status: 404 }
        );
      }

      if (sawProcessing) {
        return NextResponse.json(
          { success: false, error: 'Recording video is still processing. Please try again later.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            'A downloadable video is not available for this recording. This usually means the ' +
            'combined video was never generated for it (older recordings made before video ' +
            'processing was enabled only have the online playback). It can still be watched with Play.',
        },
        { status: 404 }
      );
    }

    const contentLength = upstream.headers.get('content-length') || undefined;
    const downloadFilename = `recording-${id}.mp4`;

    console.log(`⬇️  Streaming recording ${id} from ${matchedUrl}`);

    // Always present the file as an MP4 download, even when the source is .m4v
    // (both are MP4 containers and play everywhere).
    const headers: Record<string, string> = {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${downloadFilename}"`,
      'Cache-Control': 'private, no-store',
    };
    if (contentLength) headers['Content-Length'] = contentLength;

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error: any) {
    console.error('Recording download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download recording', message: error.message },
      { status: 500 }
    );
  }
}
