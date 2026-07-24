import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DebugSessionTokens = () => {
  const [classId, setClassId] = useState('');
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugData = async () => {
    if (!classId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/debug-session-tokens?classId=${classId}`);
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error('Debug fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearSessionTokens = async () => {
    if (!classId) return;
    
    try {
      const response = await fetch('/api/bbb/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classId,
          trainerAction: 'end_session'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Session tokens cleared successfully!');
        fetchDebugData(); // Refresh
      } else {
        alert('Failed to clear session tokens: ' + data.error);
      }
    } catch (error) {
      console.error('Clear session error:', error);
      alert('Error clearing session tokens');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug Session Tokens</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Class ID Lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter Class ID"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={fetchDebugData} disabled={loading}>
              {loading ? 'Loading...' : 'Get Debug Info'}
            </Button>
            <Button onClick={clearSessionTokens} variant="destructive">
              Clear Session Tokens
            </Button>
          </div>
        </CardContent>
      </Card>

      {debugData && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DebugSessionTokens;