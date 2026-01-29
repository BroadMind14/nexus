import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  isExpanded?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading, isExpanded }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setQuery('');
    }
  };

  return (
    <div className={`fixed bottom-4 left-3 right-3 z-[100] pointer-events-none transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${isExpanded ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
      <form 
        onSubmit={handleSubmit}
        className={`max-w-xl mx-auto relative glass rounded-3xl h-14 flex items-center pr-1.5 pl-6 transition-all duration-500 spring-transition pointer-events-auto border border-black/[0.04] shadow-2xl ${isFocused ? 'search-focused' : ''}`}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search for companies or founders..."
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-slate-900 placeholder-slate-300 font-bold px-1"
          disabled={isLoading}
        />
        <button 
          type="submit"
          disabled={!query.trim() || isLoading}
          className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-500 bouncy-tap ${query.trim() ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-200'}`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.8" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="transform translate-x-[1px] -translate-y-[1px]"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </div>
          )}
        </button>
      </form>
    </div>
  );
};

export default SearchBar;