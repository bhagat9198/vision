'use client';

import { useState } from 'react';
import { Search, Sparkles, Loader2, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchSuggestion } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PromptSearchProps {
  suggestions: SearchSuggestion[];
  onSearch: (prompt: string) => void;
  isSearching?: boolean;
}

const categoryColors = {
  scene: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  people: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  activity: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  emotion: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
};

export function PromptSearch({ suggestions, onSearch, isSearching }: PromptSearchProps) {
  const [prompt, setPrompt] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSearch = () => {
    if (prompt.trim()) {
      onSearch(prompt.trim());
      // Add to recent searches
      setRecentSearches((prev) => {
        const updated = [prompt.trim(), ...prev.filter((s) => s !== prompt.trim())];
        return updated.slice(0, 5);
      });
    }
  };

  const handleSuggestionClick = (text: string) => {
    setPrompt(text);
    onSearch(text);
    setRecentSearches((prev) => {
      const updated = [text, ...prev.filter((s) => s !== text)];
      return updated.slice(0, 5);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && prompt.trim()) {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you're looking for..."
              className="w-full pl-12 pr-10 py-4 rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            />
            {prompt && (
              <button
                onClick={() => setPrompt('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button size="lg" onClick={handleSearch} disabled={!prompt.trim() || isSearching} className="px-8">
            {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Try natural language like &quot;bride walking with parents&quot; or &quot;yellow saree near lake&quot;
        </p>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(search)}
                disabled={isSearching}
              >
                {search}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Try these examples</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(suggestion.text)}
              disabled={isSearching}
              className={cn('border-0', categoryColors[suggestion.category])}
            >
              {suggestion.text}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

