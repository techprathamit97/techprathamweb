import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const bbbApiSecret = '6R9sIYi5RItE0xnuvXhWffyDHLqR5yzujOGLZfs8X0g';
    
    console.log('=== REVERSE ENGINEERING API-MATE CHECKSUM ===');
    
    // Extract parameters from the working API-Mate URL
    const workingParams = {
      'allowStartStopRecording': 'true',
      'attendeePW': 'ap',
      'autoStartRecording': 'false', 
      'meetingID': 'random-1131767',
      'moderatorPW': 'mp',
      'name': 'random-1131767',
      'record': 'false',
      'voiceBridge': '73751',
      'welcome': '<br>Welcome to <b>%%CONFNAME%%</b>!' // Raw value before URL encoding
    };
    
    const expectedChecksum = '9e8e9e13a620b4417d8ce77aba01601aab570322';
    
    console.log('Working parameters:', workingParams);
    console.log('Expected checksum:', expectedChecksum);
    
    // Test different parameter ordering and formatting
    const tests = [];
    
    // Test 1: Alphabetical order (standard BBB requirement)
    const sortedKeys1 = Object.keys(workingParams).sort();
    const queryString1 = sortedKeys1
      .map(key => `${key}=${workingParams[key as keyof typeof workingParams]}`)
      .join('&');
    const checksumInput1 = `create${queryString1}${bbbApiSecret}`;
    const checksum1 = crypto.createHash('sha1').update(checksumInput1, 'utf8').digest('hex');
    
    tests.push({
      name: 'Alphabetical order (standard)',
      queryString: queryString1,
      checksumInput: checksumInput1,
      checksum: checksum1,
      matches: checksum1 === expectedChecksum
    });
    
    // Test 2: Exact order from API-Mate URL
    const originalOrder = [
      'allowStartStopRecording', 'attendeePW', 'autoStartRecording', 
      'meetingID', 'moderatorPW', 'name', 'record', 'voiceBridge', 'welcome'
    ];
    const queryString2 = originalOrder
      .map(key => `${key}=${workingParams[key as keyof typeof workingParams]}`)
      .join('&');
    const checksumInput2 = `create${queryString2}${bbbApiSecret}`;
    const checksum2 = crypto.createHash('sha1').update(checksumInput2, 'utf8').digest('hex');
    
    tests.push({
      name: 'Original API-Mate order',
      queryString: queryString2,
      checksumInput: checksumInput2,
      checksum: checksum2,
      matches: checksum2 === expectedChecksum
    });
    
    // Test 3: Try without welcome parameter (it might be causing issues)
    const paramsWithoutWelcome = { ...workingParams };
   
    
    const sortedKeys3 = Object.keys(paramsWithoutWelcome).sort();
    const queryString3 = sortedKeys3
      .map(key => `${key}=${paramsWithoutWelcome[key as keyof typeof paramsWithoutWelcome]}`)
      .join('&');
    const checksumInput3 = `create${queryString3}${bbbApiSecret}`;
    const checksum3 = crypto.createHash('sha1').update(checksumInput3, 'utf8').digest('hex');
    
    tests.push({
      name: 'Without welcome parameter',
      queryString: queryString3,
      checksumInput: checksumInput3,
      checksum: checksum3,
      matches: checksum3 === expectedChecksum
    });
    
    // Test 4: Try with URL-encoded welcome in checksum (maybe API-Mate encodes it)
    const paramsWithEncodedWelcome = {
      ...workingParams,
      welcome: '%3Cbr%3EWelcome+to+%3Cb%3E%25%25CONFNAME%25%25%3C%2Fb%3E%21'
    };
    
    const sortedKeys4 = Object.keys(paramsWithEncodedWelcome).sort();
    const queryString4 = sortedKeys4
      .map(key => `${key}=${paramsWithEncodedWelcome[key as keyof typeof paramsWithEncodedWelcome]}`)
      .join('&');
    const checksumInput4 = `create${queryString4}${bbbApiSecret}`;
    const checksum4 = crypto.createHash('sha1').update(checksumInput4, 'utf8').digest('hex');
    
    tests.push({
      name: 'With URL-encoded welcome',
      queryString: queryString4,
      checksumInput: checksumInput4,
      checksum: checksum4,
      matches: checksum4 === expectedChecksum
    });

    // Test 5: Try with minimal params only
    const minimalParams = {
      'meetingID': 'random-1131767',
      'name': 'random-1131767'
    };
    
    const sortedKeys5 = Object.keys(minimalParams).sort();
    const queryString5 = sortedKeys5
      .map(key => `${key}=${minimalParams[key as keyof typeof minimalParams]}`)
      .join('&');
    const checksumInput5 = `create${queryString5}${bbbApiSecret}`;
    const checksum5 = crypto.createHash('sha1').update(checksumInput5, 'utf8').digest('hex');
    
    // Test this minimal version on the server
    const minimalUrl = `https://class.techpratham.org/bigbluebutton/api/create?${queryString5}&checksum=${checksum5}`;
    
    let minimalResult = 'Not tested';
    try {
      const response = await fetch(minimalUrl);
      const xml = await response.text();
      minimalResult = xml.includes('<returncode>SUCCESS</returncode>') ? 'SUCCESS' : 
                     xml.includes('checksumError') ? 'CHECKSUM_ERROR' : xml.substring(0, 200);
    } catch (error) {
      minimalResult = `Error: ${error}`;
    }
    
    tests.push({
      name: 'Minimal params test',
      queryString: queryString5,
      checksumInput: checksumInput5,
      checksum: checksum5,
      matches: false, // We don't expect this to match the API-Mate checksum
      testResult: minimalResult,
      testUrl: minimalUrl
    });

    // Find which test matched
    const matchingTest = tests.find(test => test.matches);
    
    return res.json({
      success: true,
      apiMateUrl: 'https://class.techpratham.org/bigbluebutton/api/create?allowStartStopRecording=true&attendeePW=ap&autoStartRecording=false&meetingID=random-1131767&moderatorPW=mp&name=random-1131767&record=false&voiceBridge=73751&welcome=%3Cbr%3EWelcome+to+%3Cb%3E%25%25CONFNAME%25%25%3C%2Fb%3E%21&checksum=9e8e9e13a620b4417d8ce77aba01601aab570322',
      expectedChecksum: expectedChecksum,
      workingParameters: workingParams,
      tests: tests,
      analysis: {
        foundMatch: !!matchingTest,
        matchingApproach: matchingTest?.name || 'None',
        correctFormat: matchingTest?.queryString || 'Unknown'
      },
      recommendation: matchingTest ? 
        `Use "${matchingTest.name}" approach for checksum calculation` :
        'Need to investigate API-Mate source code or try different encoding approaches'
    });
    
  } catch (error: any) {
    console.error('Reverse engineering error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}