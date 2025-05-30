// FILE: frontend/src/components/DayModal.tsx

'use client';

import { useState, useEffect } from 'react';

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
  photos?: Array<{
    url: string;
    public_id: string;
    metadata?: any;
  }>;
}

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  memories: Memory[];
  preSelectedMemory?: Memory | null;
}

export function DayModal({ isOpen, onClose, date, memories, preSelectedMemory }: DayModalProps) {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Auto-select pre-selected memory when modal opens
  useEffect(() => {
    if (preSelectedMemory) {
      setSelectedMemory(preSelectedMemory);
    } else if (memories.length === 1) {
      setSelectedMemory(memories[0]);
    } else {
      setSelectedMemory(null);
    }
  }, [preSelectedMemory, memories]);

  if (!isOpen || !date) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEmotionColor = (emotions: Memory['emotions']) => {
    const { joy, sadness, neutral, intensity } = emotions;
    
    if (intensity < 0.3) return 'border-gray-200 bg-gray-50/50';
    if (joy > sadness && joy > 0.3) return 'border-green-200 bg-green-50/50';
    if (sadness > 0.3) return 'border-blue-200 bg-blue-50/50';
    return 'border-gray-200 bg-gray-50/50';
  };

  const handleMemoryClick = (memory: Memory) => {
    setSelectedMemory(selectedMemory?.id === memory.id ? null : memory);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
      setSelectedMemory(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-2xl shadow-2xl max-h-[80vh] transition-all duration-300 ${
        selectedMemory ? 'w-full max-w-4xl' : 'w-full max-w-2xl'
      }`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-light text-gray-900">
              {formatDate(date)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
            </p>
          </div>
          
          <button
            onClick={() => {
              onClose();
              setSelectedMemory(null);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex">
          {/* Memories List */}
          <div className={`${selectedMemory ? 'w-1/2 border-r border-gray-100' : 'w-full'} transition-all duration-300`}>
            {memories.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No memories for this day</p>
              </div>
            ) : (
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {memories.map((memory) => (
                    <button
                      key={memory.id}
                      onClick={() => handleMemoryClick(memory)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                        selectedMemory?.id === memory.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50/50' 
                          : getEmotionColor(memory.emotions)
                      }`}
                    >
                      {/* Memory Preview */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {memory.importance > 0.7 && (
                            <div className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                              Important
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {formatTime(memory.created_at)}
                          </div>
                        </div>
                        
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      
                      <p className="text-gray-800 text-sm line-clamp-3 mb-2">
                        {memory.content.length > 100 
                          ? memory.content.substring(0, 100) + '...' 
                          : memory.content
                        }
                      </p>
                      
                      {/* Photo indicator */}
                      {memory.photos && memory.photos.length > 0 && (
                        <div className="flex items-center text-xs text-gray-500 mb-2">
                          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{memory.photos.length} photo{memory.photos.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      
                      {/* Quick categories */}
                      <div className="flex flex-wrap gap-1">
                        {memory.categories.slice(0, 3).map((category, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {category}
                          </span>
                        ))}
                        {memory.categories.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{memory.categories.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expanded Memory Details */}
          {selectedMemory && (
            <div className="w-1/2 p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Memory Details</h3>
                  <div className="text-sm text-gray-500">
                    {formatTime(selectedMemory.created_at)}
                  </div>
                </div>
                
                {/* Full Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {selectedMemory.content}
                  </p>
                </div>
                
                {/* Photos */}
                {selectedMemory.photos && selectedMemory.photos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Photos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedMemory.photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo.url}
                            alt={`Memory photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => window.open(photo.url, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                            <svg className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Entities */}
                {selectedMemory.entities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Mentioned</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMemory.entities.map((entity, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-full"
                        >
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Categories */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemory.categories.map((category, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Emotional Analysis */}
                {selectedMemory.emotions.intensity > 0.3 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Emotional Tone</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {selectedMemory.emotions.joy > selectedMemory.emotions.sadness ? '😊 Positive' : 
                           selectedMemory.emotions.sadness > 0.3 ? '😔 Reflective' : '😐 Neutral'}
                        </span>
                        <span className="text-gray-500">
                          {selectedMemory.emotions.intensity > 0.7 ? 'Strong feeling' : 'Moderate feeling'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Importance */}
                {selectedMemory.importance > 0.7 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Importance</h4>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center text-sm text-purple-700">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        High importance memory
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}