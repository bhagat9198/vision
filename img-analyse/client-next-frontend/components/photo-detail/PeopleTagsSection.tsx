'use client';

import Image from 'next/image';
import { Users, ChevronRight } from 'lucide-react';
import { PersonTag } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface PeopleTagsSectionProps {
  personTags: PersonTag[];
  onPersonClick?: (person: PersonTag) => void;
}

export function PeopleTagsSection({ personTags, onPersonClick }: PeopleTagsSectionProps) {
  if (personTags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">People in this photo</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {personTags.map((person) => (
          <Button
            key={person.id}
            variant="outline"
            className="h-auto py-2 px-3 gap-3"
            onClick={() => onPersonClick?.(person)}
          >
            <div className="relative h-8 w-8 rounded-full overflow-hidden">
              <Image
                src={person.thumbnail}
                alt={person.name}
                fill
                className="object-cover"
                sizes="32px"
              />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{person.name}</p>
              <p className="text-xs text-muted-foreground">{person.photoCount} photos</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        ))}
      </div>
    </div>
  );
}

