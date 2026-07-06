import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestBBB() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  // Get config on load
  useEffect(() => {
    fetch('/api/debug/test-bbb')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => setConfig({ error: err.message }));
  }, []);

  const testCreateMeeting = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/debug/test-bbb?action=create');
      const data = await res.json();
      setResult(data);
      console.log('Create meeting result:', data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">BigBlueButton Test Page</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Meeting Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testCreateMeeting}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Creating...' : 'Create Test Meeting'}
          </Button>

          {result && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>

              {/* Show join URLs if available */}
              {result.moderatorJoinUrl && (
                <div className="mt-4 space-y-2">
                  <p className="font-semibold">Join URLs:</p>
                  <a
                    href={result.moderatorJoinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 underline"
                  >
                    Join as Moderator (new tab)
                  </a>
                  <a
                    href={result.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 underline"
                  >
                    Join as Attendee (new tab)
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          {config ? (
            <pre className="text-sm overflow-auto">
              {JSON.stringify(config, null, 2)}
            </pre>
          ) : (
            <p>Loading configuration...</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Check browser console for detailed API logs
          </p>
        </CardContent>
      </Card>
    </div>
  );
}