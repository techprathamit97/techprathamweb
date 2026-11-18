import { NextRequest, NextResponse } from 'next/server';

// Isolated MSG91 WhatsApp test route.
// Local-only so it can never fire from production by accident.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Local testing only' }, { status: 403 });
  }

  try {
    const { mobile } = await req.json();

    // Expect "91" + 10 digits, e.g. 919876543210
    if (!/^91\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: 'Use country code 91 followed by a 10-digit number (e.g. 919876543210)' },
        { status: 400 }
      );
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    const integratedNumber = process.env.MSG91_WA_NUMBER;
    const templateName = process.env.MSG91_WA_TEMPLATE;
    const languageCode = process.env.MSG91_WA_LANGUAGE || 'en';

    if (!authKey || !integratedNumber || !templateName) {
      return NextResponse.json(
        {
          error:
            'Missing MSG91 config. Set MSG91_AUTH_KEY, MSG91_WA_NUMBER and MSG91_WA_TEMPLATE in .env.local',
        },
        { status: 500 }
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
              to_and_components: [{ to: [mobile], components: {} }],
            },
          },
        }),
      }
    );

    // MSG91 sometimes returns non-JSON on error; guard the parse.
    const raw = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    // Always return 200 from this test route so the browser console does not
    // log a red error. MSG91's real outcome is carried in the body below.
    return NextResponse.json({
      msg91Status: response.status,
      msg91Ok: response.ok,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Request failed', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
