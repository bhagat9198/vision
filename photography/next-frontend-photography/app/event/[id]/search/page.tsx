'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, User, Palette, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FaceSearch, ColorClothingSearch, PromptSearch, SearchResults } from '@/components/ai-search';
import { useQueryTabs } from '@/lib/hooks/use-query-tabs';
import {
  getEventById,
  getDetectedFacesByEventId,
  mockColorOptions,
  mockOutfitTypes,
  mockSearchSuggestions,
  searchPhotosByFace,
  searchPhotosByColor,
  searchPhotosByPrompt,
} from '@/lib/mock-data';
import { getTemplateStyles } from '@/lib/template-styles';
import { cn } from '@/lib/utils';
import { Photo, SearchMode } from '@/lib/types';

export default function AISearchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const event = getEventById(eventId);
  const detectedFaces = getDetectedFacesByEventId(eventId);

  const [activeTab, setActiveTab] = useQueryTabs('face', 'tab') as [SearchMode, (v: string) => void];
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Photo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('face');

  // Handle person query param from photo detail page
  useEffect(() => {
    const personParam = searchParams.get('person');
    if (personParam) {
      setActiveTab('face');
      const face = detectedFaces.find((f) => f.name === personParam);
      if (face) {
        handleFaceSearch(face.id);
      }
    }
  }, [searchParams, detectedFaces]);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const styles = getTemplateStyles(event.template);

  const simulateSearch = async () => {
    setIsSearching(true);
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSearching(false);
  };

  const handleFaceSearch = async (faceId: string) => {
    const face = detectedFaces.find((f) => f.id === faceId);
    setSearchQuery(face?.name || 'Face');
    setSearchMode('face');
    await simulateSearch();
    setSearchResults(searchPhotosByFace(faceId));
  };

  const handleSelfieUpload = async (file: File) => {
    setSearchQuery('Your selfie');
    setSearchMode('face');
    await simulateSearch();
    // Mock: return random results for selfie upload
    setSearchResults(searchPhotosByPrompt('bride'));
  };

  const handleColorClothingSearch = async (colorId: string | null, outfitId: string | null) => {
    const color = colorId ? mockColorOptions.find((c) => c.id === colorId) : null;
    const outfit = outfitId ? mockOutfitTypes.find((o) => o.id === outfitId) : null;
    const queryParts = [color?.name, outfit?.name].filter(Boolean);
    setSearchQuery(queryParts.join(' + '));
    setSearchMode('color');
    await simulateSearch();
    setSearchResults(searchPhotosByColor(colorId || ''));
  };

  const handlePromptSearch = async (prompt: string) => {
    setSearchQuery(prompt);
    setSearchMode('prompt');
    await simulateSearch();
    setSearchResults(searchPhotosByPrompt(prompt));
  };

  const clearResults = () => {
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className={cn('min-h-screen', styles.pageBg)}>
      {/* Header */}
      <header className={cn('sticky top-0 z-40', styles.headerBg)}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/event/${eventId}`)} className={styles.buttonGhost}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className={cn('h-5 w-5', styles.accentColor)} />
              <div>
                <h1 className={cn('font-semibold', styles.textPrimary)}>AI Photo Search</h1>
                <p className={cn('text-sm', styles.textMuted)}>{event.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {searchResults.length > 0 ? (
          <SearchResults
            photos={searchResults}
            query={searchQuery}
            mode={searchMode}
            eventId={eventId}
            onClear={clearResults}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SearchMode)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="face" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Face</span>
              </TabsTrigger>
              <TabsTrigger value="color" className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Color</span>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Prompt</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="face" className="mt-6">
              <FaceSearch
                detectedFaces={detectedFaces}
                onFaceSelect={handleFaceSearch}
                onSelfieUpload={handleSelfieUpload}
                isSearching={isSearching}
              />
            </TabsContent>

            <TabsContent value="color" className="mt-6">
              <ColorClothingSearch
                colors={mockColorOptions}
                outfits={mockOutfitTypes}
                onSearch={handleColorClothingSearch}
                isSearching={isSearching}
              />
            </TabsContent>

            <TabsContent value="prompt" className="mt-6">
              <PromptSearch
                suggestions={mockSearchSuggestions}
                onSearch={handlePromptSearch}
                isSearching={isSearching}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

