import { NextRequest, NextResponse } from 'next/server';

// Normalise any Indian number to "91XXXXXXXXXX" (91 + 10 digits).
// Accepts "9876543210", "+91 98765 43210", "919876543210", etc.
function normalizeMobile(raw: string): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  // Take the last 10 digits as the subscriber number.
  const last10 = digits.slice(-10);
  if (last10.length !== 10) return null;
  return '91' + last10;
}

/**
 * Send a WhatsApp message (e.g. class cancellation) to every student in a batch
 * via MSG91's WhatsApp template API.
 *
 * Body: { recipients: [{ name, phone }], message }
 *
 * Note: WhatsApp only allows business-initiated messages through an APPROVED
 * template. The typed message is injected into the template's first body
 * variable ({{1}}). The approved template `tp_custom_message` renders:
 *
 *   Hii,
 *   {{1}}
 *   Regards,
 *   TechPratham Training Team
 *
 * so the admin only types the middle content. Template name comes from
 * MSG91_WA_CANCEL_TEMPLATE (falls back to MSG91_WA_TEMPLATE = tp_custom_message).
 */

// WhatsApp forbids newlines, tabs and runs of 4+ spaces inside a template
// variable value, so collapse all whitespace to single spaces. Returns a
// trimmed, single-line string safe to pass as {{1}}.
function sanitizeVariable(text: string): string {
  return String(text).replace(/\s+/g, ' ').trim();
}
export async function POST(req: NextRequest) {
  try {
    const { recipients, message } = await req.json();

    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    const integratedNumber = process.env.MSG91_WA_NUMBER;
    const templateName = process.env.MSG91_WA_CANCEL_TEMPLATE || process.env.MSG91_WA_TEMPLATE;
    const languageCode = process.env.MSG91_WA_LANGUAGE || 'en';

    if (!authKey || !integratedNumber || !templateName) {
      return NextResponse.json(
        {
          error:
            'Missing MSG91 config. Set MSG91_AUTH_KEY, MSG91_WA_NUMBER and a template (MSG91_WA_CANCEL_TEMPLATE or MSG91_WA_TEMPLATE) in .env.local',
        },
        { status: 500 }
      );
    }

    // The typed text becomes the template's {{1}} body variable.
    const bodyText = sanitizeVariable(message);
    if (!bodyText) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build valid recipients and track the ones we had to skip.
    const skipped: { name?: string; phone?: string; reason: string }[] = [];
    const toAndComponents: any[] = [];

    for (const r of recipients) {
      const mobile = normalizeMobile(r?.phone);
      if (!mobile) {
        skipped.push({ name: r?.name, phone: r?.phone, reason: 'Invalid or missing phone number' });
        continue;
      }
      // `tp_custom_message` has one free-text body variable ({{1}}). MSG91's
      // bulk API expects body variables as `body_1`, `body_2`, ... so the typed
      // message is passed as body_1.
      toAndComponents.push({
        to: [mobile],
        components: {
          body_1: { type: 'text', value: bodyText },
        },
      });
    }

    if (toAndComponents.length === 0) {
      return NextResponse.json(
        { error: 'None of the students have a valid phone number', skipped },
        { status: 400 }
      );
    }

    const response = await fetch(
      'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify({
          integrated_number: integratedNumber,
          content_type: 'template',
          payload: {
            messaging_product: 'whatsapp',
            type: 'template',
            template: {
              name: templateName,
              language: { code: languageCode, policy: 'deterministic' },
              namespace: null,
              to_and_components: toAndComponents,
            },
          },
        }),
      }
    );

    const raw = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'MSG91 rejected the request',
          msg91Status: response.status,
          data,
          sentCount: 0,
          skipped,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sentCount: toAndComponents.length,
      skippedCount: skipped.length,
      skipped,
      data,
    });
  } catch (error: any) {
    console.error('WhatsApp batch-cancel error:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp messages', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
