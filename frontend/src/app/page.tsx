'use client';

import { useState, useEffect } from 'react';
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

const API_BASE = 'http://localhost:8000';

export default function Home() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchMode, setSearchMode] = useState(false);

  // Fetch recent memories on load
  useEffect(() => {
    fetchRecentMemories();
  }, []);

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

  const fetchRecentMemories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/memories/recent?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setMemories(data);
        setSearchMode(false);
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
    setLoading(false);
  };

  const addMemory = async (content: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          user_id: 'default'
        }),
      });

      if (response.ok) {
        // Refresh memories list
        await fetchRecentMemories();
      }
    } catch (error) {
      console.error('Error adding memory:', error);
    }
    setLoading(false);
  };

  const searchMemories = async (query: string) => {
    if (!query.trim()) {
      fetchRecentMemories();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/memories/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          user_id: 'default',
          limit: 20
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMemories(data);
        setSearchMode(true);
      }
    } catch (error) {
      console.error('Error searching memories:', error);
    }
    setLoading(false);
  };

  // Get unique categories from memories
  const categories = Array.from(
    new Set(memories.flatMap(memory => memory.categories))
  ).sort();

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