import { NextRequest, NextResponse } from 'next/server';
import { POST as unifiedLogin } from '../login/route';

// Legacy trainer login endpoint - now redirects to unified auth
export async function POST(req: NextRequest) {
  try {
    const { loginId, password } = await req.json();
    
    // Create a new request with unified login format
    const unifiedReq = new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({ 
        loginId: loginId, 
        password: password 
      })
    });
    
    // Call unified login function directly (no HTTP request)
    const response = await unifiedLogin(unifiedReq);
    const data = await response.json();
    
    if (response.ok && data.role === 'trainer') {
      // Return in legacy format for backward compatibility
      return NextResponse.json({
        success: true,
        message: 'Login successful',
        trainer: data.user
      });
    } else if (response.ok && data.role !== 'trainer') {
      return NextResponse.json(
        { error: 'Invalid credentials for trainer login' },
        { status: 401 }
      );
    } else {
      return NextResponse.json(data, { status: response.status });
    }
    
  } catch (error: any) {
    console.error('Legacy trainer login error:', error);
    return NextResponse.json(
      { error: 'Login failed', message: error.message },
      { status: 500 }
    );
  }
}