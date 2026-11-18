'use client';

import { useState } from 'react';
import { getFcmTokenOrThrow, onForegroundMessage } from '@/lib/firebase';

export default function WhatsAppTest() {
  const [mobile, setMobile] = useState('91');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Push notification test state ---
  const [token, setToken] = useState('');
  const [pushTitle, setPushTitle] = useState('TechPratham Test 🔔');
  const [pushBody, setPushBody] = useState('If you can see this, push notifications work!');
  const [pushResult, setPushResult] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  async function send() {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/whatsapp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile.trim() }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResult('Request failed: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  // Step 1: ask for permission, register the service worker and mint an FCM token.
  async function getToken() {
    setTokenLoading(true);
    setPushResult('');
    try {
      const t = await getFcmTokenOrThrow();
      setToken(t);
      setPushResult('✅ Got FCM token. Now click "Send Push".');

      // Persistent foreground listener: shows a system notification AND logs the
      // payload, so delivery is visible even when this tab is focused (the SW
      // only auto-pops notifications when the tab is backgrounded/closed).
      onForegroundMessage((payload: any) => {
        setPushResult(
          '📬 Foreground message received (notification shown):\n' +
            JSON.stringify(payload, null, 2)
        );
      });
    } catch (err: any) {
      setPushResult(
        '❌ Could not get an FCM token.\n\n' +
          (err?.message || String(err)) +
          '\n\n(Full error is also in the browser console.)'
      );
      // eslint-disable-next-line no-console
      console.error('FCM token error:', err);
    } finally {
      setTokenLoading(false);
    }
  }

  // Step 2: send a push to the minted token via the Admin SDK route.
  async function sendPush() {
    if (!token) {
      setPushResult('Get a token first (Step 1).');
      return;
    }
    setPushLoading(true);
    setPushResult('');
    try {
      const res = await fetch('/api/push-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, title: pushTitle, body: pushBody }),
      });
      const data = await res.json();
      setPushResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setPushResult('Request failed: ' + (err?.message || String(err)));
    } finally {
      setPushLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 8,
    fontSize: 15,
    boxSizing: 'border-box',
  };

  const preStyle: React.CSSProperties = {
    marginTop: 16,
    padding: 16,
    background: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <main
      style={{
        maxWidth: 560,
        margin: '40px auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* ---------- WhatsApp test ---------- */}
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>MSG91 WhatsApp Test</h1>
      <p style={{ color: '#666', fontSize: 14, marginTop: 0 }}>
        Enter the recipient number as <b>91</b> + 10 digits (e.g. 919876543210).
        Send only to numbers that have consented.
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="919876543210"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            padding: '10px 16px',
            background: loading ? '#9ca3af' : '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            cursor: loading ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Sending…' : 'Send Test'}
        </button>
      </div>

      {result && <pre style={preStyle}>{result}</pre>}

      {/* ---------- Push notification test ---------- */}
      <hr style={{ margin: '36px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Push Notification Test</h1>
      <p style={{ color: '#666', fontSize: 14, marginTop: 0 }}>
        <b>Step 1:</b> grant permission &amp; get an FCM token. <b>Step 2:</b> send a
        push to it via the Firebase Admin SDK. Keep this tab open or switch away to
        see the system notification.
      </p>

      <button
        onClick={getToken}
        disabled={tokenLoading}
        style={{
          marginTop: 8,
          padding: '10px 16px',
          background: tokenLoading ? '#9ca3af' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          cursor: tokenLoading ? 'default' : 'pointer',
        }}
      >
        {tokenLoading ? 'Requesting…' : '1 · Enable & Get Token'}
      </button>

      {token && (
        <pre style={{ ...preStyle, background: '#1e293b', fontSize: 11 }}>
          {token}
        </pre>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          value={pushTitle}
          onChange={(e) => setPushTitle(e.target.value)}
          placeholder="Notification title"
          style={inputStyle}
        />
        <textarea
          value={pushBody}
          onChange={(e) => setPushBody(e.target.value)}
          placeholder="Notification body"
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <button
          onClick={sendPush}
          disabled={pushLoading || !token}
          style={{
            padding: '10px 16px',
            background: pushLoading || !token ? '#9ca3af' : '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            cursor: pushLoading || !token ? 'default' : 'pointer',
          }}
        >
          {pushLoading ? 'Sending…' : '2 · Send Push'}
        </button>
      </div>

      {pushResult && <pre style={preStyle}>{pushResult}</pre>}
    </main>
  );
}
