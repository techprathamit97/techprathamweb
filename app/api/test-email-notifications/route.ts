import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to manually trigger class notifications
export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Manual notification test triggered');
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const notificationUrl = `${baseUrl}/api/class-notifications?secret=techpratham-notification-secret`;
    
    console.log('Calling notification API:', notificationUrl);
    
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    console.log('Notification API response:', result);
    
    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Test notification completed',
        notificationResult: result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Notification API failed',
        details: result
      }, { status: response.status });
    }
    
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check notification status
export async function GET() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const statusUrl = `${baseUrl}/api/class-notifications`;
    
    const response = await fetch(statusUrl);
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Notification status retrieved',
      status: result
    });
    
  } catch (error: any) {
    console.error('Error checking notification status:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}