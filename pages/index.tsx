import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const userSession = localStorage.getItem('userSession');
    
    if (userSession) {
      try {
        const session = JSON.parse(userSession);
        // Redirect to appropriate dashboard based on role
        switch (session.role) {
          case 'student':
            router.push('/student/dashboard');
            break;
          case 'trainer':
            router.push('/trainer/dashboard');
            break;
          case 'admin':
            router.push('/lms');
            break;
          default:
            // Invalid role, go to login
            router.push('/login');
        }
      } catch (error) {
        // Invalid session data, go to login
        router.push('/login');
      }
    } else {
      // No session, go to login
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}
