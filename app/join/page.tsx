import { Suspense } from 'react';
import JoinPageClient from './JoinPageClient';

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading join page...</div>}>
      <JoinPageClient />
    </Suspense>
  );
}
