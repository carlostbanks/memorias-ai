'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Pillar {
  name: string;
  avatar_url?: string;
}

const steps = [
  {
    id: 'people',
    title: 'Who is important to you?',
    subtitle: 'Tell us about the people who matter most in your life',
    placeholder: 'my mom Sarah',
    examples: ['my partner Alex', 'my best friend Mike', 'my dog Max']
  },
  {
    id: 'interests',
    title: 'What is important to you?',
    subtitle: 'Share your hobbies, interests, and passions',
    placeholder: 'photography',
    examples: ['cooking', 'playing guitar', 'hiking']
  },
  {
    id: 'life_events',
    title: "What's happening in your life?",
    subtitle: 'Current events, goals, or changes in your life',
    placeholder: 'started a new job',
    examples: ['learning Spanish', 'training for a marathon', 'planning a wedding']
  }
];

export default function Onboarding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [pillars, setPillars] = useState<Record<string, Pillar[]>>({
    people: [],
    interests: [],
    life_events: []
  });
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle authentication and onboarding check
  useEffect(() => {
    const checkAuth = async () => {
      if (status === 'loading') return;

      if (!session) {
        router.replace('/auth/signin');
        return;
      }

      const sessionAccessToken = (session as any)?.accessToken;
      
      if (!sessionAccessToken) {
        router.replace('/auth/signin');
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/status`, {
          headers: { 'Authorization': `Bearer ${sessionAccessToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.completed) {
            // User already has pillars, redirect to dashboard
            router.replace('/dashboard');
            return;
          }
        } else if (response.status === 401) {
          await signOut({ redirect: false });
          router.replace('/auth/signin');
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setError('Connection error. Please try again.');
      }

      setPageReady(true);
    };

    checkAuth();
  }, [session, status, router]);

  const currentStepData = steps[currentStep];

  const addPillar = () => {
    if (currentInput.trim()) {
      const stepId = currentStepData.id;
      setPillars(prev => ({
        ...prev,
        [stepId]: [...prev[stepId], { name: currentInput.trim() }]
      }));
      setCurrentInput('');
    }
  };

  const removePillar = (stepId: string, index: number) => {
    setPillars(prev => ({
      ...prev,
      [stepId]: prev[stepId].filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const sessionAccessToken = (session as any)?.accessToken;
    if (!sessionAccessToken) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/pillars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionAccessToken}`
        },
        body: JSON.stringify(pillars)
      });

      if (response.ok) {
        router.replace('/dashboard');
      } else if (response.status === 401) {
        setError('Your session has expired. Please sign in again.');
        await signOut({ redirect: false });
        router.replace('/auth/signin');
      } else {
        setError('Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Error saving pillars:', error);
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addPillar();
    }
  };

  const canContinue = pillars[currentStepData.id].length > 0 || currentStep === steps.length - 1;

  // Show loading while checking auth/onboarding status
  if (!pageReady) {
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

  return (
    <div className="min-h-screen bg-white">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-20 pb-8">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-light text-gray-900 mb-4">
              {currentStepData.title}
            </h1>
            <p className="text-gray-600 text-lg">
              {currentStepData.subtitle}
            </p>
          </div>

          {/* Input section */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentStepData.placeholder}
                className="w-full px-6 py-4 text-lg border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50"
              />
              <button
                onClick={addPillar}
                disabled={!currentInput.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Add
              </button>
            </div>

            {/* Examples */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 mb-2">Examples:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {currentStepData.examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentInput(example)}
                    className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Added pillars */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3">
              {pillars[currentStepData.id].map((pillar, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-full"
                >
                  <span>{pillar.name}</span>
                  <button
                    onClick={() => removePillar(currentStepData.id, index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6 py-3 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!canContinue || loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : currentStep === steps.length - 1 ? (
                'Get Started'
              ) : (
                'Continue'
              )}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}