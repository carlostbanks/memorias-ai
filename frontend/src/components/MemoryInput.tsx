'use client';

import { useState } from 'react';

interface MemoryInputProps {
  onSubmit: (content: string) => void;
  loading: boolean;
}

export function MemoryInput({ onSubmit, loading }: MemoryInputProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !loading) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me something to remember..."
            className="w-full px-6 py-4 text-lg border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50/50 hover:bg-gray-50/80 transition-colors"
            rows={3}
            disabled={loading}
          />
          
          {/* Character count */}
          <div className="absolute bottom-3 left-6 text-xs text-gray-400">
            {content.length} characters
          </div>
          
          {/* Submit button */}
          <button
            type="submit"
            disabled={!content.trim() || loading}
            className="absolute bottom-3 right-3 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Remember'
            )}
          </button>
        </div>
      </form>
      
      {/* Hint text */}
      <p className="mt-3 text-sm text-gray-500 text-center">
        Share a thought, experience, or anything you'd like to remember. 
        <span className="hidden sm:inline"> Press Enter to save, Shift+Enter for new line.</span>
      </p>
    </div>
  );
}