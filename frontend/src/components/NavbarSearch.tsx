// FILE: frontend/src/components/NavbarSearch.tsx

'use client';

import { useState, useRef, useEffect } from 'react';

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

interface NavbarSearchProps {
  onSearch: (query: string) => Promise<Memory[]>;
  onResultClick: (memory: Memory) => void;
  loading: boolean;
}

export function NavbarSearch({ onSearch, onResultClick, loading }: NavbarSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Memory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const searchResults = await onSearch(query);
      setResults(searchResults);
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // Clear results when input is cleared
    if (newValue === '') {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleResultClick = (memory: Memory) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    onResultClick(memory);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Search icon */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search memories..."
            className="w-full pl-10 pr-16 py-2 text-sm text-gray-900 placeholder-gray-500 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 hover:bg-gray-50/80 transition-colors"
            disabled={loading}
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-12 flex items-center pr-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Search button */}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
            ) : (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.map((memory) => (
            <button
              key={memory.id}
              onClick={() => handleResultClick(memory)}
              className="w-full px-3 sm:px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm text-gray-900 line-clamp-2 break-words">
                    {truncateText(memory.content, 60)}
                  </p>
                  
                  {/* Categories */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {memory.categories.slice(0, 2).map((category, index) => (
                      <span
                        key={index}
                        className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                      >
                        {category}
                      </span>
                    ))}
                    {memory.categories.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{memory.categories.length - 2}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end flex-shrink-0">
                  {/* Similarity score */}
                  {memory.similarity_score && (
                    <div className={`text-xs px-1.5 py-0.5 rounded mb-1 ${
                      memory.similarity_score >= 0.8 ? 'bg-green-100 text-green-700' :
                      memory.similarity_score >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {Math.round(memory.similarity_score * 100)}%
                    </div>
                  )}
                  
                  {/* Date and arrow */}
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="hidden sm:inline">{formatDate(memory.created_at)}</span>
                    <span className="sm:hidden">{formatDate(memory.created_at).split(' ').slice(0, 2).join(' ')}</span>
                    <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 px-4 py-3">
          <p className="text-sm text-gray-500 text-center">
            No memories found for "{query}"
          </p>
        </div>
      )}
    </div>
  );
}