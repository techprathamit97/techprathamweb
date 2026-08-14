import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Loader2 } from 'lucide-react';

const StudentClasses = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new batch management system
    console.log('Redirecting to student batch management system...');
    router.replace('/student/batch-management');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Redirecting to improved learning hub...</p>
      </div>
    </div>
  );
};

export default StudentClasses;