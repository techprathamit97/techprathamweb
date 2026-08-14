import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes trainer-authored rich text (Quill HTML) before it is rendered with
 * dangerouslySetInnerHTML.
 *
 * Note content is written by trainers but read by every student in a batch, and
 * the API accepts raw HTML strings, so unsanitized content is a stored-XSS
 * vector. The allowlist below covers everything the Quill toolbar can produce
 * (headings, inline styles, colors, lists, alignment, links, images) and drops
 * scripts, event handlers, and dangerous URL schemes.
 */
export function sanitizeNoteHtml(html: string | undefined | null): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'class', 'style'
    ],
    // Only allow safe link/image protocols - blocks javascript: and data: URIs
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
    // Force external links to be safe to open
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'formaction']
  });
}
