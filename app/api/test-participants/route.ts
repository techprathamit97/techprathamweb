import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint to verify BBB Learning Analytics access
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('recordId') || '837e699dba1a1d42cd62e9189c39b6f974e6d802-1791808374086';
    const internalMeetingId = searchParams.get('internalMeetingId') || '195jbjjxj7hp';

    console.log('🧪 Testing BBB Learning Analytics Access');
    console.log('Record ID:', recordId);
    console.log('Internal Meeting ID:', internalMeetingId);

    // Test direct access to the BBB Learning Analytics data
    const analyticsUrl = `https://class.techpratham.com/learning-analytics-dashboard/${recordId}/${internalMeetingId}/learning_dashboard_data.json`;
    console.log('Analytics URL:', analyticsUrl);

    const response = await fetch(analyticsUrl);
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers));

    if (response.ok) {
      const analyticsData = await response.json();
      console.log('✅ Successfully fetched analytics data');
      console.log('Data keys:', Object.keys(analyticsData));

      // Extract participant information
      const participants = [];
      if (analyticsData.users_data) {
        console.log(`Found ${Object.keys(analyticsData.users_data).length} users`);
        
        for (const [userId, userData] of Object.entries(analyticsData.users_data)) {
          const user = userData as any;
          
          // Calculate session duration
          let duration = 'N/A';
          let joinTime = 'N/A';
          let leftTime = 'N/A';
          
          if (user.intIds && user.intIds.length > 0) {
            const sessionData = user.intIds[0];
            
            if (sessionData.registeredOn && sessionData.leftOn) {
              const joinedAt = new Date(sessionData.registeredOn);
              const leftAt = new Date(sessionData.leftOn);
              const durationMs = leftAt.getTime() - joinedAt.getTime();
              const durationMin = Math.floor(durationMs / (1000 * 60));
              
              duration = `${durationMin} min`;
              joinTime = joinedAt.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              leftTime = leftAt.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: 'short',
                day: 'numeric', 
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }
          
          // Extract base name without session token
          const baseName = user.name ? user.name.replace(/-[a-z0-9]{8,}$/i, '') : 'Unknown';
          
          participants.push({
            userId,
            name: baseName,
            fullName: user.name,
            email: user.role === 'moderator' ? 'Trainer/Admin' : 'Student - Check LMS records',
            role: user.role || 'viewer',
            joinedAt: joinTime,
            leftAt: leftTime,
            duration: duration,
            status: 'present',
            totalMessages: user.totalOfMessages || 0,
            isFromBBBAnalytics: true
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully accessed BBB Learning Analytics - Found ${participants.length} participants`,
        analyticsUrl,
        participants,
        analyticsDataKeys: Object.keys(analyticsData),
        debug: {
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers)
        }
      });
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to fetch analytics data:', response.status, errorText);

      return NextResponse.json({
        success: false,
        error: `Failed to fetch analytics data: ${response.status}`,
        analyticsUrl,
        errorDetails: errorText,
        debug: {
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers)
        }
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('❌ Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}