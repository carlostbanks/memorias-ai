'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MemoryInput } from '@/components/MemoryInput';
import { MemoryCard } from '@/components/MemoryCard';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';

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
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchMode, setSearchMode] = useState(false);
  const [directAnswer, setDirectAnswer] = useState<string>('');

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

  // Filter memories when category changes
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredMemories(memories);
    } else {
      setFilteredMemories(
        memories.filter(memory => 
          memory.categories.includes(selectedCategory)
        )
      );
    }
  }, [memories, selectedCategory]);

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
        setSearchMode(false);
        setDirectAnswer('');
      } else if (response.status === 401) {
        // Unauthorized, redirect to login
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
    setLoading(false);
  };

  const addMemory = async (content: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/memories`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content
        }),
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

  const searchMemories = async (query: string) => {
    if (!query.trim()) {
      fetchRecentMemories();
      setDirectAnswer('');
      return;
    }

    setLoading(true);
    setDirectAnswer('');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/memories/search`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          query,
          limit: 20
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Remove duplicates by ID and filter out low similarity
        const uniqueResults = data.filter((memory: Memory, index: number, self: Memory[]) => 
          index === self.findIndex((m: Memory) => m.id === memory.id)
        );
        
        const filteredData = uniqueResults.filter((memory: Memory) => 
          !memory.similarity_score || memory.similarity_score >= 0.1
        );
        
        setMemories(filteredData);
        setSearchMode(true);

        // Try to extract direct answer for question-like queries
        if (query.toLowerCase().includes('when is') && filteredData.length > 0) {
          const bestMatch = filteredData[0];
          if (bestMatch.similarity_score && bestMatch.similarity_score > 0.8) {
            const dateMatch = bestMatch.content.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(th|st|nd|rd)?\b/i);
            if (dateMatch) {
              setDirectAnswer(`${dateMatch[0]}`);
            }
          }
        }
      } else if (response.status === 401) {
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Error searching memories:', error);
    }
    setLoading(false);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  // Get unique categories from memories
  const categories = Array.from(
    new Set(memories.flatMap(memory => memory.categories))
  ).sort();

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
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-light text-gray-900">
              Memory Palace
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{memories.length} memories</span>
              {searchMode && (
                <button
                  onClick={fetchRecentMemories}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Show All
                </button>
              )}
              <div className="flex items-center space-x-2">
                <img 
                  src={session?.user?.image || ''} 
                  alt="Profile" 
                  className="w-6 h-6 rounded-full"
                />
                <span>{session?.user?.name}</span>
                <button
                  onClick={handleSignOut}
                  className="text-red-600 hover:text-red-800 transition-colors ml-2"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Input Section */}
        <div className="mb-12">
          <MemoryInput onSubmit={addMemory} loading={loading} />
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <SearchBar onSearch={searchMemories} loading={loading} />
        </div>

        {/* Direct Answer */}
        {directAnswer && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">Direct Answer</span>
              </div>
              <p className="text-lg text-blue-900 font-medium">{directAnswer}</p>
            </div>
          </div>
        )}

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-8">
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        )}

        {/* Memories Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMemories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                showSimilarity={searchMode}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredMemories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">
              {memories.length === 0 
                ? "No memories yet. Add your first memory above!"
                : "No memories match your current filter."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}