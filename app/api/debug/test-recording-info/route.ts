import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to check what recording information is available
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Testing recording information access');
    
    // Test the specific recording ID from the user's example
    const testRecordingId = '837e699dba1a1d42cd62e9189c39b6f974e6d802-1791808374086';
    const testInternalMeetingId = '195jbjjxj7hp';
    
    // Method 1: Test direct analytics access
    const directUrl = `https://class.techpratham.com/learning-analytics-dashboard/${testRecordingId}/${testInternalMeetingId}/learning_dashboard_data.json`;
    
    console.log('Testing direct analytics URL:', directUrl);
    
    let directResult = null;
    try {
      const directResponse = await fetch(directUrl);
      console.log('Direct response status:', directResponse.status);
      
      if (directResponse.ok) {
        const directData = await directResponse.json();
        console.log('Direct analytics success - keys:', Object.keys(directData));
        
        directResult = {
          success: true,
          status: directResponse.status,
          dataKeys: Object.keys(directData),
          userCount: directData.users_data ? Object.keys(directData.users_data).length : 0,
          participants: directData.users_data ? Object.keys(directData.users_data).map(userId => {
            const userData = directData.users_data[userId];
            return {
              userId,
              name: userData.name,
              role: userData.role,
              messages: userData.totalOfMessages || 0
            };
          }) : []
        };
      } else {
        const errorText = await directResponse.text();
        directResult = {
          success: false,
          status: directResponse.status,
          error: errorText
        };
      }
    } catch (directError) {
      console.error('Direct access error:', directError);
      directResult = {
        success: false,
        error: directError.message
      };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Recording info test completed',
      testRecordingId,
      testInternalMeetingId,
      results: {
        directAnalytics: directResult
      },
      urls: {
        directAnalytics: directUrl
      }
    });
    
  } catch (error: any) {
    console.error('❌ Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}