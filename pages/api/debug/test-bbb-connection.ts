import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const serverUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
    const apiSecret = process.env.BIGBLUEBUTTON_API_SECRET;

    console.log('Testing BBB connection...');
    console.log('Server URL:', serverUrl);
    console.log('API Secret:', apiSecret ? 'configured' : 'missing');

    if (!serverUrl || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'BBB not configured',
        serverUrl: serverUrl || 'missing',
        apiSecret: apiSecret ? 'configured' : 'missing'
      });
    }

    // Test basic API connectivity
    const testUrl = `${serverUrl}/bigbluebutton/api`;
    console.log('Testing URL:', testUrl);

    const response = await fetch(testUrl);
    const text = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response text:', text.substring(0, 500));

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      serverUrl,
      responsePreview: text.substring(0, 500),
      isApiAccessible: text.includes('BigBlueButton') || text.includes('api'),
    });
    
  } catch (error: any) {
    console.error('BBB test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}