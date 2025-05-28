'use client';

import { useState } from 'react';

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

interface MemoryCardProps {
  memory: Memory;
  showSimilarity?: boolean;
}

export function MemoryCard({ memory, showSimilarity = false }: MemoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get emotion color
  const getEmotionColor = () => {
    const { joy, sadness, neutral, intensity } = memory.emotions;
    
    if (intensity < 0.3) return 'border-gray-200 bg-gray-50/30';
    if (joy > sadness && joy > 0.3) return 'border-green-200 bg-green-50/30';
    if (sadness > 0.3) return 'border-blue-200 bg-blue-50/30';
    return 'border-gray-200 bg-gray-50/30';
  };

  // Get importance indicator
  const getImportanceSize = () => {
    if (memory.importance > 0.8) return 'w-3 h-3';
    if (memory.importance > 0.6) return 'w-2.5 h-2.5';
    if (memory.importance > 0.4) return 'w-2 h-2';
    return 'w-1.5 h-1.5';
  };

  const shouldTruncate = memory.content.length > 150;
  const displayContent = isExpanded || !shouldTruncate 
    ? memory.content 
    : memory.content.substring(0, 150) + '...';

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer ${getEmotionColor()}`}
      onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {/* Importance indicator */}
          <div
            className={`rounded-full bg-gray-400 opacity-60 ${getImportanceSize()}`}
            title={`Importance: ${Math.round(memory.importance * 100)}%`}
          />
          
          {/* Similarity score (for search results) */}
          {showSimilarity && memory.similarity_score && (
            <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              {Math.round(memory.similarity_score * 100)}% match
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          {formatDate(memory.created_at)}
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-gray-800 leading-relaxed">
          {displayContent}
        </p>
        
        {shouldTruncate && (
          <button
            className="text-blue-600 hover:text-blue-800 text-sm mt-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Entities */}
      {memory.entities.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {memory.entities.slice(0, 4).map((entity, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-white/60 text-gray-600 rounded-full border border-gray-200"
              >
                {entity}
              </span>
            ))}
            {memory.entities.length > 4 && (
              <span className="text-xs px-2 py-1 text-gray-500">
                +{memory.entities.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="flex flex-wrap gap-1">
        {memory.categories.map((category, index) => (
          <span
            key={index}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
          >
            {category}
          </span>
        ))}
      </div>

      {/* Emotion indicator (subtle) */}
      {memory.emotions.intensity > 0.3 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {memory.emotions.joy > memory.emotions.sadness ? '😊' : 
               memory.emotions.sadness > 0.3 ? '😔' : '😐'} 
              {memory.emotions.intensity > 0.7 ? ' Strong feeling' : ' Emotional'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}