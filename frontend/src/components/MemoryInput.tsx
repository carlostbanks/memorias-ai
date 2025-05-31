// FILE: frontend/src/components/MemoryInput.tsx

'use client';

import { useState, useRef } from 'react';

interface MemoryInputProps {
  onSubmit: (content: string, photos?: File[]) => void;
  loading: boolean;
}

export function MemoryInput({ onSubmit, loading }: MemoryInputProps) {
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((content.trim() || photos.length > 0) && !loading) {
      onSubmit(content.trim(), photos);
      setContent('');
      setPhotos([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      return file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    setPhotos(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 photos
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="w-full">
        <div 
          className={`relative border-2 border-dashed rounded-2xl transition-colors ${
            dragActive 
              ? 'border-blue-400 bg-blue-50/50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me something to remember..."
              className="w-full px-4 sm:px-6 py-4 text-base sm:text-lg text-gray-900 placeholder-gray-500 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50/50 hover:bg-gray-50/80 transition-colors"
              rows={3}
              disabled={loading}
            />
            
            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="px-4 sm:px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Bottom Bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 pb-3">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Photo Upload Button */}
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={loading || photos.length >= 5}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Add Photo</span>
                  <span className="sm:hidden">📷</span>
                </button>
                
                {/* Character count - hide on mobile */}
                <div className="hidden sm:block text-xs text-gray-400">
                  {content.length} characters
                </div>
                
                {photos.length > 0 && (
                  <div className="text-xs text-gray-400">
                    {photos.length} photo{photos.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              {/* Submit button */}
              <button
                type="submit"
                disabled={(!content.trim() && photos.length === 0) || loading}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Saving...</span>
                  </div>
                ) : (
                  <span>Remember</span>
                )}
              </button>
            </div>
          </div>
          
          {/* Drag overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-blue-50/80 border-2 border-blue-400 border-dashed rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-blue-600 font-medium text-sm sm:text-base">Drop photos here</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </form>
      
      {/* Hint text - simplified for mobile */}
      <p className="mt-3 text-xs sm:text-sm text-gray-500 text-center">
        <span className="sm:hidden">Share a thought or photo to remember</span>
        <span className="hidden sm:inline">Share a thought, experience, or photo you'd like to remember. Press Enter to save, Shift+Enter for new line.</span>
        <br className="hidden sm:block" />
        <span className="text-xs text-gray-400 hidden sm:inline">
          You can drag & drop photos or click "Add Photo". Max 5 photos, 10MB each.
        </span>
      </p>
    </div>
  );
}