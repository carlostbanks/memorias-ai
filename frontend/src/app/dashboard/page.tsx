// FILE: frontend/src/app/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MemoryInput } from '@/components/MemoryInput';
import { NavbarSearch } from '@/components/NavbarSearch';
import { CalendarHeatMap } from '@/components/CalendarHeatMap';
import { DayModal } from '@/components/DayModal';

interface Memory {
  id: string;
  content: string;
  entities: string[];
  categories: string[];
  emotions: {
    joy: number;
    sadness: number;
    neutral: number;
    intensity: number;
    polarity: number;
  };
  importance: number;
  created_at: string;
  similarity_score?: number;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayMemories, setSelectedDayMemories] = useState<Memory[]>([]);
  const [preSelectedMemory, setPreSelectedMemory] = useState<Memory | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check authentication
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    // Fetch memories once authenticated
    fetchRecentMemories();
  }, [session, status, router]);

  const getAuthHeaders = () => {
    const sessionAccessToken = (session as any)?.accessToken;
    if (!sessionAccessToken) {
      throw new Error('No access token');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionAccessToken}`
    };
  };

  const fetchRecentMemories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/memories/recent?limit=50`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setMemories(data);
      } else if (response.status === 401) {
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
    setLoading(false);
  };

  const addMemory = async (content: string, photos?: File[]) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      
      // Add photos to form data
      if (photos && photos.length > 0) {
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: formData,
      });

      if (response.ok) {
        // Refresh memories list
        await fetchRecentMemories();
      } else if (response.status === 401) {
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Error adding memory:', error);
    }
    setLoading(false);
  };

  const searchMemories = async (query: string): Promise<Memory[]> => {
    if (!query.trim()) return [];

    setSearchLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/memories/search`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          query,
          limit: 10
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.filter((memory: Memory) => 
          !memory.similarity_score || memory.similarity_score >= 0.1
        );
      } else if (response.status === 401) {
        router.push('/auth/signin');
      }
      return [];
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  const handleMemoryClick = (memory: Memory) => {
    // Get the date of this memory
    const memoryDate = new Date(memory.created_at);
    
    // Get all memories for that day
    const dayMemories = memories.filter(m => {
      const mDate = new Date(m.created_at);
      return mDate.toDateString() === memoryDate.toDateString();
    });
    
    // Open the modal with this day and pre-select the memory
    setSelectedDate(memoryDate);
    setSelectedDayMemories(dayMemories);
    setModalOpen(true);
    
    // Set the specific memory as selected
    setPreSelectedMemory(memory);
  };

  const handleDayClick = (date: Date, memories: Memory[]) => {
    setSelectedDate(date);
    setSelectedDayMemories(memories);
    setPreSelectedMemory(null); // Clear any pre-selection
    setModalOpen(true);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
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
    <div className="min-h-screen bg-white">
      {/* Header with Search */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-light text-gray-900">
              Memory Palace
            </h1>
            
            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <NavbarSearch
                onSearch={searchMemories}
                onResultClick={handleMemoryClick}
                loading={searchLoading}
              />
            </div>
            
            {/* Desktop User Info */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-500">
              <span>{memories.length} memories</span>
              <span>{session?.user?.name}</span>
              <button
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                Sign Out
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-4">
            <NavbarSearch
              onSearch={searchMemories}
              onResultClick={handleMemoryClick}
              loading={searchLoading}
            />
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 py-4 border-t border-gray-100">
              <div className="flex flex-col space-y-3">
                <div className="text-sm text-gray-500">
                  {memories.length} memories
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-left text-red-600 hover:text-red-800 transition-colors text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Input Section */}
        <div className="mb-12">
          <MemoryInput onSubmit={addMemory} loading={loading} />
        </div>

        {/* Calendar Heat Map */}
        <div className="mb-8">
          <CalendarHeatMap
            memories={memories}
            onDayClick={handleDayClick}
          />
        </div>
      </main>

      {/* Day Modal */}
      <DayModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPreSelectedMemory(null);
        }}
        date={selectedDate}
        memories={selectedDayMemories}
        preSelectedMemory={preSelectedMemory}
      />
    </div>
  );
}