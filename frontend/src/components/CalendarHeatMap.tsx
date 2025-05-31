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
}

interface CalendarHeatMapProps {
  memories: Memory[];
  onDayClick: (date: Date, memories: Memory[]) => void;
}

export function CalendarHeatMap({ memories, onDayClick }: CalendarHeatMapProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get the first day of the month and days in month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get memories for a specific date
  const getMemoriesForDate = (date: Date): Memory[] => {
    const dateString = date.toDateString();
    return memories.filter(memory => {
      const memoryDate = new Date(memory.created_at);
      return memoryDate.toDateString() === dateString;
    });
  };

  // Get heat map intensity for a date (placeholder - will implement later)
  const getHeatMapIntensity = (memoriesCount: number): string => {
    // For now, just return basic styling
    if (memoriesCount === 0) return 'bg-gray-50 hover:bg-gray-100';
    if (memoriesCount === 1) return 'bg-purple-100 hover:bg-purple-200';
    if (memoriesCount <= 3) return 'bg-purple-200 hover:bg-purple-300';
    if (memoriesCount <= 5) return 'bg-purple-300 hover:bg-purple-400';
    return 'bg-purple-400 hover:bg-purple-500';
  };

  // Handle day click (updated for mobile)
  const handleDayClick = (day: number | Date) => {
    let clickedDate: Date;
    
    if (day instanceof Date) {
      clickedDate = day;
    } else {
      clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    }
    
    const dayMemories = getMemoriesForDate(clickedDate);
    onDayClick(clickedDate, dayMemories);
  };

  // Generate calendar days for mobile (2 weeks) or desktop (full month)
  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();
    const todayString = today.toDateString();

    if (isMobile) {
      // Mobile: Show 2 weeks centered around today or current date
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week

      // Show 2 weeks (14 days)
      for (let i = 0; i < 14; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateString = date.toDateString();
        const dayMemories = getMemoriesForDate(date);
        const isToday = dateString === todayString;
        const heatMapClass = getHeatMapIntensity(dayMemories.length);

        days.push(
          <button
            key={i}
            onClick={() => handleDayClick(date.getDate())}
            className={`
              h-16 border border-gray-100 transition-all duration-200 relative
              flex flex-col items-center justify-center text-sm font-medium
              ${heatMapClass}
              ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}
              hover:scale-105 hover:shadow-sm hover:z-10
            `}
          >
            <span className="text-xs text-gray-500 mb-1">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className={`${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
              {date.getDate()}
            </span>
            
            {/* Memory count indicator */}
            {dayMemories.length > 0 && (
              <span className="absolute top-1 right-1 text-xs bg-white rounded-full w-4 h-4 flex items-center justify-center text-purple-600 font-bold">
                {dayMemories.length > 9 ? '9+' : dayMemories.length}
              </span>
            )}
          </button>
        );
      }
    } else {
      // Desktop: Full month view (existing logic)
      // Empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(
          <div key={`empty-${i}`} className="h-12 border border-gray-100"></div>
        );
      }

      // Days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = date.toDateString();
        const dayMemories = getMemoriesForDate(date);
        const isToday = dateString === todayString;
        const heatMapClass = getHeatMapIntensity(dayMemories.length);

        days.push(
          <button
            key={day}
            onClick={() => handleDayClick(day)}
            className={`
              h-12 border border-gray-100 transition-all duration-200 relative
              flex items-center justify-center text-sm font-medium
              ${heatMapClass}
              ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}
              hover:scale-105 hover:shadow-sm hover:z-10
            `}
          >
            <span className={`${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
              {day}
            </span>
            
            {/* Memory count indicator */}
            {dayMemories.length > 0 && (
              <span className="absolute top-1 right-1 text-xs bg-white rounded-full w-4 h-4 flex items-center justify-center text-purple-600 font-bold">
                {dayMemories.length > 9 ? '9+' : dayMemories.length}
              </span>
            )}
          </button>
        );
      }
    }

    return days;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <h2 className="text-lg sm:text-2xl font-light text-gray-900">
            {isMobile 
              ? `${monthNames[currentDate.getMonth()].slice(0, 3)} ${currentDate.getFullYear()}`
              : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            }
          </h2>
          <button
            onClick={goToToday}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Today
          </button>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={previousMonth}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={nextMonth}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day Headers - Only show on desktop */}
      {!isMobile && (
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((dayName) => (
            <div
              key={dayName}
              className="h-8 flex items-center justify-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {dayName}
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <div className={`grid gap-0 border-l border-t border-gray-100 ${
        isMobile ? 'grid-cols-7' : 'grid-cols-7'
      }`}>
        {renderCalendarDays()}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 sm:mt-6 pt-4 border-t border-gray-100">
        <div className="text-xs sm:text-sm text-gray-500">
          {isMobile ? 'Tap any day' : 'Click on any day to view memories'}
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span className="hidden sm:inline">Less</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-100 rounded-sm"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-100 rounded-sm"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-200 rounded-sm"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-300 rounded-sm"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-400 rounded-sm"></div>
          </div>
          <span className="hidden sm:inline">More</span>
        </div>
      </div>
    </div>
  );
}