'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      // Wait for NextAuth to finish loading
      if (status === 'loading') {
        return;
      }

      // If not authenticated, go to signin
      if (!session) {
        router.replace('/auth/signin');
        return;
      }

      // Check if we have the backend access token
      const sessionAccessToken = (session as any)?.accessToken;
      
      if (!sessionAccessToken) {
        console.log('No backend access token found');
        router.replace('/auth/signin');
        return;
      }

      try {
        // Check onboarding status using the NextAuth session token
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/status`, {
          headers: {
            'Authorization': `Bearer ${sessionAccessToken}`
          }
        });

        if (response.status === 401) {
          console.log('Backend token expired, redirecting to signin');
          router.replace('/auth/signin');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          console.log('Onboarding status:', data);
          if (data.completed) {
            router.replace('/dashboard');
          } else {
            router.replace('/onboarding');
          }
        } else {
          // API error but token seems valid, go to onboarding
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Error checking status:', error);
        setError('Connection error. Please try again.');
        // Network error, but if we have a token, try onboarding
        router.replace('/onboarding');
      } finally {
        setChecking(false);
      }
    };

    handleRedirect();
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}