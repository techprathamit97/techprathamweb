import { describe, it, expect } from 'vitest';
import { extractPlaybackInfo, readTag, toPlaybackOrigin } from '../bbbRecordings';

const SERVER = 'https://class.techpratham.org/bigbluebutton';

// Shape produced by our own LMS meetings - URL inline in CDATA on one line.
const lmsRecording = `<recording>
  <recordID>abc123</recordID>
  <meetingID><![CDATA[class-6a7f2ff3ed84e0a72a743298]]></meetingID>
  <name><![CDATA[Ayansh_test2 - Class 21]]></name>
  <published>true</published>
  <state>published</state>
  <playback>
    <format>
      <type>presentation</type>
      <url><![CDATA[https://class.techpratham.org/playback/presentation/2.3/abc123]]></url>
      <length>95</length>
      <preview>
        <images>
          <image width="176" height="136" alt="x">https://class.techpratham.org/thumb.png</image>
        </images>
      </preview>
    </format>
  </playback>
</recording>`;

// Pretty-printed variant: URL on its own line. The old regex used `.` which does
// not match newlines, so this parsed to null and lost its Play button.
const prettyPrintedRecording = `<recording>
  <recordID>green456</recordID>
  <meetingID>8az6qfcg89e2tjkmnnuumuxe36f4o9cl2vmotbww</meetingID>
  <name>shubham sharma's Room</name>
  <published>true</published>
  <state>published</state>
  <playback>
    <format>
      <type>presentation</type>
      <url>
        https://class.techpratham.org/playback/presentation/2.3/green456
      </url>
    </format>
  </playback>
</recording>`;

// Multiple formats, presentation is not first.
const multiFormatRecording = `<recording>
  <recordID>multi789</recordID>
  <published>true</published>
  <state>published</state>
  <playback>
    <format>
      <type>podcast</type>
      <url><![CDATA[https://class.techpratham.org/podcast/multi789]]></url>
    </format>
    <format>
      <type>presentation</type>
      <url><![CDATA[https://class.techpratham.org/playback/presentation/2.3/multi789]]></url>
    </format>
  </playback>
</recording>`;

// Published but playback block is unusable.
const noPlaybackRecording = `<recording>
  <recordID>lost999</recordID>
  <published>true</published>
  <state>published</state>
</recording>`;

describe('readTag', () => {
  it('reads CDATA values', () => {
    expect(readTag('<name><![CDATA[Hello]]></name>', 'name')).toBe('Hello');
  });

  it('reads plain values', () => {
    expect(readTag('<type>presentation</type>', 'type')).toBe('presentation');
  });

  it('reads values spanning newlines', () => {
    expect(readTag('<url>\n  https://x.test/a\n</url>', 'url')).toBe('https://x.test/a');
  });

  it('returns null for an empty element', () => {
    expect(readTag('<url></url>', 'url')).toBeNull();
  });

  it('tolerates attributes on the tag', () => {
    expect(readTag('<image width="1">https://x.test/i.png</image>', 'image')).toBe(
      'https://x.test/i.png'
    );
  });
});

describe('toPlaybackOrigin', () => {
  it('strips the /bigbluebutton suffix', () => {
    expect(toPlaybackOrigin(SERVER)).toBe('https://class.techpratham.org');
  });

  it('strips a trailing slash and /api', () => {
    expect(toPlaybackOrigin('https://h.test/bigbluebutton/api')).toBe('https://h.test');
    expect(toPlaybackOrigin('https://h.test/bigbluebutton/')).toBe('https://h.test');
  });
});

describe('extractPlaybackInfo', () => {
  it('parses an LMS-created recording', () => {
    const info = extractPlaybackInfo(lmsRecording, {
      bbbServerUrl: SERVER,
      recordId: 'abc123',
      published: true
    });

    expect(info.videoUrl).toBe(
      'https://class.techpratham.org/playback/presentation/2.3/abc123'
    );
    expect(info.previewUrl).toBe('https://class.techpratham.org/thumb.png');
    expect(info.derived).toBe(false);
  });

  it('parses a pretty-printed URL that the old regex missed', () => {
    const info = extractPlaybackInfo(prettyPrintedRecording, {
      bbbServerUrl: SERVER,
      recordId: 'green456',
      published: true
    });

    expect(info.videoUrl).toBe(
      'https://class.techpratham.org/playback/presentation/2.3/green456'
    );
    expect(info.derived).toBe(false);
  });

  it('prefers the presentation format over podcast', () => {
    const info = extractPlaybackInfo(multiFormatRecording, {
      bbbServerUrl: SERVER,
      recordId: 'multi789',
      published: true
    });

    expect(info.videoUrl).toBe(
      'https://class.techpratham.org/playback/presentation/2.3/multi789'
    );
    expect(info.formats).toHaveLength(2);
  });

  it('derives a playback URL when the XML has no usable playback block', () => {
    const info = extractPlaybackInfo(noPlaybackRecording, {
      bbbServerUrl: SERVER,
      recordId: 'lost999',
      published: true
    });

    expect(info.videoUrl).toBe(
      'https://class.techpratham.org/playback/presentation/2.3/lost999'
    );
    expect(info.derived).toBe(true);
  });

  it('does not derive a URL for unpublished recordings', () => {
    const info = extractPlaybackInfo(noPlaybackRecording, {
      bbbServerUrl: SERVER,
      recordId: 'lost999',
      published: false
    });

    expect(info.videoUrl).toBeNull();
    expect(info.derived).toBe(false);
  });
});
