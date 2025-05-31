// REPLACE: frontend/src/app/auth/signin/page.tsx

'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const scrollingMemories1 = [
  "I just got engaged! 💍",
  "Moving to Tokyo in 2 weeks - so excited!",
  "Had the best coffee date with mom today",
  "Finally finished my first marathon 🏃‍♀️",
  "Started learning guitar, fingers hurt but loving it",
  "Adopted a rescue dog named Charlie",
  "Got promoted to senior developer!",
  "Cooked dinner for friends - pasta was perfect",
  "Watched the sunrise from the mountains",
  "Finished reading 'Atomic Habits' - life changing"
];

const scrollingMemories2 = [
  "First day at my dream job - nervous but ready",
  "Surprise birthday party was incredible",
  "Learning Spanish, 'hola' sounds better each day",
  "Date night at that new Italian place ❤️",
  "Grandma shared her secret recipe with me",
  "Completed my first coding bootcamp",
  "Road trip across the coast was magical",
  "Planted my first garden this spring",
  "Lost 20 pounds and feeling amazing",
  "Bought my first apartment keys! 🏠"
];

export default function SignIn() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session && (session as any)?.accessToken) {
      window.location.href = '/';
    }
  }, [status, session]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signIn('google', {
        redirect: true,
        callbackUrl: '/'
      });
      
      if (result && !result.ok) {
        throw new Error(result.error || 'Google sign-in failed');
      }
      
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-6">
              Memory Palace
            </h1>
            <h2 className="text-2xl md:text-3xl font-light text-purple-600 mb-8">
              Keeping Your Story Human
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform your daily thoughts and experiences into beautiful, AI-crafted chapters of your life. 
              Every memory matters, every moment becomes part of your personal story.
            </p>
            
            {error && (
              <div className="mb-6 max-w-md mx-auto p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="inline-flex items-center px-8 py-4 bg-purple-600 text-white text-lg font-medium rounded-2xl hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              ) : (
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Start Your Story
            </button>
            
            <p className="mt-6 text-sm text-gray-500">
              Free to start • No credit card required
            </p>
          </div>
        </div>
      </div>

      {/* Scrolling Memories Section */}
      <div className="py-16 bg-gray-50 overflow-hidden">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-light text-gray-900 mb-4">
            Capture Life's Moments
          </h3>
          <p className="text-gray-600">
            See what others are remembering and sharing
          </p>
        </div>
        
        {/* First Row - Left to Right */}
        <div className="mb-8">
          <div className="flex animate-scroll-left space-x-6">
            {[...scrollingMemories1, ...scrollingMemories1].map((memory, index) => (
              <div
                key={index}
                className="flex-shrink-0 bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 min-w-max"
              >
                <p className="text-gray-700 font-medium">{memory}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Second Row - Right to Left */}
        <div>
          <div className="flex animate-scroll-right space-x-6">
            {[...scrollingMemories2, ...scrollingMemories2].map((memory, index) => (
              <div
                key={index}
                className="flex-shrink-0 bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 min-w-max"
              >
                <p className="text-gray-700 font-medium">{memory}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-light text-gray-900 mb-4">
              Your Life, Beautifully Told
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              More than just journaling - we craft your memories into meaningful stories
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-xl font-medium text-gray-900 mb-4">AI-Crafted Chapters</h4>
              <p className="text-gray-600 leading-relaxed">
                Transform your scattered memories into beautifully written life chapters, 
                told in your choice of style from Disney magic to scientific precision.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-medium text-gray-900 mb-4">Rich Memory Capture</h4>
              <p className="text-gray-600 leading-relaxed">
                Capture text, photos, and moments with intelligent categorization. 
                Our AI understands the people, places, and events that matter to you.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-medium text-gray-900 mb-4">Personal Growth</h4>
              <p className="text-gray-600 leading-relaxed">
                Visualize your journey with heat maps, track meaningful patterns, 
                and discover insights about your personal growth over time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-light text-white mb-6">
            Ready to Begin Your Story?
          </h3>
          <p className="text-xl text-purple-100 mb-8 leading-relaxed">
            Join thousands who are already crafting their life stories. 
            Start capturing today, create beautiful chapters tomorrow.
          </p>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="inline-flex items-center px-8 py-4 bg-white text-purple-600 text-lg font-medium rounded-2xl hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
            ) : (
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Get Started Free
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h4 className="text-2xl font-light text-white mb-2">Memory Palace</h4>
            <p className="text-gray-400 mb-6">Keeping Your Story Human</p>
            <p className="text-sm text-gray-500">
              Made with ❤️ in Miami
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
        
        .animate-scroll-right {
          animation: scroll-right 30s linear infinite;
        }
      `}</style>
    </div>
  );
}