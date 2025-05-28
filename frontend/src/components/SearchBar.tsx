'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Search icon */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your memories..."
            className="w-full pl-12 pr-20 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 hover:bg-gray-50/80 transition-colors"
            disabled={loading}
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-16 flex items-center pr-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Search button */}
          <button
            type="submit"
            disabled={loading}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : (
              <span className="text-sm font-medium">Search</span>
            )}
          </button>
        </div>
      </form>

      {/* Search suggestions */}
      <div className="mt-2 text-center">
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => {
              setQuery('work meetings');
              onSearch('work meetings');
            }}
            className="hover:text-blue-600 transition-colors"
          >
            work meetings
          </button>
          <span>•</span>
          <button
            onClick={() => {
              setQuery('family moments');
              onSearch('family moments');
            }}
            className="hover:text-blue-600 transition-colors"
          >
            family moments
          </button>
          <span>•</span>
          <button
            onClick={() => {
              setQuery('important decisions');
              onSearch('important decisions');
            }}
            className="hover:text-blue-600 transition-colors"
          >
            important decisions
          </button>
        </div>
      </div>
    </div>
  );
}