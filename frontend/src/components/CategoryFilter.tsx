'use client';

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

const categoryEmojis: Record<string, string> = {
  work: '💼',
  family: '👨‍👩‍👧‍👦',
  friends: '👥',
  hobbies: '🎨',
  health: '🏥',
  travel: '✈️',
  food: '🍽️',
  relationships: '💕',
  learning: '📚',
  personal: '🧠',
  all: '🌟'
};

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  const allCategories = ['all', ...categories];

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {allCategories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
            flex items-center space-x-2
            ${selected === category
              ? 'bg-blue-600 text-white shadow-md transform scale-105'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
            }
          `}
        >
          <span>{categoryEmojis[category] || '📂'}</span>
          <span className="capitalize">
            {category === 'all' ? 'All Memories' : category}
          </span>
        </button>
      ))}
    </div>
  );
}